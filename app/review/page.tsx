"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getAllProgress, updateProgress } from "@/lib/db";
import { fetchBook } from "@/lib/books";
import { applyReview, type Grade } from "@/lib/sr";
import { speak, warmupVoices } from "@/lib/audio";
import { useSeason } from "@/components/SeasonTheme";
import { SEASON_NAMES } from "@/lib/season";
import type { Word, WordBook, WordProgress } from "@/lib/types";

type Status = "loading" | "empty" | "ready" | "done";

interface Card {
  word: Word;
  bookId: string;
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

  const bookCache = useRef<Map<string, WordBook>>(new Map());

  async function loadBook(id: string) {
    if (bookCache.current.has(id)) return bookCache.current.get(id)!;
    const b = await fetchBook(id);
    bookCache.current.set(id, b);
    return b;
  }

  useEffect(() => {
    warmupVoices();
    let alive = true;
    (async () => {
      try {
        const all = await getAllProgress();
        const learned = all.filter((p) => p.status !== "new");
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
          // 只保留「有例句可用」的单词，保证复习在语境中进行
          if (w && w.examples && w.examples.length) cards.push({ word: w, bookId: p.bookId });
        }
        if (!alive) return;
        if (cards.length === 0) {
          setStatus("empty");
          return;
        }
        setQueue(cards);
        setStatus("ready");
      } catch (e) {
        console.error(e);
        if (alive) setStatus("empty");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const current = queue[pos];

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
          <p className="mt-3 text-muted">先去「学单词」攒一些词，再来这里做语境复习。</p>
          <Link
            href="/learn"
            className="mt-8 inline-block px-5 py-2.5 rounded-full bg-accent text-white text-sm hover:opacity-90"
          >
            去学单词
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
              href="/"
              className="px-5 py-2.5 rounded-full bg-surface border border-black/5 text-sm text-ink hover:shadow"
            >
              返回首页
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const example = current.word.examples![0];

  return (
    <main className="min-h-screen w-full bg-bg">
      <header className="flex items-center justify-between px-6 sm:px-10 py-4">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← 返回首页
        </Link>
        <span className="text-sm text-muted">
          {SEASON_NAMES[season]} · 语境复习 {Math.min(pos + 1, queue.length)}/{queue.length}
        </span>
      </header>

      <section className="max-w-2xl mx-auto px-6 py-6">
        <p className="text-sm text-muted">在句子里把单词「捡」回来——先想，再揭晓。</p>
        <div className="mt-4 bg-surface rounded-3xl p-8 border border-black/5 shadow-sm min-h-[260px] flex flex-col">
          <div className="flex items-baseline gap-3 flex-wrap">
            {revealed && (
              <>
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
              </>
            )}
          </div>

          <p className="mt-5 text-ink/90 leading-relaxed text-lg">
            {maskSentence(example.en, current.word.word, revealed)}
          </p>
          {revealed && example.zh && (
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
      </section>
    </main>
  );
}
