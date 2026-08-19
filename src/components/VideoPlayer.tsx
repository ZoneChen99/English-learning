"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { VideoRef } from "@/lib/types";

/** 播放器实例暴露给父组件的命令式接口 */
export interface VideoPlayerHandle {
  seekTo: (t: number) => void;
  play: () => void;
  pause: () => void;
}

interface VideoPlayerProps {
  video: VideoRef;
  /** 播放进度回调（秒），YouTube 路径实时触发；Bilibili 路径受平台限制不触发 */
  onTick?: (current: number) => void;
  /** 视频总时长回调（秒） */
  onDuration?: (d: number) => void;
  className?: string;
}

// ---- YouTube IFrame API 最小类型子集（避免引入 any）----
interface YTPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
}
interface YTPlayerOpts {
  videoId: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (e: { target: YTPlayer }) => void;
    onStateChange?: (e: { data: number; target: YTPlayer }) => void;
  };
}
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement | string, opts: YTPlayerOpts) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// 模块级单例：确保 YT API 脚本只注入一次，多个播放器实例共享
let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ video, onTick, onDuration, className }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const ytRef = useRef<YTPlayer | null>(null);
    const biliRef = useRef<HTMLIFrameElement | null>(null);
    const tickTimer = useRef<number | null>(null);

    // 用 ref 持有最新回调，避免重建播放器实例
    const onTickRef = useRef(onTick);
    const onDurationRef = useRef(onDuration);
    useEffect(() => {
      onTickRef.current = onTick;
      onDurationRef.current = onDuration;
    });

    useImperativeHandle(
      ref,
      () => ({
        seekTo(t: number) {
          if (video.provider === "youtube" && ytRef.current) {
            ytRef.current.seekTo(t, true);
          } else if (video.provider === "bilibili" && biliRef.current?.contentWindow) {
            // Bilibili 播放器通过 postMessage 控制（尽力而为）
            biliRef.current.contentWindow.postMessage(
              JSON.stringify({ command: "seek", value: t }),
              "https://player.bilibili.com"
            );
          }
        },
        play() {
          if (video.provider === "youtube" && ytRef.current) ytRef.current.playVideo();
        },
        pause() {
          if (video.provider === "youtube" && ytRef.current) ytRef.current.pauseVideo();
        },
      }),
      [video.provider]
    );

    useEffect(() => {
      if (video.provider !== "youtube") return;
      let cancelled = false;
      (async () => {
        await loadYouTubeApi();
        if (cancelled || !hostRef.current || !window.YT) return;
        ytRef.current = new window.YT.Player(hostRef.current, {
          videoId: video.id,
          playerVars: { rel: 0, modestbranding: 1, enablejsapi: 1 },
          events: {
            onReady: (e) => {
              const p = e.target;
              onDurationRef.current?.(p.getDuration());
              if (tickTimer.current) window.clearInterval(tickTimer.current);
              tickTimer.current = window.setInterval(() => {
                onTickRef.current?.(p.getCurrentTime());
              }, 250);
            },
          },
        });
      })();
      return () => {
        cancelled = true;
        if (tickTimer.current) window.clearInterval(tickTimer.current);
        tickTimer.current = null;
        ytRef.current = null;
      };
    }, [video.provider, video.id]);

    if (video.provider === "bilibili") {
      return (
        <div className={className}>
          <iframe
            ref={biliRef}
            src={`https://player.bilibili.com/player.html?bvid=${encodeURIComponent(
              video.id
            )}&page=1&high_quality=1&danmaku=0&autoplay=0`}
            allowFullScreen
            scrolling="no"
            title="vlog 视频"
            className="w-full aspect-video rounded-2xl border border-black/5 bg-black"
          />
        </div>
      );
    }

    return (
      <div className={className}>
        <div
          ref={hostRef}
          className="w-full aspect-video rounded-2xl overflow-hidden border border-black/5 bg-black"
        />
      </div>
    );
  }
);

export default VideoPlayer;
