// 浏览器朗读（Web Speech API）。无需存储音频文件，随点随读。
// 支持英音(en-GB)/美音(en-US)切换，口音存 localStorage（全局生效）。
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

export function speak(text: string, rate = 0.9): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const accent = getAccent();
    const lang = accent === "uk" ? "en-GB" : "en-US";
    u.lang = lang;
    u.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    // 优先精确匹配口音，其次任意英语嗓音
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

/** 预加载嗓音列表（部分浏览器首次 getVoices 为空，需触发 onvoiceschanged） */
export function warmupVoices(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const load = () => window.speechSynthesis.getVoices();
  load();
  window.speechSynthesis.onvoiceschanged = load;
}
