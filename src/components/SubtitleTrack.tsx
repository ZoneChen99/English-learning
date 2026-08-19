"use client";

import type { VlogSentence } from "@/lib/types";

interface SubtitleTrackProps {
  sentences: VlogSentence[];
  /** 当前高亮句索引（-1 表示无） */
  activeIndex: number;
  /** 点击某句跳转（仅在关联视频时提供） */
  onSeek?: (start: number, index: number) => void;
  /** 点击单词查词 */
  onWord?: (raw: string) => void;
  className?: string;
}

/**
 * 双语字幕轨道：
 * - 整句可点击 → 跳转视频进度（onSeek）
 * - 句中单词可点击 → 查词（onWord），并阻止冒泡以免误触发整句跳转
 * - 当前播放句高亮
 */
export default function SubtitleTrack({
  sentences,
  activeIndex,
  onSeek,
  onWord,
  className,
}: SubtitleTrackProps) {
  function renderEn(en: string) {
    const parts = en.split(/([A-Za-z][A-Za-z'’-]*)/g);
    return parts.map((part, i) => {
      if (/^[A-Za-z][A-Za-z'’-]*$/.test(part)) {
        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onWord?.(part);
            }}
            className="text-accent/90 hover:bg-accent/10 hover:text-accent rounded px-0.5 transition"
          >
            {part}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div className={className}>
      <ol className="space-y-2">
        {sentences.map((s, i) => {
          const active = i === activeIndex;
          const hasTiming = typeof s.start === "number";
          const clickable = hasTiming && !!onSeek;
          return (
            <li key={i}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onSeek?.(s.start!, i)}
                className={
                  "w-full text-left rounded-xl px-4 py-3 border transition " +
                  (active
                    ? "bg-accent/10 border-accent/40"
                    : clickable
                    ? "bg-surface border-black/5 hover:shadow"
                    : "bg-surface border-black/5")
                }
              >
                <p
                  className={
                    "leading-relaxed " + (active ? "text-ink font-medium" : "text-ink/90")
                  }
                >
                  {renderEn(s.en)}
                </p>
                <p className="mt-1 text-muted text-sm">{s.zh}</p>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
