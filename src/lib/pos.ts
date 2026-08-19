/**
 * 词性（part of speech）中文化工具。
 *
 * 本地词书的 `pos` 字段为原始缩写（如 v / n / adj / vt&vi&n / n & a），
 * 这里统一映射为可读的中文标签，并兼容「多词性并列」「括号注释」等形态。
 */

const POS_MAP: Record<string, string> = {
  n: "名词",
  v: "动词",
  vt: "及物动词",
  vi: "不及物动词",
  adj: "形容词",
  a: "形容词",
  adv: "副词",
  ad: "副词",
  prep: "介词",
  conj: "连词",
  pron: "代词",
  aux: "助动词",
  num: "数词",
  art: "冠词",
  int: "感叹词",
};

/**
 * 把原始 pos 转为中文标签串。
 * - "v & n"     -> "动词·名词"
 * "vt&vi&n"     -> "及物动词·不及物动词·名词"（去重）
 * "(缩作OK)a&ad" -> "形容词·副词"（忽略括号注释）
 * 无法识别则原样保留，保证永不返回空。
 */
export function formatPos(raw?: string): string | null {
  if (!raw || !raw.trim()) return null;
  const cleaned = raw.replace(/\([^)]*\)/g, " "); // 去掉括号注释，如 (缩作OK)
  const parts = cleaned
    .split(/[&/]+/)
    .map((p) => p.replace(/[^a-zA-Z]/g, "").trim())
    .filter(Boolean);
  const labels = parts.map((p) => POS_MAP[p.toLowerCase()] ?? p).filter(Boolean);
  const unique = Array.from(new Set(labels));
  return unique.length ? unique.join("·") : null;
}
