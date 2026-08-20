"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchBookMetas } from "@/lib/books";
import { getBookProgress } from "@/lib/db";
import { useSeason } from "@/components/SeasonTheme";
import { SEASON_NAMES } from "@/lib/season";
import type { BookMeta } from "@/lib/types";

interface Row extends BookMeta {
  learned: number;
  due: number;
}

const DAILY_NEW = 20;

export default function LearnHome() {
  const { season } = useSeason();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastBook, setLastBook] = useState<Row | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const metas = await fetchBookMetas();
        const now = Date.now();
        const computed = await Promise.all(
          metas.map(async (m) => {
            const prog = await getBookProgress(m.id);
            const learned = prog.filter((p) => p.status !== "new").length;
            const due = prog.filter((p) => p.dueDate <= now).length;
            return { ...m, learned, due };
          })
        );
        if (!alive) return;
        setRows(computed);
        // 记住上次打开的词书，提供「继续上次」快捷入口
        const lastId = window.localStorage.getItem("el_last_book");
        if (lastId) {
          const hit = computed.find((r) => r.id === lastId);
          if (hit) setLastBook(hit);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen w-full bg-bg">
      <header className="flex items-center justify-between px-6 sm:px-10 py-5">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← 返回首页
        </Link>
        <span className="text-sm text-muted">{SEASON_NAMES[season]} · 选择词书</span>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-semibold text-ink">今天学哪一本？</h1>
        <p className="mt-2 text-muted">点开词书后，先选「学习新词」或「复习已学」，再开始。</p>

        {lastBook && (
          <Link
            href={`/learn/${lastBook.id}`}
            className="mt-6 block bg-accent/10 border border-accent/20 rounded-3xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-accent font-medium">继续上次</div>
                <div className="text-xl font-semibold text-ink mt-1">{lastBook.name}</div>
                <div className="text-xs text-muted mt-1">
                  已学 {lastBook.learned}/{lastBook.count}
                  {lastBook.due > 0 && ` · 今日待复习 ${lastBook.due}`}
                </div>
              </div>
              <span className="text-accent text-sm">接着学 →</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-black/5 overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{ width: `${lastBook.count ? Math.round((lastBook.learned / lastBook.count) * 100) : 0}%` }}
              />
            </div>
          </Link>
        )}

        <div className="mt-8 grid gap-4">
          {loading && <p className="text-muted">加载中…</p>}
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/learn/${r.id}`}
              className="bg-surface rounded-2xl p-5 border border-black/5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-medium text-ink">{r.name}</div>
                  <div className="text-xs text-muted mt-1">
                    共 {r.count} 词 · 已学 {r.learned}
                  </div>
                </div>
                <div
                  className={`text-sm px-3 py-1 rounded-full ${
                    r.due > 0 ? "bg-accent/10 text-accent" : "bg-black/5 text-muted"
                  }`}
                >
                  {r.due > 0 ? `今日待复习 ${r.due}` : "无待复习"}
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-black/5 overflow-hidden">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${r.count ? Math.round((r.learned / r.count) * 100) : 0}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
