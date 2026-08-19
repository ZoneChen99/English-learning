// 单词朗读：优先有道真人发音（dict.youdao.com/dictvoice，type=1 英音 / type=2 美音），
// 失败（未收录/网络/自动播放被拦）时回退浏览器 Web Speech 合成。
// 口音存 localStorage，全局生效（学习/复习/vlog 点词）。
export type Accent = "uk" | "us";

const ACCENT_KEY = "el_accent";

export function getAccent(): Accent {
  if (typeof window === "undefined") return "us";
  return localStorage.getItem(ACCENT_KEY) === "uk" ? "uk" : "us";
}

export function setAccent(a: Accent): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCENT_KEY, a);
}

let audioEl: HTMLAudioElement | null = null;
function getAudioEl(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "auto";
    // 不设 crossOrigin：播放跨域音频无需 CORS（同 <img>），设了反而被 CORS 拦截
  }
  return audioEl;
}

// 有道真人发音：type=1 英音，type=2 美音
function youdaoUrl(word: string, accent: Accent): string {
  const type = accent === "uk" ? 1 : 2;
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
}

/** 朗读一个单词（或短语）。优先有道真人发音，失败回退 Web Speech。 */
export function speak(text: string, rate = 0.95): void {
  if (typeof window === "undefined" || !text) return;
  const accent = getAccent();
  const el = getAudioEl();
  if (el) {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    el.src = youdaoUrl(text, accent);
    el.playbackRate = rate;
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.catch(() => webSpeech(text, accent, rate));
    }
    return;
  }
  webSpeech(text, accent, rate);
}

function webSpeech(text: string, accent: Accent, rate: number): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const lang = accent === "uk" ? "en-GB" : "en-US";
    u.lang = lang;
    u.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const exact =
      voices.find((v) => v.lang?.toLowerCase() === lang.toLowerCase()) ??
      voices.find((v) => v.lang?.toLowerCase().startsWith(accent === "uk" ? "en-gb" : "en-us")) ??
      voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
    if (exact) u.voice = exact;
    window.speechSynthesis.speak(u);
  } catch {
    /* 忽略朗读失败 */
  }
}

/** 预加载嗓音列表（Web Speech 回退用；部分浏览器首次 getVoices 为空） */
export function warmupVoices(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const load = () => window.speechSynthesis.getVoices();
  load();
  window.speechSynthesis.onvoiceschanged = load;
}
