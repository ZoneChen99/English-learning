// 文章复习数据：public/data/passages.json（静态，由人工撰写/可后续扩充）
export interface Passage {
  id: string;
  title: string;
  text: string; // 英文短文，嵌入 words 所列目标词（可能含复数/时态等变形）
  words: string[]; // 目标词（词典基形，用于遮罩已学词）
}

export async function fetchPassages(): Promise<Passage[]> {
  const res = await fetch("/data/passages.json");
  if (!res.ok) throw new Error("无法加载文章");
  return res.json();
}

/** 把 token 归一化到基形（去常见复数/时态后缀），用于匹配词典基形目标词 */
export function baseOf(token: string): string {
  const t = token.toLowerCase();
  if (t.length <= 3) return t;
  if (t.endsWith("ing") && t.length > 5) return t.slice(0, -3);
  if (t.endsWith("ed") && t.length > 4) return t.slice(0, -2);
  if (t.endsWith("es") && t.length > 4) return t.slice(0, -2);
  if (t.endsWith("s") && t.length > 3) return t.slice(0, -1);
  return t;
}
