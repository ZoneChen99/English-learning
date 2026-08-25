"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getAllProgress, updateProgress } from "@/lib/db";
import { fetchBook, fetchBookMetas } from "@/lib/books";
import { applyReview, type Grade } from "@/lib/sr";
import { speak, warmupVoices } from "@/lib/audio";
import { formatPos } from "@/lib/pos";
import { useSeason } from "@/components/SeasonTheme";
import { SEASON_NAMES } from "@/lib/season";
import type { Word, WordBook, WordProgress } from "@/lib/types";

/**
 * 两种复习方式：
 *  - "word"     单词单独复习：题型「看词选译」（见词选中文释义）与「拼写」（看释义拼出单词）
 *  - "sentence" 句子中复习词汇：在例句里遮罩目标词，凭语境回忆（让背过的词融入句子）
 */
type Method = "word" | "sentence";
type Exercise = "choice" | "spell";
type Status = "loading" | "empty" | "ready" | "done";

interface Card {
  word: Word;
  bookId: string;
  /** 看词选译的 4 个中文释义（含正确项，已打乱） */
  options?: string[];
}

const METHOD_LABEL: Record<Method, string> = { word: "🔤 单词复习", sentence: "📖 句子复习" };
const EXERCISE_LABEL: Record<Exercise, string> = { choice: "看词选译", spell: "拼写" };

/** 复习方式：URL ?method= 优先，兼容旧 ?mode=，其次 localStorage，默认单词复习 */
function readInitialMethod(): Method {
  if (typeof window === "undefined") return "word";
  const p = new URLSearchParams(window.location.search).get("method");
  if (p === "word" || p === "sentence") return p;
  const m = new URLSearchParams(window.location.search).get("mode");
  if (m === "sentence") return "sentence";
  if (m === "word") return "word";
  const saved = localStorage.getItem("review-method");
  if (saved === "word" || saved === "sentence") return saved as Method;
  return "word";
}

function readInitialExercise(): Exercise {
  if (typeof window === "undefined") return "choice";
  const saved = localStorage.getItem("review-exercise");
  return saved === "spell" ? "spell" : "choice";
}

// 把例句中的目标词替换为遮罩占位，点击/揭晓后显示真词
function maskSentence(en: string, word: string, revealed: boolean) {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const m = re.exec(en);
  if (!m) return <>{en}</>;
  const start = m.index;
  const end = start + m[0].length;
  const before = en.slice(0, start);
  const match = en.slice(start, end);
  const after = en.slice(end);
  return (
    <>
      {before}
      {revealed ? (
        <mark className="bg-accent/20 text-ink rounded px-0.5">{match}</mark>
      ) : (
        <span className="inline-block min-w-[3.5rem] border-b-2 border-accent/60 text-center text-accent/70 select-none">
          ＿＿＿＿
        </span>
      )}
      {after}
    </>
  );
}

// 为「看词选译」生成选项：1 正确释义 + 至多 3 个来自已学词池的干扰释义（去重、打乱）
function buildOptions(correct: string, all: Word[]): string[] {
  const distractors = Array.from(
    new Set(all.map((x) => x.translation).filter((t) => t && t !== correct))
  );
  const picked = distractors.sort(() => Math.random() - 0.5).slice(0, 3);
  return [correct, ...picked].sort(() => Math.random() - 0.5);
}

export default function ReviewSession({
  bookId,
  onBack,
  backHref = "/",
  backLabel = "返回首页",
}: {
  bookId?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  const { season } = useSeason();
  const [status, setStatus] = useState<Status>("loading");
  const [method, setMethod] = useState<Method>("word");
  const [exercise, setExercise] = useState<Exercise>("choice");
  const [queue, setQueue] = useState<Card[]>([]);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [choicePicked, setChoicePicked] = useState<number | null>(null);
  const [spellInput, setSpellInput] = useState("");
  const [stats, setStats] = useState({ correct: 0, wrong: 0, recalled: 0, fuzzy: 0, forgot: 0 });
  const [bookName, setBookName] = useState<string>("");
  const [round, setRound] = useState(0); // 用于「再来一轮」重触发

  const bookCache = useRef<Map<string, WordBook>>(new Map());

  async function loadBook(id: string) {
    if (bookCache.current.has(id)) return bookCache.current.get(id)!;
    const b = await fetchBook(id);
    bookCache.current.set(id, b);
    return b;
  }

  // 首屏解析初始方式/题型
  useEffect(() => {
    setMethod(readInitialMethod());
    setExercise(readInitialExercise());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 方式/题型/轮次变化（或首屏）时重建队列
  useEffect(() => {
    warmupVoices();
    let alive = true;
    (async () => {
      try {
        if (bookId) {
          const metas = await fetchBookMetas();
          const meta = metas.find((m) => m.id === bookId);
          if (alive) setBookName(meta?.name ?? bookId);
        } else if (alive) {
          setBookName("");
        }

        const all = await getAllProgress();
        let learned = all.filter((p) => p.status !== "new");
        if (bookId) learned = learned.filter((p) => p.bookId === bookId);
        if (learned.length === 0) {
          if (alive) setStatus("empty");
          return;
        }
        const now = Date.now();
        // 优先排到期单词；若无到期，则复习全部已学单词
        const due = learned.filter((p) => p.dueDate <= now);
        const pool: WordProgress[] = due.length ? due : learned;

        // 组装 Word 列表
        const words: { word: Word; bookId: string }[] = [];
        for (const p of pool) {
          const book = await loadBook(p.bookId);
          const w = book.words.find((x) => x.word.toLowerCase() === p.word);
          if (w) words.push({ word: w, bookId: p.bookId });
        }
        if (!alive) return;

        let cards: Card[] = [];
        if (method === "sentence") {
          // 句子复习：只保留有例句的词
          cards = words
            .filter((x) => x.word.examples && x.word.examples.length)
            .map((x) => ({ word: x.word, bookId: x.bookId }));
        } else if (exercise === "choice") {
          // 看词选译：为每词生成 4 个释义选项
          cards = words.map((x) => ({
            word: x.word,
            bookId: x.bookId,
            options: buildOptions(x.word.translation, words.map((y) => y.word)),
          }));
        } else {
          // 拼写：无需选项
          cards = words.map((x) => ({ word: x.word, bookId: x.bookId }));
        }

        if (!alive) return;
        if (cards.length === 0) {
          setStatus("empty");
          return;
        }
        setQueue(cards);
        setPos(0);
        setRevealed(false);
        setLastCorrect(null);
        setChoicePicked(null);
        setSpellInput("");
        setStats({ correct: 0, wrong: 0, recalled: 0, fuzzy: 0, forgot: 0 });
        setStatus("ready");
      } catch (e) {
        console.error(e);
        if (alive) setStatus("empty");
      }
    })();
    return () => {
      alive = false;
    };
  }, [method, exercise, bookId, round]);

  const current = queue[pos];

  /** 切换复习方式：更新状态 + 持久化 + 同步 URL */
  function changeMethod(m: Method) {
    setMethod(m);
    // 立即复位作答态，避免切换瞬间显示上一题的结果
    setRevealed(false);
    setLastCorrect(null);
    setChoicePicked(null);
    setSpellInput("");
    if (typeof window !== "undefined") {
      localStorage.setItem("review-method", m);
      const url = new URL(window.location.href);
      url.searchParams.set("method", m);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function changeExercise(e: Exercise) {
    setExercise(e);
    setRevealed(false);
    setLastCorrect(null);
    setChoicePicked(null);
    setSpellInput("");
    if (typeof window !== "undefined") localStorage.setItem("review-exercise", e);
  }

  // SM-2 评级并写回进度（异步）
  function gradeAndUpdate(grade: Grade) {
    if (!current) return;
    getAllProgress().then((all) => {
      const p = all.find((x) => x.word === current.word.word.toLowerCase() && x.bookId === current.bookId);
      const base: WordProgress =
        p ?? {
          word: current.word.word.toLowerCase(),
          bookId: current.bookId,
          status: "review",
          ease: 2.5,
          interval: 1,
          repetitions: 1,
          dueDate: Date.now(),
          lastReviewed: null,
          correctCount: 0,
          wrongCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      const result = applyReview(base, grade);
      const next: WordProgress = {
        ...base,
        ...result,
        word: current.word.word.toLowerCase(),
        bookId: current.bookId,
        lastReviewed: Date.now(),
        updatedAt: Date.now(),
      };
      updateProgress(next.word, next);
    });
  }

  // 单词复习：答对/答错（good / again）
  function answerWord(correct: boolean) {
    if (!current || revealed) return;
    setLastCorrect(correct);
    gradeAndUpdate(correct ? "good" : "again");
    setStats((s) => ({
      ...s,
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));
    setRevealed(true);
  }

  function pickChoice(i: number) {
    if (!current || revealed) return;
    setChoicePicked(i);
    const correct = current.options![i] === current.word.translation;
    answerWord(correct);
  }

  function submitSpell() {
    if (!current || revealed) return;
    const input = spellInput.trim().toLowerCase();
    if (!input) return;
    answerWord(input === current.word.word.toLowerCase());
  }

  // 句子复习：揭晓后评级（三档）
  function onRate(grade: Grade) {
    if (!current) return;
    gradeAndUpdate(grade);
    setStats((s) => ({
      ...s,
      recalled: s.recalled + (grade === "easy" ? 1 : 0),
      fuzzy: s.fuzzy + (grade === "good" ? 1 : 0),
      forgot: s.forgot + (grade === "again" ? 1 : 0),
    }));
    setRevealed(false);
    setPos((p) => p + 1);
  }

  function nextCard() {
    setRevealed(false);
    setLastCorrect(null);
    setChoicePicked(null);
    setSpellInput("");
    setPos((p) => p + 1);
  }

  const backEl = onBack ? (
    <button onClick={onBack} className="text-sm text-muted hover:text-ink">
      ← {backLabel}
    </button>
  ) : (
    <Link href={backHref} className="text-sm text-muted hover:text-ink">
      ← {backLabel}
    </Link>
  );

  if (status === "loading") {
    return (
      <main className="min-h-screen grid place-items-center bg-bg text-muted">加载中…</main>
    );
  }

  if (status === "empty") {
    return (
      <main className="min-h-screen w-full bg-bg">
        <section className="max-w-xl mx-auto px-6 py-20 text-center">
          <div className="text-5xl">🍃</div>
          <h1 className="mt-4 text-2xl font-semibold text-ink">还没有可复习的单词</h1>
          <p className="mt-3 text-muted">
            {bookId
              ? `《${bookName}》里还没有学过的单词，先去「学习新词」攒一些吧。`
              : "先去「学单词」攒一些词，再来这里做复习。"}
          </p>
          {onBack ? (
            <button
              onClick={onBack}
              className="mt-8 inline-block px-5 py-2.5 rounded-full bg-accent text-white text-sm hover:opacity-90"
            >
              去学习新词
            </button>
          ) : (
            <Link
              href={bookId ? `/learn/${bookId}` : "/learn"}
              className="mt-8 inline-block px-5 py-2.5 rounded-full bg-accent text-white text-sm hover:opacity-90"
            >
              {bookId ? "去学习新词" : "去学单词"}
            </Link>
          )}
        </section>
      </main>
    );
  }

  if (status === "done" || !current) {
    const summary =
      method === "word"
        ? `答对 ${stats.correct} · 答错 ${stats.wrong}`
        : `记得 ${stats.recalled} · 模糊 ${stats.fuzzy} · 忘了 ${stats.forgot}`;
    return (
      <main className="min-h-screen w-full bg-bg">
        <section className="max-w-xl mx-auto px-6 py-16 text-center">
          <div className="text-5xl">🌿</div>
          <h1 className="mt-4 text-2xl font-semibold text-ink">这一轮复习完成</h1>
          <p className="mt-3 text-muted">{summary}</p>
          <div className="mt-8 flex gap-3 justify-center">
            <button
              onClick={() => setRound((r) => r + 1)}
              className="px-5 py-2.5 rounded-full bg-accent text-white text-sm hover:opacity-90"
            >
              再来一轮
            </button>
            {onBack ? (
              <button
                onClick={onBack}
                className="px-5 py-2.5 rounded-full bg-surface border border-black/5 text-sm text-ink hover:shadow"
              >
                返回
              </button>
            ) : (
              <Link
                href={backHref}
                className="px-5 py-2.5 rounded-full bg-surface border border-black/5 text-sm text-ink hover:shadow"
              >
                {backLabel}
              </Link>
            )}
          </div>
        </section>
      </main>
    );
  }

  const curPos = current.word.pos ? formatPos(current.word.pos) : null;
  const example = current.word.examples?.[0];

  return (
    <main className="min-h-screen w-full bg-bg">
      <header className="flex items-center justify-between px-6 sm:px-10 py-4">
        {backEl}
        <span className="text-sm text-muted">
          {bookId ? `复习《${bookName}》` : `${SEASON_NAMES[season]} · 复习`}{" "}
          {Math.min(pos + 1, queue.length)}/{queue.length}
        </span>
      </header>

      <section className="max-w-2xl mx-auto px-6 py-6">
        {/* 复习方式切换 */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-muted mr-1">复习方式</span>
          {(["word", "sentence"] as Method[]).map((m) => (
            <button
              key={m}
              onClick={() => changeMethod(m)}
              aria-pressed={method === m}
              className={
                "px-3 py-1.5 rounded-full text-xs transition " +
                (method === m
                  ? "bg-accent text-white"
                  : "bg-surface border border-black/5 text-ink hover:shadow")
              }
            >
              {METHOD_LABEL[m]}
            </button>
          ))}
        </div>

        {/* 单词复习的题型切换 */}
        {method === "word" && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-muted mr-1">题型</span>
            {(["choice", "spell"] as Exercise[]).map((e) => (
              <button
                key={e}
                onClick={() => changeExercise(e)}
                aria-pressed={exercise === e}
                className={
                  "px-3 py-1.5 rounded-full text-xs transition " +
                  (exercise === e
                    ? "bg-accent text-white"
                    : "bg-surface border border-black/5 text-ink hover:shadow")
                }
              >
                {EXERCISE_LABEL[e]}
              </button>
            ))}
          </div>
        )}

        {method === "sentence" ? (
          /* ===== 句子复习：单词融入例句 ===== */
          <>
            <p className="text-sm text-muted">在句子里把单词「捡」回来——先想，再揭晓。</p>
            <div className="mt-4 bg-surface rounded-3xl p-8 border border-black/5 shadow-sm min-h-[260px] flex flex-col">
              <div className="flex items-baseline gap-3 flex-wrap">
                {revealed && (
                  <>
                    <h2 className="text-3xl font-semibold text-ink">{current.word.word}</h2>
                    {current.word.phonetic && (
                      <span className="text-muted text-lg">/{current.word.phonetic}/</span>
                    )}
                    {curPos && (
                      <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">
                        {curPos}
                      </span>
                    )}
                    <button
                      onClick={() => speak(current.word.word)}
                      aria-label="朗读"
                      className="ml-auto w-10 h-10 rounded-full bg-accent/10 text-accent text-lg hover:bg-accent/20"
                    >
                      🔊
                    </button>
                  </>
                )}
              </div>

              <p className="mt-5 text-ink/90 leading-relaxed text-lg">
                {maskSentence(example!.en, current.word.word, revealed)}
              </p>
              {revealed && example?.zh && (
                <p className="mt-2 text-muted text-sm">{example.zh}</p>
              )}
              {revealed && current.word.translation && (
                <div className="mt-4 pt-4 border-t border-black/5 text-ink">
                  {current.word.translation}
                </div>
              )}
            </div>

            {!revealed ? (
              <button
                onClick={() => {
                  setRevealed(true);
                  speak(current.word.word);
                }}
                className="mt-6 w-full py-3 rounded-2xl bg-accent text-white text-sm hover:opacity-90"
              >
                揭晓单词
              </button>
            ) : (
              <div className="mt-6 grid grid-cols-3 gap-3">
                <button
                  onClick={() => onRate("again")}
                  className="py-3 rounded-2xl bg-surface border border-black/5 text-ink text-sm hover:shadow"
                >
                  没想起
                </button>
                <button
                  onClick={() => onRate("good")}
                  className="py-3 rounded-2xl bg-accent/10 text-accent text-sm hover:bg-accent/20"
                >
                  有点印象
                </button>
                <button
                  onClick={() => onRate("easy")}
                  className="py-3 rounded-2xl bg-accent text-white text-sm hover:opacity-90"
                >
                  想起来了
                </button>
              </div>
            )}
            <p className="mt-3 text-center text-xs text-muted">
              {revealed ? "记录你的回忆程度，马上进入下一个" : "凭句子语境回忆这个单词"}
            </p>
          </>
        ) : exercise === "choice" ? (
          /* ===== 单词复习 · 看词选译 ===== */
          <>
            <p className="text-sm text-muted">看单词，选出正确的中文释义。</p>
            <div className="mt-4 bg-surface rounded-3xl p-8 border border-black/5 shadow-sm min-h-[220px] flex flex-col">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-3xl font-semibold text-ink">{current.word.word}</h2>
                {current.word.phonetic && (
                  <span className="text-muted text-lg">/{current.word.phonetic}/</span>
                )}
                <button
                  onClick={() => speak(current.word.word)}
                  aria-label="朗读"
                  className="ml-auto w-10 h-10 rounded-full bg-accent/10 text-accent text-lg hover:bg-accent/20"
                >
                  🔊
                </button>
              </div>
              {curPos && <div className="mt-2 text-sm text-accent">{curPos}</div>}
              <p className="mt-4 text-sm text-muted">选择正确的中文释义：</p>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {current.options!.map((opt, i) => {
                const isCorrect = opt === current.word.translation;
                const isPicked = i === choicePicked;
                let cls = "bg-surface border border-black/5 text-ink hover:shadow";
                if (revealed) {
                  if (isCorrect) cls = "bg-accent/15 border-accent/40 text-accent";
                  else if (isPicked) cls = "bg-red-500/10 border-red-400/40 text-red-600";
                  else cls = "bg-surface border border-black/5 text-muted opacity-60";
                }
                return (
                  <button
                    key={i}
                    onClick={() => pickChoice(i)}
                    disabled={revealed}
                    className={"py-3 px-4 rounded-2xl text-sm text-left transition " + cls}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {!revealed ? (
              <p className="mt-3 text-center text-xs text-muted">点选你认为是正确的释义</p>
            ) : (
              <>
                <button
                  onClick={nextCard}
                  className="mt-5 w-full py-3 rounded-2xl bg-accent text-white text-sm hover:opacity-90"
                >
                  下一个 →
                </button>
                {example && (
                  <div className="mt-4 rounded-2xl bg-surface p-4 border border-black/5 text-sm">
                    <p className="text-ink/90">{example.en}</p>
                    {example.zh && <p className="mt-1 text-muted">{example.zh}</p>}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* ===== 单词复习 · 拼写 ===== */
          <>
            <p className="text-sm text-muted">根据释义，拼出这个单词（可点 🔊 听发音提示）。</p>
            <div className="mt-4 bg-surface rounded-3xl p-8 border border-black/5 shadow-sm min-h-[220px] flex flex-col">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => speak(current.word.word)}
                  aria-label="朗读"
                  className="w-10 h-10 rounded-full bg-accent/10 text-accent text-lg hover:bg-accent/20"
                >
                  🔊
                </button>
                {curPos && <span className="text-sm text-accent">{curPos}</span>}
              </div>
              <div className="mt-4 text-ink text-lg">{current.word.translation}</div>
              {current.word.definition && (
                <div className="mt-1 text-muted text-sm">{current.word.definition}</div>
              )}
            </div>

            <div className="mt-5">
              {!revealed ? (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={spellInput}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="输入英文单词"
                    onChange={(e) => setSpellInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitSpell();
                    }}
                    className="flex-1 px-4 py-3 rounded-2xl bg-surface border border-black/5 text-ink outline-none focus:border-accent"
                  />
                  <button
                    onClick={submitSpell}
                    className="px-5 py-3 rounded-2xl bg-accent text-white text-sm hover:opacity-90"
                  >
                    确认
                  </button>
                </div>
              ) : (
                <div
                  className={
                    "rounded-2xl px-4 py-3 text-sm " +
                    (lastCorrect
                      ? "bg-accent/10 text-accent"
                      : "bg-red-500/10 text-red-600")
                  }
                >
                  {lastCorrect ? "✓ 拼写正确！" : `✗ 答错了，正确是「${current.word.word}」`}
                  {current.word.phonetic && (
                    <span className="ml-2 text-muted">/{current.word.phonetic}/</span>
                  )}
                </div>
              )}
            </div>

            {revealed && (
              <>
                <button
                  onClick={nextCard}
                  className="mt-5 w-full py-3 rounded-2xl bg-accent text-white text-sm hover:opacity-90"
                >
                  下一个 →
                </button>
                {example && (
                  <div className="mt-4 rounded-2xl bg-surface p-4 border border-black/5 text-sm">
                    <p className="text-ink/90">{example.en}</p>
                    {example.zh && <p className="mt-1 text-muted">{example.zh}</p>}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
