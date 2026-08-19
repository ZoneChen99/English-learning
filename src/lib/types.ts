// 单词与词书的核心数据类型

/** 单个单词（来自词典数据源） */
export interface Word {
  word: string;
  phonetic: string; // 音标，如 /kəˈmjuːnəti/
  pos: string; // 词性，如 "n/v"
  definition: string; // 英文释义
  translation: string; // 中文释义
  frq?: number; // 当代语料库词频排名（越小越常见）
  exchange?: string; // 时态/复数等变形，如 p:did/d:done
  examples?: { en: string; zh?: string }[]; // 例句（可选）
}

/** 词书（一份完整的单词列表） */
export interface WordBook {
  id: string;
  name: string;
  short: string;
  count: number;
  words: Word[];
}

/** 词书清单条目（用于选书界面，不含 words 以减少体积） */
export interface BookMeta {
  id: string;
  name: string;
  short: string;
  count: number;
}

/** 学习状态机：新词 -> 学习中 -> 复习 -> 已掌握 */
export type LearnStatus = "new" | "learning" | "review" | "mastered";

/** Vlog 文稿中的单句（双语字幕） */
export interface VlogSentence {
  en: string; // 英文字幕
  zh: string; // 中文字幕
}

/** 一篇带双语字幕的 vlog 转录文稿 */
export interface Vlog {
  id: string;
  title: string; // 标题，如 "北京初体验：长城与故宫"
  author: string; // 作者/频道
  sourceUrl?: string; // 来源链接（可为搜索/视频页）
  cover?: string; // 封面图（可选）
  sentences: VlogSentence[];
}

/** vlog 清单条目（用于列表，不含 sentences 以减少体积） */
export interface VlogMeta {
  id: string;
  title: string;
  author: string;
  sourceUrl?: string;
  count: number; // 句子数
}

/** 单个单词的学习进度（存于 IndexedDB） */
export interface WordProgress {
  word: string; // 主键（小写）
  bookId: string; // 所属词书
  status: LearnStatus;
  ease: number; // SM-2 难度因子，默认 2.5
  interval: number; // 当前复习间隔（天）
  repetitions: number; // 连续答对次数
  dueDate: number; // 下次复习到期时间（epoch ms）
  lastReviewed: number | null;
  correctCount: number;
  wrongCount: number;
  createdAt: number;
  updatedAt: number;
}
