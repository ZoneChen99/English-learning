// 客户端词书数据加载（静态 JSON 由 build_wordlists.py 生成于 public/data）
import type { BookMeta, WordBook, Word } from "./types";

const bookCache = new Map<string, WordBook>();
let indexCache: Record<string, string> | null = null;

/** 加载单词→词书 索引（小写词 -> bookId），用于文稿点词/复习定位 */
async function getIndex(): Promise<Record<string, string>> {
  if (indexCache) return indexCache;
  const res = await fetch("/data/words-index.json");
  if (!res.ok) throw new Error("无法加载单词索引");
  const idx: Record<string, string> = await res.json();
  indexCache = idx;
  return idx;
}

async function loadBook(id: string): Promise<WordBook> {
  if (bookCache.has(id)) return bookCache.get(id)!;
  const b = await fetchBook(id);
  bookCache.set(id, b);
  return b;
}

/** 在本地词书中查找一个单词，返回其 Word 对象与所属词书 */
export async function findWord(
  word: string
): Promise<{ word: Word; bookId: string } | null> {
  const lower = word.toLowerCase().replace(/[^a-z']/g, "");
  if (!lower) return null;
  const idx = await getIndex();
  const bookId = idx[lower];
  if (!bookId) return null;
  const book = await loadBook(bookId);
  const w = book.words.find((x) => x.word.toLowerCase() === lower);
  return w ? { word: w, bookId } : null;
}

/**
 * 从一句话里挑出最适合作为复习聚焦词的单词（跳过虚词，取信息量最大的），
 * 用于把 vlog 文稿句子转化为可复习卡片（句子模式遮罩它，单词模式召回它）。
 */
const STOPWORDS = new Set([
  "a","an","the","to","of","in","on","is","are","was","were","and","or","but",
  "for","with","at","by","from","this","that","it","you","we","they","he","she",
  "i","my","your","as","be","been","being","have","has","had","do","does","did",
  "not","no","so","up","out","about","into","than","then","them","his","her",
  "their","our","me","us","if","can","could","would","will","just","very","really",
  "also","there","here","what","when","where","who","how","which","because","am",
  "its","all","any","each","more","most","some","such","only","own","same","other",
  "too","s","t","d","ll","re","ve","m","don","now","got","get","go","going",
]);

export async function findFocusWord(
  sentence: string
): Promise<{ word: Word; bookId: string } | null> {
  const idx = await getIndex();
  const tokens = sentence.match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];
  const cands: { lower: string; bookId: string; raw: string }[] = [];
  for (const t of tokens) {
    const lower = t.toLowerCase().replace(/[^a-z']/g, "");
    const bookId = idx[lower];
    if (bookId && !STOPWORDS.has(lower)) cands.push({ lower, bookId, raw: t });
  }
  if (!cands.length) return null;
  // 取长度最长（信息量最大）的作为聚焦词；并列时取先出现的
  cands.sort((a, b) => b.raw.length - a.raw.length);
  const best = cands[0];
  const book = await loadBook(best.bookId);
  const w = book.words.find((x) => x.word.toLowerCase() === best.lower);
  return w ? { word: w, bookId: best.bookId } : null;
}

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
