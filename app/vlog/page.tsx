"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSeason } from "@/components/SeasonTheme";
import { fetchVlogMetas } from "@/lib/vlogs";
import type { VlogMeta } from "@/lib/types";

export default function VlogList() {
  const { season } = useSeason();
  const [metas, setMetas] = useState<VlogMeta[] | null>(null);

  useEffect(() => {
    fetchVlogMetas().then(setMetas).catch(() => setMetas([]));
  }, []);

  return (
    <main className="min-h-screen w-full bg-bg">
      <header className="flex items-center justify-between px-6 sm:px-10 py-4">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← 返回首页
        </Link>
        <span className="text-sm text-muted">Vlog 文稿复习</span>
      </header>

      <section className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-ink">挑一篇 vlog 来读</h1>
        <p className="mt-2 text-muted text-sm">
          下面是外国人来中国游玩的 vlog 转录文稿（自带双语字幕），可以整篇阅读、点词查词，也能进入三模式复习。
        </p>

        <div className="mt-6 grid gap-4">
          {metas === null && (
            <p className="text-muted text-sm">加载中…</p>
          )}
          {metas?.map((m) => (
            <Link
              key={m.id}
              href={`/vlog/${m.id}`}
              className="block bg-surface rounded-2xl p-5 border border-black/5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
            >
              <div className="text-lg font-medium text-ink">{m.title}</div>
              <p className="mt-1 text-sm text-muted">{m.author}</p>
              <p className="mt-3 text-xs text-accent">{m.count} 句双语字幕 · 进入 →</p>
            </Link>
          ))}
          {metas?.length === 0 && (
            <p className="text-muted text-sm">暂无文稿。</p>
          )}
        </div>
      </section>
    </main>
  );
}
