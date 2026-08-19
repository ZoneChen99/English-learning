// vlog 文稿数据加载（静态 JSON 存于 public/data/vlogs）
import type { Vlog, VlogMeta } from "./types";

export async function fetchVlogMetas(): Promise<VlogMeta[]> {
  const res = await fetch("/data/vlogs/index.json");
  if (!res.ok) throw new Error("无法加载 vlog 清单");
  return res.json();
}

export async function fetchVlog(id: string): Promise<Vlog> {
  const res = await fetch(`/data/vlogs/${id}.json`);
  if (!res.ok) throw new Error(`无法加载 vlog：${id}`);
  return res.json();
}
