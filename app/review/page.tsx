"use client";

import { useEffect, useState } from "react";
import ReviewSession from "@/components/ReviewSession";

/**
 * 复习页薄壳：解析单本复习上下文（URL ?book= 优先，sessionStorage 兜底，因 CloudStudio 网关会丢弃 query），
 * 把 bookId 传给可复用的 ReviewSession。无 bookId 时复习全部已学词。
 */
export default function ReviewPage() {
  const [bookId, setBookId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("book");
    const s = window.sessionStorage.getItem("review_book");
    setBookId(p || s || null);
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="min-h-screen grid place-items-center bg-bg text-muted">加载中…</main>
    );
  }

  return (
    <ReviewSession
      bookId={bookId ?? undefined}
      backHref={bookId ? `/learn/${bookId}` : "/"}
      backLabel={bookId ? "返回词书" : "返回首页"}
    />
  );
}
