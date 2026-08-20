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
 * 复习呈现模式（触发方式见底部说明）：
 *  - "sentence" 句子模式：在例句中遮罩目标词，凭语境回忆单词（默认）
 *  - "word"     单词模式：直接给出单词，凭单词本身回忆释义
 *  - "mixed"    混合模式：同一轮里两种呈现方式随机交替（同时支持）
 */
type Mode = "sentence" | "word" | "mixed";
type Status = "loading" | "empty" | "ready" | "done";

interface Card {
  word: Word;
  bookId: string;
  /** 混合模式下逐张决定本张用哪种呈现方式 */
  useSentence: boolean;
}

const MODE_LABEL: Record<Mode, string> = {
  sentence: "句子模式",
  word: "单词模式",
  mixed: "混合模式",
};

/** 优先级：URL 参数 ?mode= > localStorage 记忆 > 默认 sentence */
function readInitialMode(): Mode {
  if (typeof window === "undefined") return "sentence";
  const p = new URLSearchParams(window.location.search).get("mode");
  if (p === "word" || p === "sentence" || p === "mixed") return p;
  const saved = localStorage.getItem("review-mode");
  if (saved === "word" || saved === "sentence" || saved === "mixed") return saved as Mode;
  return "sentence";
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

export default function ReviewHome() {
  const { season } = useSeason();
  const [status, setStatus] = useState<Status>("loading");
  const [queue, setQueue] = useState<Card[]>([]);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ recalled: 0, fuzzy: 0, forgot: 0 });
  const [mode, setMode] = useState<Mode>("sentence");

  // 单本复习：URL ?book= 指定词书时，只复习该书的已学词
  const [bookId, setBookId] = useState<string | null>(null);
  const [bookName, setBookName] = useState<string>("");

  const bookCache = useRef<Map<string, WordBook>>(new Map());

  async function loadBook(id: string) {
    if (bookCache.current.has(id)) return bookCache.current.get(id)!;
    const b = await fetchBook(id);
    bookCache.current.set(id, b);
    return b;
  }

  // 首屏从 URL / localStorage 解析初始模式
  useEffect(() => {
    setMode(readInitialMode());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 模式变化（或首屏）时重建队列
  useEffect(() => {
    warmupVoices();
    let alive = true;
    (async () => {
      try {
        // 单本复习：优先取 URL ?book=，其次取 sessionStorage（CloudStudio 网关会丢弃 query，刷新时靠它保活）
        const urlParam = new URLSearchParams(window.location.search).get("book");
        const stored = typeof window !== "undefined" ? window.sessionStorage.getItem("review_book") : null;
        const param = urlParam || stored || null;
        setBookId(param);
        if (param) {
          const metas = await fetchBookMetas();
          const meta = metas.find((m) => m.id === param);
          if (alive) setBookName(meta?.name ?? param);
        } else if (alive) {
          setBookName("");
        }

        const all = await getAllProgress();
        let learned = all.filter((p) => p.status !== "new");
        if (param) learned = learned.filter((p) => p.bookId === param);
        if (learned.length === 0) {
          if (alive) setStatus("empty");
          return;
        }
        const now = Date.now();
        // 优先排到期单词；若无到期，则复习全部已学单词
        const due = learned.filter((p) => p.dueDate <= now);
        const pool: WordProgress[] = due.length ? due : learned;

        const cards: Card[] = [];
        for (const p of pool) {
          const book = await loadBook(p.bookId);
          const w = book.words.find((x) => x.word.toLowerCase() === p.word);
          const hasExample = !!(w && w.examples && w.examples.length);
          // 句子模式必须依赖例句；单词模式只需单词本身
          if (!w) continue;
          if (!hasExample && mode !== "word") continue;
          const useSentence =
            mode === "mixed" ? Math.random() < 0.5 : mode === "sentence";
          // 混合模式下，无例句者退化为单词模式
          cards.push({ word: w, bookId: p.bookId, useSentence: useSentence && hasExample });
        }
        if (!alive) return;
        if (cards.length === 0) {
          setStatus("empty");
          return;
        }
        setQueue(cards);
        setPos(0);
        setRevealed(false);
        setStatus("ready");
      } catch (e) {
        console.error(e);
        if (alive) setStatus("empty");
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode]);

  const current = queue[pos];

  /** 切换模式：更新状态 + 持久化 + 同步到 URL（便于分享/书签） */
  function changeMode(m: Mode) {
    setMode(m);
    if (typeof window !== "undefined") {
      localStorage.setItem("review-mode", m);
      const url = new URL(window.location.href);
      url.searchParams.set("mode", m);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function onRate(grade: Grade) {
    if (!current) return;
    // 从库读取该词最新进度，避免闭包持有旧值
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
      setStats((s) => ({
        recalled: s.recalled + (grade === "easy" ? 1 : 0),
        fuzzy: s.fuzzy + (grade === "good" ? 1 : 0),
        forgot: s.forgot + (grade === "again" ? 1 : 0),
      }));
      setRevealed(false);
      setPos((p) => p + 1);
    });
  }

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
              : "先去「学单词」攒一些词，再来这里做语境复习。"}
          </p>
          <Link
            href={bookId ? `/learn/${bookId}` : "/learn"}
            className="mt-8 inline-block px-5 py-2.5 rounded-full bg-accent text-white text-sm hover:opacity-90"
          >
            {bookId ? "去学习新词" : "去学单词"}
          </Link>
        </section>
      </main>
    );
  }

  if (status === "done" || !current) {
    return (
      <main className="min-h-screen w-full bg-bg">
        <section className="max-w-xl mx-auto px-6 py-16 text-center">
          <div className="text-5xl">🌿</div>
          <h1 className="mt-4 text-2xl font-semibold text-ink">这一轮复习完成</h1>
          <p className="mt-3 text-muted">
            记得 {stats.recalled} · 模糊 {stats.fuzzy} · 忘了 {stats.forgot}
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <button
              onClick={() => location.reload()}
              className="px-5 py-2.5 rounded-full bg-accent text-white text-sm hover:opacity-90"
            >
              再来一轮
            </button>
            <Link
              href={bookId ? `/learn/${bookId}` : "/"}
              className="px-5 py-2.5 rounded-full bg-surface border border-black/5 text-sm text-ink hover:shadow"
            >
              {bookId ? `返回《${bookName}》` : "返回首页"}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const useSentence = current.useSentence;
  const example = current.word.examples?.[0];
  const curPos = current.word.pos ? formatPos(current.word.pos) : null;

  return (
    <main className="min-h-screen w-full bg-bg">
      <header className="flex items-center justify-between px-6 sm:px-10 py-4">
        <Link
          href={bookId ? `/learn/${bookId}` : "/"}
          className="text-sm text-muted hover:text-ink"
        >
          ← {bookId ? `《${bookName}》` : "返回首页"}
        </Link>
        <span className="text-sm text-muted">
          {bookId ? `复习《${bookName}》` : `${SEASON_NAMES[season]} · 语境复习`}{" "}
          {Math.min(pos + 1, queue.length)}/{queue.length}
        </span>
      </header>

      <section className="max-w-2xl mx-auto px-6 py-6">
        {/* 模式切换：句子 / 单词 / 混合（同时支持两种呈现） */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-muted mr-1">呈现方式</span>
          {(["sentence", "word", "mixed"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => changeMode(m)}
              aria-pressed={mode === m}
              className={
                "px-3 py-1.5 rounded-full text-xs transition " +
                (mode === m
                  ? "bg-accent text-white"
                  : "bg-surface border border-black/5 text-ink hover:shadow")
              }
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        {useSentence ? (
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
        ) : (
          <>
            <p className="text-sm text-muted">看着单词回想它的意思——先想，再揭晓。</p>
            <div className="mt-4 bg-surface rounded-3xl p-8 border border-black/5 shadow-sm min-h-[260px] flex flex-col">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-3xl font-semibold text-ink">{current.word.word}</h2>
                {revealed && current.word.phonetic && (
                  <span className="text-muted text-lg">/{current.word.phonetic}/</span>
                )}
                {revealed && curPos && (
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
              </div>

              {!revealed && (
                <p className="mt-5 text-ink/70 leading-relaxed text-lg">这个单词是什么意思？</p>
              )}
              {revealed && current.word.translation && (
                <div className="mt-5 text-ink text-lg">{current.word.translation}</div>
              )}
              {revealed && example && (
                <div className="mt-4 pt-4 border-t border-black/5">
                  <p className="text-ink/90 text-sm">{example.en}</p>
                  {example.zh && <p className="mt-1 text-muted text-sm">{example.zh}</p>}
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
                揭晓释义
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
              {revealed ? "记录你的回忆程度，马上进入下一个" : "凭单词本身回忆它的释义"}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
