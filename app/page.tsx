"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSeason } from "@/components/SeasonTheme";
import { SeasonArt } from "@/components/SeasonArt";
import {
  ALL_SEASONS,
  SEASON_GREETINGS,
  SEASON_LABELS,
  SEASON_NAMES,
  formatDateCN,
  type Season,
} from "@/lib/season";

const MODULES = [
  {
    key: "learn",
    title: "学单词",
    desc: "按记忆规律每天推进，五步闭环记得更牢。",
    href: "/learn",
    ready: true,
  },
  {
    key: "review",
    title: "复习",
    desc: "用文章与影视片段，在语境里把单词捡回来。",
    href: null,
    ready: false,
  },
  {
    key: "film",
    title: "影视",
    desc: "边看边读整页字幕，点词即查即记。",
    href: null,
    ready: false,
  },
];

export default function Home() {
  const { season, setSeason, auto, resetToAuto } = useSeason();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  return (
    <main className="min-h-screen w-full flex flex-col bg-bg">
      <header className="flex items-center justify-between px-6 sm:px-10 py-5">
        <span className="text-sm tracking-wide text-muted">
          English · 每天推开一扇窗
        </span>
        <span className="text-sm text-muted">
          {auto ? `当前 · ${SEASON_NAMES[season]}` : `预览 · ${SEASON_NAMES[season]}`}
        </span>
      </header>

      <section className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-10 px-6 sm:px-10 py-10 max-w-5xl mx-auto w-full">
        <div className="flex-1 w-full">
          <p className="text-accent text-sm mb-3 tracking-widest">
            {now ? formatDateCN(now) : " "}
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold leading-tight text-ink">
            {SEASON_GREETINGS[season]}
          </h1>
          <p className="mt-4 text-muted text-base sm:text-lg max-w-md leading-relaxed">
            一个随季节变化的安静学习空间。先学单词，再在文章与影视里复习，让英语慢慢长进日常。
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {MODULES.map((m) => {
              const inner = (
                <>
                  <div className="text-lg font-medium text-ink">{m.title}</div>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{m.desc}</p>
                  <div className="mt-4 text-sm text-accent">
                    {m.ready ? "进入 →" : "即将开放"}
                  </div>
                </>
              );
              const cls =
                "bg-surface rounded-2xl p-5 border border-black/5 shadow-sm transition-shadow " +
                (m.ready ? "hover:shadow-md hover:-translate-y-0.5 transition-transform" : "opacity-70");
              return m.href ? (
                <Link key={m.key} href={m.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <div key={m.key} className={cls}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 shrink-0">
          <SeasonArt season={season} />
        </div>
      </section>

      <footer className="px-6 sm:px-10 py-8 flex items-center justify-center gap-3">
        {ALL_SEASONS.map((s: Season) => (
          <button
            key={s}
            onClick={() => setSeason(s)}
            aria-label={SEASON_NAMES[s]}
            className={`w-10 h-10 rounded-full text-sm transition-all ${
              season === s
                ? "bg-accent text-white shadow"
                : "bg-surface text-muted border border-black/5"
            }`}
          >
            {SEASON_LABELS[s]}
          </button>
        ))}
        {!auto && (
          <button
            onClick={resetToAuto}
            className="ml-2 text-xs text-muted underline"
          >
            回到自动
          </button>
        )}
      </footer>
    </main>
  );
}
