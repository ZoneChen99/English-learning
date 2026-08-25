"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchBook } from "@/lib/books";
import { ensureWords, updateProgress, getBookProgress } from "@/lib/db";
import { applyReview, newProgress, type Grade } from "@/lib/sr";
import { speak, warmupVoices, getAccent, setAccent, type Accent } from "@/lib/audio";
import ReviewSession from "@/components/ReviewSession";
import type { Word, WordBook, WordProgress } from "@/lib/types";

const MAX_AGAIN = 2; // 单卡本次会话最多重排次数，避免死循环
const DAILY_OPTIONS = [10, 20, 30, 50];
const LAST_BOOK_KEY = "el_last_book";

type Status = "loading" | "choosing" | "planning" | "reviewing" | "ready" | "done";

function highlight(en: string, word: string) {
  const idx = en.toLowerCase().indexOf(word.toLowerCase());
  if (idx < 0) return en;
  return (
    <>
      {en.slice(0, idx)}
      <mark className="bg-accent/20 text-ink rounded px-0.5">{en.slice(idx, idx + word.length)}</mark>
      {en.slice(idx + word.length)}
    </>
  );
}

function dailyKey(bookId: string) {
  return `el_daily_${bookId}`;
}
function readDaily(bookId: string): number {
  if (typeof window === "undefined") return 20;
  const s = window.localStorage.getItem(dailyKey(bookId));
  const n = s ? parseInt(s, 10) : NaN;
  return DAILY_OPTIONS.includes(n) ? n : 20;
}
function writeDaily(bookId: string, n: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(dailyKey(bookId), String(n));
}
function clampDaily(n: number): number {
  if (!Number.isFinite(n)) return 10;
  return Math.min(500, Math.max(1, Math.round(n)));
}

export default function Session({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<WordBook | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [queue, setQueue] = useState<Word[]>([]);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ learned: 0, reviewed: 0, again: 0 });
  const [seen, setSeen] = useState<Word[]>([]); // 本次已学（最新在前，去重）
  const [showHistory, setShowHistory] = useState(false);
  const [accent, setAccentState] = useState<Accent>("us");
  const [dailyNew, setDailyNew] = useState<number>(20);
  const [customVal, setCustomVal] = useState<string>("");

  const [learnedCount, setLearnedCount] = useState(0); // 已学（非 new）词数，用于天数估算

  const progRef = useRef<Map<string, WordProgress>>(new Map());
  const againRef = useRef<Map<string, number>>(new Map());

  // 加载词书与进度（不构建队列，留给计划页触发）；记住上次词书
  useEffect(() => {
    warmupVoices();
    setAccentState(getAccent());
    setDailyNew(readDaily(bookId));
    let alive = true;
    (async () => {
      try {
        const b = await fetchBook(bookId);
        await ensureWords(b.words, b.id);
        const prog = await getBookProgress(b.id);
        if (!alive) return;
        progRef.current = new Map(prog.map((p) => [p.word, p]));
        setLearnedCount(prog.filter((p) => p.status !== "new").length);
        setBook(b);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(LAST_BOOK_KEY, bookId);
        }
        setStatus("choosing");
      } catch (e) {
        console.error(e);
        if (alive) setStatus("done");
      }
    })();
    return () => {
      alive = false;
    };
  }, [bookId]);

  // 切换卡片时自动朗读
  useEffect(() => {
    if (status === "ready" && queue[pos]) {
      setRevealed(false);
      speak(queue[pos].word);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, status]);

  const current = queue[pos];
  const remainingNew = book ? Math.max(0, book.words.length - learnedCount) : 0;
  const daysToFinish = remainingNew > 0 ? Math.max(1, Math.ceil(remainingNew / dailyNew)) : 0;

  function startLearning() {
    if (!book) return;
    const now = Date.now();
    const byKey = new Map(book.words.map((w) => [w.word.toLowerCase(), w]));
    const prog = Array.from(progRef.current.values());
    const dueWords = prog
      .filter((p) => p.dueDate <= now && p.status !== "new")
      .map((p) => byKey.get(p.word))
      .filter((w): w is Word => Boolean(w));
    const newWords = book.words
      .filter((w) => {
        const p = progRef.current.get(w.word.toLowerCase());
        return !p || p.status === "new";
      })
      .slice(0, dailyNew);
    const q = [...dueWords, ...newWords];
    writeDaily(bookId, dailyNew);
    setQueue(q);
    setPos(0);
    setRevealed(false);
    setSeen([]);
    setStats({ learned: 0, reviewed: 0, again: 0 });
    setStatus(q.length ? "ready" : "done");
    // 首卡朗读由 useEffect([pos, status]) 触发，这里不再重复 speak，避免竞态导致回退机械音
  }

  function onAnswer(grade: Grade) {
    if (!current || !book || revealed) return; // 已揭晓不再重复计分
    const key = current.word.toLowerCase();
    const prev = progRef.current.get(key) ?? newProgress(key, book.id);
    const result = applyReview(prev, grade);
    const next: WordProgress = {
      ...prev,
      ...result,
      word: key,
      bookId: book.id,
      lastReviewed: Date.now(),
      updatedAt: Date.now(),
    };
    progRef.current.set(key, next);
    updateProgress(key, next);

    const isNew = prev.status === "new";
    setStats((s) => ({
      learned: s.learned + (isNew && grade !== "again" ? 1 : 0),
      reviewed: s.reviewed + (!isNew && grade !== "again" ? 1 : 0),
      again: s.again + (grade === "again" ? 1 : 0),
    }));

    // 答错且未超上限：本次会话末尾再出现一次
    if (grade === "again") {
      const n = (againRef.current.get(key) ?? 0) + 1;
      againRef.current.set(key, n);
      if (n <= MAX_AGAIN) {
        setQueue((q) => [...q, current]);
      }
    }

    setSeen((s) => (s.some((x) => x.word.toLowerCase() === key) ? s : [current, ...s]));
    setRevealed(true);
    // 不自动跳下一个；停留查看，由用户点「下一个」推进
  }

  function nextCard() {
    setPos((p) => p + 1);
  }

  function changeAccent(a: Accent) {
    setAccent(a);
    setAccentState(a);
    if (current) speak(current.word);
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen grid place-items-center bg-bg text-muted">加载中…</main>
    );
  }

  // ===== 模式选择：学习新词 / 复习已学 =====
  if (status === "choosing") {
    return (
      <main className="min-h-screen w-full bg-bg">
        <header className="flex items-center justify-between px-6 sm:px-10 py-4">
          <Link href="/learn" className="text-sm text-muted hover:text-ink">
            ← 返回词书
          </Link>
          <AccentToggle accent={accent} onChange={changeAccent} compact />
        </header>
        <section className="max-w-xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold text-ink">{book?.name}</h1>
          <p className="mt-2 text-muted text-sm">
            共 {book?.words.length} 词 · 已学 {learnedCount} · 剩 {remainingNew} 个新词
          </p>
          <div className="mt-7 grid gap-4">
            <button
              onClick={() => setStatus("planning")}
              className="text-left bg-surface rounded-3xl p-7 border border-black/5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="text-xl font-semibold text-ink">📘 学习新词</div>
              <p className="mt-2 text-muted text-sm">
                今天新学 {dailyNew} 个，到期单词自动排入复习。
              </p>
            </button>
            <button
              onClick={() => setStatus("reviewing")}
              className="text-left w-full bg-surface rounded-3xl p-7 border border-black/5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="text-xl font-semibold text-ink">🔁 复习已学</div>
              <p className="mt-2 text-muted text-sm">
                只复习《{book?.name}》里已经学过的单词（句子 / 单词 / 混合三种模式）。
              </p>
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ===== 复习已学（内嵌，停留在本词书页面） =====
  if (status === "reviewing") {
    return (
      <ReviewSession
        bookId={bookId}
        onBack={() => setStatus("choosing")}
        backLabel={`《${book?.name}》`}
      />
    );
  }

  // ===== 计划页：选每天背多少 =====
  if (status === "planning") {
    return (
      <main className="min-h-screen w-full bg-bg">
        <header className="flex items-center justify-between px-6 sm:px-10 py-4">
          <button
            onClick={() => setStatus("choosing")}
            className="text-sm text-muted hover:text-ink"
          >
            ← {book?.name}
          </button>
          <span className="text-sm text-muted">{book?.name}</span>
        </header>
        <section className="max-w-xl mx-auto px-6 py-10">
          <div className="bg-surface rounded-3xl p-8 border border-black/5 shadow-sm">
            <h1 className="text-2xl font-semibold text-ink">{book?.name}</h1>
            <p className="mt-2 text-muted text-sm">
              共 {book?.words.length} 词，已学 {learnedCount}，还剩 {remainingNew} 个新词。
            </p>

            <div className="mt-7">
              <p className="text-sm text-muted mb-2">每天新学</p>
              <div className="flex gap-2 flex-wrap">
                {DAILY_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setDailyNew(n);
                      setCustomVal("");
                    }}
                    className={
                      "px-5 py-2 rounded-full text-sm transition " +
                      (dailyNew === n
                        ? "bg-accent text-white"
                        : "bg-bg border border-black/5 text-ink hover:shadow")
                    }
                  >
                    {n} 个
                  </button>
                ))}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">自定义</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    inputMode="numeric"
                    placeholder="填个数"
                    value={customVal}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      setCustomVal(v);
                      if (v) setDailyNew(clampDaily(parseInt(v, 10)));
                    }}
                    className="w-24 px-3 py-2 rounded-full text-sm bg-bg border border-black/5 text-ink outline-none focus:border-accent"
                  />
                  <span className="text-xs text-muted">个</span>
                </div>
              </div>
            </div>

            {/* 天数预估 */}
            <div className="mt-5 rounded-2xl bg-accent/5 px-4 py-3 text-sm text-ink">
              {remainingNew > 0 ? (
                <>
                  📅 按每天 {dailyNew} 个新词，预计约{" "}
                  <span className="font-semibold text-accent">{daysToFinish} 天</span> 背完剩余{" "}
                  {remainingNew} 个新词。
                </>
              ) : (
                <>🎉 这本词书的新词都已学过，去「复习已学」巩固吧。</>
              )}
            </div>

            <div className="mt-6">
              <p className="text-sm text-muted mb-2">朗读口音</p>
              <AccentToggle accent={accent} onChange={changeAccent} />
            </div>

            <button
              onClick={startLearning}
              className="mt-8 w-full py-3 rounded-2xl bg-accent text-white text-sm hover:opacity-90"
            >
              开始学习
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (status === "done" || !current) {
    return (
      <main className="min-h-screen w-full bg-bg">
        <section className="max-w-xl mx-auto px-6 py-16 text-center">
          <div className="text-5xl">🌿</div>
          <h1 className="mt-4 text-2xl font-semibold text-ink">这一组完成啦</h1>
          <p className="mt-3 text-muted">
            新学 {stats.learned} · 复习 {stats.reviewed} · 重学 {stats.again}
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <button
              onClick={startLearning}
              className="px-5 py-2.5 rounded-full bg-accent text-white text-sm hover:opacity-90"
            >
              再来一组
            </button>
            <button
              onClick={() => setStatus("choosing")}
              className="px-5 py-2.5 rounded-full bg-surface border border-black/5 text-sm text-ink hover:shadow"
            >
              返回模式选择
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-bg">
      <header className="flex items-center justify-between px-6 sm:px-10 py-4">
        <button
          onClick={() => setStatus("choosing")}
          className="text-sm text-muted hover:text-ink"
        >
          ← {book?.name}
        </button>
        <div className="flex items-center gap-3">
          <AccentToggle accent={accent} onChange={changeAccent} compact />
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-full bg-surface border border-black/5 text-ink hover:shadow"
          >
            📋 已学 {seen.length}
          </button>
          <span className="text-sm text-muted">
            {Math.min(pos + 1, queue.length)}/{queue.length}
          </span>
        </div>
      </header>

      {showHistory && (
        <section className="max-w-2xl mx-auto px-6 mt-2">
          <div className="bg-surface rounded-2xl p-4 border border-black/5 shadow-sm max-h-72 overflow-auto">
            <p className="text-xs text-muted mb-2">本次已学 {seen.length} 词（点 🔊 朗读，点击收起）</p>
            {seen.length === 0 ? (
              <p className="text-sm text-muted">还没学过单词，先凭感觉判断一张卡试试。</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {seen.map((w, i) => (
                  <li key={i} className="py-2 flex items-baseline gap-2">
                    <span className="font-medium text-ink">{w.word}</span>
                    {w.phonetic && <span className="text-muted text-xs">/{w.phonetic}/</span>}
                    {w.pos && <span className="text-xs text-accent">{w.pos}</span>}
                    <span className="text-sm text-ink/80 flex-1">{w.translation}</span>
                    <button
                      onClick={() => speak(w.word)}
                      aria-label="朗读"
                      className="w-7 h-7 rounded-full bg-accent/10 text-accent text-sm hover:bg-accent/20"
                    >
                      🔊
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="max-w-2xl mx-auto px-6 py-6">
        {/* 每日目标进度条 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted mb-1.5">
            <span>今日目标 · 新学 {stats.learned}/{dailyNew} 个</span>
            <span className="text-accent font-medium">
              {Math.min(100, Math.round((stats.learned / dailyNew) * 100))}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-black/5 overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.round((stats.learned / dailyNew) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-surface rounded-3xl p-8 border border-black/5 shadow-sm min-h-[320px] flex flex-col">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-4xl font-semibold text-ink">{current.word}</h2>
            {current.phonetic && (
              <span className="text-muted text-lg">/{current.phonetic}/</span>
            )}
            <button
              onClick={() => speak(current.word)}
              aria-label="朗读"
              className="ml-auto w-10 h-10 rounded-full bg-accent/10 text-accent text-lg hover:bg-accent/20"
            >
              🔊
            </button>
          </div>

          {current.pos && <div className="mt-1 text-sm text-accent">{current.pos}</div>}

          {current.examples && current.examples[0] && (
            <p className="mt-5 text-ink/90 leading-relaxed">
              {highlight(current.examples[0].en, current.word)}
            </p>
          )}
          {current.examples && current.examples[0]?.zh && (
            <p className="mt-1 text-muted text-sm">{current.examples[0].zh}</p>
          )}

          {revealed && (
            <div className="mt-6 pt-5 border-t border-black/5">
              <div className="text-ink text-lg">{current.translation}</div>
              {current.definition && (
                <div className="mt-1 text-muted text-sm">{current.definition}</div>
              )}
            </div>
          )}
        </div>

        {!revealed ? (
          <>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <button
                onClick={() => onAnswer("again")}
                className="py-3 rounded-2xl bg-surface border border-black/5 text-ink text-sm hover:shadow"
              >
                不认识
              </button>
              <button
                onClick={() => onAnswer("good")}
                className="py-3 rounded-2xl bg-accent/10 text-accent text-sm hover:bg-accent/20"
              >
                模糊
              </button>
              <button
                onClick={() => onAnswer("easy")}
                className="py-3 rounded-2xl bg-accent text-white text-sm hover:opacity-90"
              >
                认识
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-muted">先凭感觉判断，再揭晓释义</p>
          </>
        ) : (
          <>
            <button
              onClick={nextCard}
              className="mt-6 w-full py-3 rounded-2xl bg-accent text-white text-sm hover:opacity-90"
            >
              下一个 →
            </button>
            <p className="mt-3 text-center text-xs text-muted">已记录，可继续查看释义，准备好再进入下一个</p>
          </>
        )}
      </section>
    </main>
  );
}

function AccentToggle({
  accent,
  onChange,
  compact,
}: {
  accent: Accent;
  onChange: (a: Accent) => void;
  compact?: boolean;
}) {
  const base = "px-3 py-1.5 rounded-full text-xs transition ";
  return (
    <div className={"inline-flex gap-1 " + (compact ? "" : "")}>
      <button
        onClick={() => onChange("uk")}
        className={base + (accent === "uk" ? "bg-accent text-white" : "bg-bg border border-black/5 text-muted hover:shadow")}
      >
        英音
      </button>
      <button
        onClick={() => onChange("us")}
        className={base + (accent === "us" ? "bg-accent text-white" : "bg-bg border border-black/5 text-muted hover:shadow")}
      >
        美音
      </button>
    </div>
  );
}
