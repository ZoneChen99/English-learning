// 单词朗读：优先有道真人发音（dict.youdao.com/dictvoice，type=1 英音 / type=2 美音）。
// 仅当有道「真·加载失败」（未收录/网络异常，触发 audio.onerror）时才回退 Web Speech；
// play() 的 rejection（自动播放被拦 NotAllowedError / 被新请求打断 AbortError）一律忽略，
// 避免把竞态/自动播放误判成失败而回退到机械音。
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

// 有道真人发音：type=1 英音，type=2 美音
function youdaoUrl(word: string, accent: Accent): string {
  const type = accent === "uk" ? 1 : 2;
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
}

// 序号令牌：每次 speak 递增，避免上一个（已被打断的）请求的回退逻辑误作用于新词
let speakSeq = 0;

/** 朗读一个单词（或短语）。优先有道真人发音，仅真失败时回退 Web Speech。 */
export function speak(text: string, rate = 0.95): void {
  if (typeof window === "undefined" || !text) return;
  const accent = getAccent();
  const seq = ++speakSeq;

  // 先停掉任何正在播的机械音，避免与真人音重叠
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }

  // 每次新建 Audio，不复用：避免快速连续朗读时 src 被覆盖、旧 play() 被打断引发误回退
  const el = new Audio();
  el.preload = "auto";
  el.playbackRate = rate;
  el.src = youdaoUrl(text, accent);

  let fellBack = false;
  el.onerror = () => {
    // 只有真·加载失败（未收录/网络异常）才回退机械音；且仅在仍是最新请求时生效
    if (fellBack || seq !== speakSeq) return;
    fellBack = true;
    webSpeech(text, accent, rate);
  };

  const p = el.play();
  if (p && typeof p.then === "function") {
    // 忽略 play() 的 rejection：多为自动播放被拦 / 被新请求打断，并非音源失败
    p.catch(() => {
      /* 真失败由 onerror 覆盖 */
    });
  }
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
