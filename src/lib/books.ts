// 客户端词书数据加载（静态 JSON 由 build_wordlists.py 生成于 public/data）
import type { BookMeta, WordBook } from "./types";

export async function fetchBookMetas(): Promise<BookMeta[]> {
  const res = await fetch("/data/books.json");
  if (!res.ok) throw new Error("无法加载词书清单");
  return res.json();
}

export async function fetchBook(id: string): Promise<WordBook> {
  const res = await fetch(`/data/${id}.json`);
  if (!res.ok) throw new Error(`无法加载词书：${id}`);
  return res.json();
}
