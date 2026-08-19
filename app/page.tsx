"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    desc: "在例句语境里把单词捡回来，记得更牢。",
    href: "/review",
    ready: true,
  },
  {
    key: "vlog",
    title: "Vlog 复习",
    desc: "读外国人中国行 vlog 文稿，点词即查、三模式复习。",
    href: "/vlog",
    ready: true,
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

  // 静态服务器（CloudStudio 网关）对深层路径做 SPA 兜底，统一回退根 index.html，
  // 导致直接访问深链时「首页被渲染在深链 URL 上」且 Next 不会自动恢复。
  // router.replace(同 URL) 是空操作；改用 router.refresh() 让路由器按当前 URL 重新拉取对应路由 RSC 并重渲染。
  // 4 秒兜底：若 refresh 未生效，恢复显示首页内容（避免卡在「加载中」）。
  const router = useRouter();
  const [recovering, setRecovering] = useState(false);
  useEffect(() => {
    const p = window.location.pathname.replace(/\/+$/, "");
    if (p !== "") {
      setRecovering(true);
      router.refresh();
      const t = setTimeout(() => setRecovering(false), 4000);
      return () => clearTimeout(t);
    }
  }, [router]);

  if (recovering) {
    return (
      <main className="min-h-screen grid place-items-center bg-bg text-muted">加载中…</main>
    );
  }

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
            一个随季节变化的安静学习空间。先学单词，再在 vlog 与影视里复习，让英语慢慢长进日常。
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
