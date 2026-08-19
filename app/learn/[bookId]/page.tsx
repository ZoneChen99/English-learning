"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchBook } from "@/lib/books";
import { ensureWords, updateProgress, getBookProgress } from "@/lib/db";
import { applyReview, newProgress, type Grade } from "@/lib/sr";
import { speak, warmupVoices } from "@/lib/audio";
import { useSeason } from "@/components/SeasonTheme";
import { SEASON_NAMES } from "@/lib/season";
import type { Word, WordBook, WordProgress } from "@/lib/types";

const DAILY_NEW = 20;
const MAX_AGAIN = 2; // 单卡本次会话最多重排次数，避免死循环

type Status = "loading" | "ready" | "done";

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

export default function Session() {
  const params = useParams();
  const bookId = String(params.bookId ?? "");
  const { season } = useSeason();

  const [book, setBook] = useState<WordBook | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [queue, setQueue] = useState<Word[]>([]);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ learned: 0, reviewed: 0, again: 0 });

  const progRef = useRef<Map<string, WordProgress>>(new Map());
  const againRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    warmupVoices();
    let alive = true;
    (async () => {
      try {
        const b = await fetchBook(bookId);
        await ensureWords(b.words, b.id);
        const prog = await getBookProgress(b.id);
        progRef.current = new Map(prog.map((p) => [p.word, p]));

        const now = Date.now();
        const byKey = new Map(b.words.map((w) => [w.word.toLowerCase(), w]));
        const dueWords = prog
          .filter((p) => p.dueDate <= now && p.status !== "new")
          .map((p) => byKey.get(p.word))
          .filter((w): w is Word => Boolean(w));
        const newWords = b.words
          .filter((w) => {
            const p = progRef.current.get(w.word.toLowerCase());
            return !p || p.status === "new";
          })
          .slice(0, DAILY_NEW);

        const q = [...dueWords, ...newWords];
        if (!alive) return;
        setBook(b);
        setQueue(q);
        setStatus(q.length ? "ready" : "done");
        if (q.length) speak(q[0].word);
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

  function onAnswer(grade: Grade) {
    if (!current || !book) return;
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

    setRevealed(true);
    // 稍作停留展示释义，再进入下一张
    window.setTimeout(() => {
      setPos((p) => p + 1);
    }, 650);
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen grid place-items-center bg-bg text-muted">加载中…</main>
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
              onClick={() => location.reload()}
              className="px-5 py-2.5 rounded-full bg-accent text-white text-sm hover:opacity-90"
            >
              再来一组
            </button>
            <Link
              href="/learn"
              className="px-5 py-2.5 rounded-full bg-surface border border-black/5 text-sm text-ink hover:shadow"
            >
              返回词书
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-bg">
      <header className="flex items-center justify-between px-6 sm:px-10 py-4">
        <Link href="/learn" className="text-sm text-muted hover:text-ink">
          ← {book?.name}
        </Link>
        <span className="text-sm text-muted">
          {SEASON_NAMES[season]} · {Math.min(pos + 1, queue.length)}/{queue.length}
        </span>
      </header>

      <section className="max-w-2xl mx-auto px-6 py-6">
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
        <p className="mt-3 text-center text-xs text-muted">
          {revealed ? "已记录，即将进入下一个" : "先凭感觉判断，再揭晓释义"}
        </p>
      </section>
    </main>
  );
}
