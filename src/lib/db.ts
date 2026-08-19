// 本地存储层：用 Dexie 封装 IndexedDB，保存用户的学习进度与设置。
// 仅本机存储，无需账号；多词书进度独立保存。
import Dexie, { type Table } from "dexie";
import type { WordProgress } from "./types";

export interface UserSetting {
  key: string;
  value: unknown;
}

class EnglishDB extends Dexie {
  progress!: Table<WordProgress, string>;
  settings!: Table<UserSetting, string>;

  constructor() {
    super("english-learning");
    this.version(1).stores({
      // 主键为 word；按 bookId / dueDate / status 建立索引便于查询
      progress: "word, bookId, dueDate, status",
      settings: "key",
    });
  }
}

export const db = new EnglishDB();

/** 读取设置（带默认值） */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return (row ? (row.value as T) : fallback) ?? fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

/**
 * 批量确保某词书的单词在进度表中存在（新词默认状态为 new）。
 * 已存在的记录保持不变，避免覆盖学习进度。
 */
export async function ensureWords(words: { word: string }[], bookId: string): Promise<void> {
  const now = Date.now();
  const existing = await db.progress.bulkGet(words.map((w) => w.word.toLowerCase()));
  const toPut: WordProgress[] = [];
  words.forEach((w, idx) => {
    const key = w.word.toLowerCase();
    if (!existing[idx]) {
      toPut.push({
        word: key,
        bookId,
        status: "new",
        ease: 2.5,
        interval: 0,
        repetitions: 0,
        dueDate: now,
        lastReviewed: null,
        correctCount: 0,
        wrongCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
  if (toPut.length) await db.progress.bulkPut(toPut);
}

/** 更新某单词的学习进度 */
export async function updateProgress(word: string, patch: Partial<WordProgress>): Promise<void> {
  const key = word.toLowerCase();
  const cur = await db.progress.get(key);
  if (!cur) return;
  await db.progress.put({ ...cur, ...patch, word: key, updatedAt: Date.now() });
}

/** 取某词书下到期/待学单词（dueDate <= now 且属于该书），按紧急度排序 */
export async function getDueWords(bookId: string, limit = 50): Promise<WordProgress[]> {
  const now = Date.now();
  const all = await db.progress.where("bookId").equals(bookId).toArray();
  return all
    .filter((p) => p.dueDate <= now)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, limit);
}

/** 取某词书全部进度 */
export async function getBookProgress(bookId: string): Promise<WordProgress[]> {
  return db.progress.where("bookId").equals(bookId).toArray();
}

/** 取单个单词的进度（无则返回 null） */
export async function getProgress(word: string, bookId: string): Promise<WordProgress | undefined> {
  return db.progress.get(word.toLowerCase());
}

/** 取全部学习进度（跨词书），用于复习模块汇总待复习单词 */
export async function getAllProgress(): Promise<WordProgress[]> {
  return db.progress.toArray();
}
