// 浏览器朗读（Web Speech API）。无需存储音频文件，随点随读。
// 优先美式发音；失败静默。
export function speak(text: string, rate = 0.9): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    // 尽量选英语嗓音
    const voices = window.speechSynthesis.getVoices();
    const en = voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
    if (en) u.voice = en;
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
