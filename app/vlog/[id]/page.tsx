"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchVlog } from "@/lib/vlogs";
import { findFocusWord, findWord } from "@/lib/books";
import VideoPlayer, { type VideoPlayerHandle } from "@/components/VideoPlayer";
import SubtitleTrack from "@/components/SubtitleTrack";
import { addWord, getProgress, updateProgress } from "@/lib/db";
import { applyReview, type Grade } from "@/lib/sr";
import { speak, warmupVoices } from "@/lib/audio";
import { formatPos } from "@/lib/pos";
import { useSeason } from "@/components/SeasonTheme";
import { SEASON_NAMES } from "@/lib/season";
import type { Vlog, Word, WordProgress } from "@/lib/types";

type Mode = "sentence" | "word" | "mixed";
type Tab = "transcript" | "review";
type Status = "loading" | "empty" | "ready" | "done";

interface VCard {
  word: Word;
  bookId: string;
  en: string;
  zh: string;
  useSentence: boolean;
}

const MODE_LABEL: Record<Mode, string> = {
  sentence: "句子模式",
  word: "单词模式",
  mixed: "混合模式",
};

function readInitialMode(): Mode {
  if (typeof window === "undefined") return "sentence";
  const p = new URLSearchParams(window.location.search).get("mode");
  if (p === "word" || p === "sentence" || p === "mixed") return p;
  const saved = localStorage.getItem("vlog-review-mode");
  if (saved === "word" || saved === "sentence" || saved === "mixed") return saved as Mode;
  return "sentence";
}

// 与复习模块一致的遮罩逻辑：句中目标词先遮罩，揭晓后高亮
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

export default function VlogPage() {
  const { season } = useSeason();
  const [vlog, setVlog] = useState<Vlog | null>(null);
  const [tab, setTab] = useState<Tab>("transcript");
  const [mode, setMode] = useState<Mode>("sentence");

  // 复习状态
  const [status, setStatus] = useState<Status>("loading");
  const [queue, setQueue] = useState<VCard[]>([]);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ recalled: 0, fuzzy: 0, forgot: 0 });

  // 点词查词状态
  const [lookup, setLookup] = useState<{ raw: string; word: Word | null; bookId?: string; saved?: boolean } | null>(null);

  // Phase 4: 视频播放 + 字幕跟随
  const playerRef = useRef<VideoPlayerHandle>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [duration, setDuration] = useState(0);

  function timeToIndex(t: number): number {
    if (!vlog) return -1;
    let idx = -1;
    for (let i = 0; i < vlog.sentences.length; i++) {
      const s = vlog.sentences[i];
      if (typeof s.start === "number" && s.start <= t) idx = i;
      else break;
    }
    return idx;
  }
  function handleTick(t: number) {
    setActiveIndex(timeToIndex(t));
  }
  function handleSeek(_start: number, i: number) {
    playerRef.current?.seekTo(_start);
    setActiveIndex(i);
  }

  useEffect(() => {
    const vid = new URLSearchParams(window.location.search).get("id") ?? window.location.pathname.split("/").pop() ?? "";
    fetchVlog(vid).then(setVlog).catch(() => setVlog(null));
    setMode(readInitialMode());
  }, []);

  // 进入复习页时根据题目构建卡片队列
  useEffect(() => {
    if (tab !== "review" || !vlog) return;
    warmupVoices();
    let alive = true;
    (async () => {
      try {
        const cards: VCard[] = [];
        for (const s of vlog.sentences) {
          const f = await findFocusWord(s.en);
          if (f) {
            const useSentence = mode === "mixed" ? Math.random() < 0.5 : mode === "sentence";
            cards.push({ word: f.word, bookId: f.bookId, en: s.en, zh: s.zh, useSentence });
          }
        }
        if (!alive) return;
        if (cards.length === 0) {
          setStatus("empty");
          return;
        }
        setQueue(cards);
        setPos(0);
        setRevealed(false);
        setStats({ recalled: 0, fuzzy: 0, forgot: 0 });
        setStatus("ready");
      } catch {
        if (alive) setStatus("empty");
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, mode, vlog]);

  const current = queue[pos];
  const curPos = current?.word.pos ? formatPos(current.word.pos) : null;

  function changeMode(m: Mode) {
    setMode(m);
    if (typeof window !== "undefined") {
      localStorage.setItem("vlog-review-mode", m);
      const url = new URL(window.location.href);
      url.searchParams.set("mode", m);
      window.history.replaceState({}, "", url.toString());
    }
  }

  async function onWordClick(raw: string) {
    const r = await findWord(raw);
    setLookup(r ? { raw, word: r.word, bookId: r.bookId } : { raw, word: null });
  }

  async function saveLookup() {
    if (lookup?.word && lookup?.bookId) {
      await addWord(lookup.word.word, lookup.bookId);
      setLookup({ ...lookup, saved: true });
    }
  }

  function onRate(grade: Grade) {
    if (!current) return;
    getProgress(current.word.word, current.bookId).then((existing) => {
      const base: WordProgress =
        existing ?? {
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

  if (!vlog) {
    return (
      <main className="min-h-screen grid place-items-center bg-bg text-muted">加载中…</main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-bg">
      <header className="flex items-center justify-between px-6 sm:px-10 py-4">
        <Link href="/vlog" className="text-sm text-muted hover:text-ink">
          ← 返回列表
        </Link>
        <span className="text-sm text-muted">
          {SEASON_NAMES[season]} · {vlog.title}
        </span>
      </header>

      {/* Tab 切换 */}
      <div className="flex gap-2 justify-center mb-2">
        {(["transcript", "review"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "px-4 py-1.5 rounded-full text-sm transition " +
              (tab === t ? "bg-accent text-white" : "bg-surface border border-black/5 text-ink hover:shadow")
            }
          >
            {t === "transcript" ? "文稿阅读" : "三模式复习"}
          </button>
        ))}
      </div>

      {tab === "transcript" ? (
        <section className="max-w-2xl mx-auto px-6 py-6">
          <p className="text-sm text-muted mb-4">
            点击任意英文单词即可查词释义，并「加入生词本」
            {vlog.video ? "；点击字幕可跳转视频进度，当前句会随播放高亮。" : "。中文对照在每句下方。"}
          </p>
          {vlog.video && (
            <VideoPlayer
              ref={playerRef}
              video={vlog.video}
              onTick={handleTick}
              onDuration={setDuration}
              className="mb-5"
            />
          )}
          <SubtitleTrack
            sentences={vlog.sentences}
            activeIndex={activeIndex}
            onSeek={vlog.video ? handleSeek : undefined}
            onWord={onWordClick}
          />

          {/* 点词查词栏 */}
          {lookup && (
            <div className="sticky bottom-4 mt-6 bg-surface border border-black/5 rounded-2xl p-4 shadow-lg">
              {lookup.word ? (
                <>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xl font-semibold text-ink">{lookup.word.word}</span>
                    {lookup.word.phonetic && <span className="text-muted">/{lookup.word.phonetic}/</span>}
                    {lookup.word.pos && formatPos(lookup.word.pos) && (
                      <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">
                        {formatPos(lookup.word.pos)}
                      </span>
                    )}
                    <button
                      onClick={() => speak(lookup.word!.word)}
                      className="ml-auto w-9 h-9 rounded-full bg-accent/10 text-accent text-base hover:bg-accent/20"
                      aria-label="朗读"
                    >
                      🔊
                    </button>
                  </div>
                  <p className="mt-1 text-ink">{lookup.word.translation}</p>
                  {lookup.word.examples?.[0] && (
                    <p className="mt-1 text-muted text-sm">{lookup.word.examples[0].en}</p>
                  )}
                  <button
                    onClick={saveLookup}
                    disabled={lookup.saved}
                    className="mt-3 px-4 py-2 rounded-full bg-accent text-white text-sm disabled:opacity-50 hover:opacity-90"
                  >
                    {lookup.saved ? "已加入生词本 ✓" : "加入生词本"}
                  </button>
                </>
              ) : (
                <p className="text-muted text-sm">
                  「{lookup.raw}」词库未收录，可先在词书学习中积累。
                </p>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="max-w-2xl mx-auto px-6 py-6">
          {status === "empty" ? (
            <div className="text-center py-20">
              <div className="text-5xl">🍃</div>
              <h2 className="mt-4 text-xl font-semibold text-ink">这篇文稿暂无可复习的生词</h2>
              <p className="mt-2 text-muted text-sm">换一篇，或先在文稿里点词加入生词本。</p>
            </div>
          ) : status === "done" || !current ? (
            <div className="text-center py-20">
              <div className="text-5xl">🌿</div>
              <h2 className="mt-4 text-xl font-semibold text-ink">这一轮复习完成</h2>
              <p className="mt-2 text-muted text-sm">
                记得 {stats.recalled} · 模糊 {stats.fuzzy} · 忘了 {stats.forgot}
              </p>
              <button
                onClick={() => location.reload()}
                className="mt-6 px-5 py-2.5 rounded-full bg-accent text-white text-sm hover:opacity-90"
              >
                再来一轮
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs text-muted mr-1">呈现方式</span>
                {(["sentence", "word", "mixed"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => changeMode(m)}
                    className={
                      "px-3 py-1.5 rounded-full text-xs transition " +
                      (mode === m ? "bg-accent text-white" : "bg-surface border border-black/5 text-ink hover:shadow")
                    }
                  >
                    {MODE_LABEL[m]}
                  </button>
                ))}
                <span className="text-xs text-muted ml-auto">
                  {Math.min(pos + 1, queue.length)}/{queue.length}
                </span>
              </div>

              {current.useSentence ? (
                <>
                  <p className="text-sm text-muted">在句子里把单词「捡」回来——先想，再揭晓。</p>
                  <div className="mt-4 bg-surface rounded-3xl p-8 border border-black/5 shadow-sm min-h-[220px] flex flex-col">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      {revealed && (
                        <>
                          <h2 className="text-3xl font-semibold text-ink">{current.word.word}</h2>
                          {current.word.phonetic && <span className="text-muted text-lg">/{current.word.phonetic}/</span>}
                          {curPos && (
                            <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">
                              {curPos}
                            </span>
                          )}
                          <button
                            onClick={() => speak(current.word.word)}
                            className="ml-auto w-10 h-10 rounded-full bg-accent/10 text-accent text-lg hover:bg-accent/20"
                            aria-label="朗读"
                          >
                            🔊
                          </button>
                        </>
                      )}
                    </div>
                    <p className="mt-5 text-ink/90 leading-relaxed text-lg">
                      {maskSentence(current.en, current.word.word, revealed)}
                    </p>
                    {revealed && current.word.translation && (
                      <div className="mt-4 pt-4 border-t border-black/5 text-ink">{current.word.translation}</div>
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
                      <button onClick={() => onRate("again")} className="py-3 rounded-2xl bg-surface border border-black/5 text-ink text-sm hover:shadow">没想起</button>
                      <button onClick={() => onRate("good")} className="py-3 rounded-2xl bg-accent/10 text-accent text-sm hover:bg-accent/20">有点印象</button>
                      <button onClick={() => onRate("easy")} className="py-3 rounded-2xl bg-accent text-white text-sm hover:opacity-90">想起来了</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted">看着单词回想它的意思——先想，再揭晓。</p>
                  <div className="mt-4 bg-surface rounded-3xl p-8 border border-black/5 shadow-sm min-h-[220px] flex flex-col">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <h2 className="text-3xl font-semibold text-ink">{current.word.word}</h2>
                      {revealed && current.word.phonetic && <span className="text-muted text-lg">/{current.word.phonetic}/</span>}
                      {revealed && curPos && (
                        <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">
                          {curPos}
                        </span>
                      )}
                      <button
                        onClick={() => speak(current.word.word)}
                        className="ml-auto w-10 h-10 rounded-full bg-accent/10 text-accent text-lg hover:bg-accent/20"
                        aria-label="朗读"
                      >
                        🔊
                      </button>
                    </div>
                    {!revealed ? (
                      <p className="mt-5 text-ink/70 leading-relaxed text-lg">这个单词是什么意思？</p>
                    ) : (
                      <>
                        <div className="mt-5 text-ink text-lg">{current.word.translation}</div>
                        <div className="mt-4 pt-4 border-t border-black/5">
                          <p className="text-ink/90 text-sm">{current.en}</p>
                          <p className="mt-1 text-muted text-sm">{current.zh}</p>
                        </div>
                      </>
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
                      <button onClick={() => onRate("again")} className="py-3 rounded-2xl bg-surface border border-black/5 text-ink text-sm hover:shadow">没想起</button>
                      <button onClick={() => onRate("good")} className="py-3 rounded-2xl bg-accent/10 text-accent text-sm hover:bg-accent/20">有点印象</button>
                      <button onClick={() => onRate("easy")} className="py-3 rounded-2xl bg-accent text-white text-sm hover:opacity-90">想起来了</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
