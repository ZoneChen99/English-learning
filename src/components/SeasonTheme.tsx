"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  Season,
  SEASON_PALETTES,
  getSeasonFromDate,
} from "@/lib/season";

interface SeasonContextValue {
  season: Season;
  setSeason: (s: Season) => void;
  auto: boolean;
  resetToAuto: () => void;
}

const SeasonContext = createContext<SeasonContextValue | null>(null);

const STORAGE_KEY = "el:season-override";

function applyPalette(season: Season) {
  const p = SEASON_PALETTES[season];
  const root = document.documentElement;
  root.setAttribute("data-season", season);
  root.style.setProperty("--bg", p.bg);
  root.style.setProperty("--surface", p.surface);
  root.style.setProperty("--ink", p.ink);
  root.style.setProperty("--muted", p.muted);
  root.style.setProperty("--accent", p.accent);
  root.style.setProperty("--accent-soft", p.accentSoft);
  root.style.setProperty("--deco", p.deco);
}

function isValidSeason(v: unknown): v is Season {
  return v === "spring" || v === "summer" || v === "autumn" || v === "winter";
}

export function SeasonThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // 初始季节直接按当前日期计算，保证首屏（含 SSR）即正确，避免闪烁与 hydration 不一致
  const [season, setSeasonState] = useState<Season>(() =>
    getSeasonFromDate(new Date())
  );
  const [auto, setAuto] = useState(true);

  // 挂载后优先读取本地覆盖，否则维持按日期自动
  useEffect(() => {
    let initial: Season | null = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isValidSeason(saved)) {
        initial = saved;
        setAuto(false);
      }
    } catch {
      /* localStorage 不可用时忽略，退回自动 */
    }
    if (!initial) initial = getSeasonFromDate(new Date());
    setSeasonState(initial);
  }, []);

  // 每次季节变化，把配色写入 <html> 的 CSS 变量
  useEffect(() => {
    applyPalette(season);
  }, [season]);

  const setSeason = useCallback((s: Season) => {
    setSeasonState(s);
    setAuto(false);
    try {
      localStorage.setItem(STORAGE_KEY, s);
    } catch {
      /* 忽略 */
    }
  }, []);

  const resetToAuto = useCallback(() => {
    const s = getSeasonFromDate(new Date());
    setSeasonState(s);
    setAuto(true);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* 忽略 */
    }
  }, []);

  return (
    <SeasonContext.Provider
      value={{ season, setSeason, auto, resetToAuto }}
    >
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  const ctx = useContext(SeasonContext);
  if (!ctx) {
    throw new Error("useSeason 必须在 SeasonThemeProvider 内使用");
  }
  return ctx;
}
