"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSeason } from "@/components/SeasonTheme";
import { SeasonArt } from "@/components/SeasonArt";
import {
  ALL_SEASONS,
  SEASON_LABELS,
  SEASON_NAMES,
  SEASON_SUBTITLES,
  type Season,
} from "@/lib/season";

const NAV = [
  { label: "首页", href: "/" },
  { label: "单词学习", href: "/learn" },
  { label: "句子学习", href: "/review?mode=sentence" },
  { label: "影视学习", href: "/vlog" },
  { label: "学习计划", href: "#" },
  { label: "关于我们", href: "#" },
];

const MODULES = [
  {
    key: "words",
    title: "单词学习",
    desc: "科学记忆，掌握词汇",
    href: "/learn",
    icon: WordIcon,
  },
  {
    key: "sentences",
    title: "句子学习",
    desc: "地道表达，灵活运用",
    href: "/review?mode=sentence",
    icon: SentenceIcon,
  },
  {
    key: "film",
    title: "影视学习",
    desc: "沉浸体验，提升听力",
    href: "/vlog",
    icon: FilmIcon,
  },
];

function WordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none">
      <path d="M20 6 C 12 6 8 12 8 18 C 8 26 14 30 20 34 C 26 30 32 26 32 18 C 32 12 28 6 20 6 Z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M20 12 L 20 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 18 L 26 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SentenceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none">
      <circle cx="16" cy="18" r="3" fill="currentColor" />
      <circle cx="24" cy="18" r="3" fill="currentColor" />
      <path d="M10 28 C 16 34 24 34 30 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" fill="none" opacity="0.4" />
    </svg>
  );
}

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none">
      <rect x="6" y="10" width="28" height="20" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M16 16 L 26 20 L 16 24 Z" fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  const { season, setSeason, auto, resetToAuto } = useSeason();
  // 「开始学习」智能跳转：有上次词书则直接进该书，否则进选书页
  const [quickHref, setQuickHref] = useState("/learn");

  // 静态服务器（CloudStudio 网关）对深层路径做 SPA 兜底，统一回退根 index.html，
  // 导致直接访问深链时「首页被渲染在深链 URL 上」且 Next 不会自动恢复。
  // router.replace(同 URL) 是空操作；改用 router.refresh() 让路由器按当前 URL 重新拉取对应路由 RSC 并重渲染。
  // 4 秒兜底：若 refresh 未生效，恢复显示首页内容（避免卡在「加载中」）。
  const router = useRouter();
  const [recovering, setRecovering] = useState(false);
  useEffect(() => {
    const last = window.localStorage.getItem("el_last_book");
    if (last) setQuickHref(`/learn/${last}`);
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
    <main className="min-h-screen w-full flex flex-col bg-bg transition-colors duration-700">
      {/* 顶部导航 */}
      <header className="w-full px-6 sm:px-12 lg:px-16 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-semibold tracking-tight text-ink">ENJOY ENGLISH</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7">
          {NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="text-sm text-ink/80 hover:text-accent transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button className="text-sm text-ink/80 hover:text-accent transition-colors px-3 py-1.5">登录</button>
          <button className="text-sm text-white bg-ink/90 hover:bg-ink rounded-full px-4 py-1.5 transition-colors">
            注册
          </button>
        </div>
      </header>

      {/* 主视觉区 */}
      <section className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-4 px-6 sm:px-12 lg:px-16 py-6 max-w-7xl mx-auto w-full">
        {/* 左侧文案 */}
        <div className="flex-1 w-full max-w-xl">
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold leading-[1.18] text-ink tracking-tight">
            让英语学习
            <br />
            成为一种享受
          </h1>
          <p className="mt-5 text-muted text-base sm:text-lg leading-relaxed max-w-md">
            {SEASON_SUBTITLES[season]}
          </p>
          <div className="mt-8">
            <Link
              href={quickHref}
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-white text-base font-medium bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5"
            >
              开始学习
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5">
                <path d="M3 8 H 13 M13 8 L 9 4 M13 8 L 9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        {/* 右侧插画 */}
        <div className="flex-1 w-full max-w-lg lg:max-w-xl flex items-center justify-center">
          <div className="w-full aspect-[380/260] max-w-md lg:max-w-lg">
            <SeasonArt season={season} />
          </div>
        </div>
      </section>

      {/* 底部功能卡片 */}
      <section className="w-full px-6 sm:px-12 lg:px-16 pb-8 pt-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.key}
                href={m.href}
                className="group flex items-start gap-4 bg-surface rounded-2xl p-5 border border-black/5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <div className="shrink-0 w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-ink">{m.title}</h3>
                  <p className="mt-1 text-sm text-muted">{m.desc}</p>
                </div>
                <span className="self-center text-muted group-hover:text-accent transition-colors">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M7 4 L13 10 L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 季节切换（右下角浮动，避开底部卡片） */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 bg-surface/90 backdrop-blur rounded-full px-2 py-1.5 border border-black/5 shadow-sm">
          {ALL_SEASONS.map((s: Season) => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              aria-label={SEASON_NAMES[s]}
              className={`w-8 h-8 rounded-full text-xs transition-all ${
                season === s
                  ? "bg-accent text-white shadow"
                  : "text-muted hover:bg-accent/10"
              }`}
            >
              {SEASON_LABELS[s]}
            </button>
          ))}
        </div>
        {!auto && (
          <button
            onClick={resetToAuto}
            className="text-xs text-muted bg-surface/90 backdrop-blur rounded-full px-3 py-1 border border-black/5 shadow-sm hover:text-accent"
          >
            回到自动
          </button>
        )}
      </div>
    </main>
  );
}
