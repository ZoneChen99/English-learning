// 间隔重复调度器（SM-2 简化、初学者友好版）
// 状态机：new -> learning -> review -> mastered
// 字段与 db.ts 的 WordProgress 严格对应。
import type { WordProgress, LearnStatus } from "./types";

export type Grade = "again" | "good" | "easy";

export interface ReviewResult {
  status: LearnStatus;
  ease: number;
  interval: number; // 复习间隔（天）
  repetitions: number; // 连续答对次数
  dueDate: number; // 下次到期（epoch ms）
  correctCount: number;
  wrongCount: number;
}

const DAY = 86_400_000;

/**
 * 根据本次作答更新进度。
 * @param p 当前进度（新词用默认进度传入即可）
 * @param grade again=不认识 / good=认识 / easy=很熟
 */
export function applyReview(p: WordProgress, grade: Grade, now = Date.now()): ReviewResult {
  const correct = grade !== "again";
  const correctCount = p.correctCount + (correct ? 1 : 0);
  const wrongCount = p.wrongCount + (correct ? 0 : 1);

  let { ease, interval, repetitions } = p;

  if (correct) {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 3;
    else interval = Math.round(interval * ease);
    ease = Math.min(3.0, ease + (grade === "easy" ? 0.15 : 0.05));
  } else {
    // 答错：回到学习态，当天需重学
    repetitions = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
  }

  const status: LearnStatus = correct ? (interval >= 15 ? "mastered" : "review") : "learning";
  // 答错 -> dueDate=now（由会话内队列负责立即重排）；答对 -> 顺延 interval 天
  const dueDate = correct ? now + interval * DAY : now;

  return { status, ease, interval, repetitions, dueDate, correctCount, wrongCount };
}

/** 新词默认进度 */
export function newProgress(word: string, bookId: string, now = Date.now()): WordProgress {
  return {
    word: word.toLowerCase(),
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
  };
}
