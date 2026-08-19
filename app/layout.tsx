import type { Metadata } from "next";
import "./globals.css";
import { SeasonThemeProvider } from "@/components/SeasonTheme";

export const metadata: Metadata = {
  title: "英语学习 · 每天推开一扇窗",
  description: "单词学习 · 语境复习 · 影视字幕，随季节变化的清新学习空间",
};

// 首屏前按日期算出季节并写入 CSS 变量，避免「默认春色 → 实际季节」的闪烁。
const noFlashScript = `
(function(){
  try {
    var m = new Date().getMonth() + 1;
    var s = (m>=3&&m<=5)?'spring':(m>=6&&m<=8)?'summer':(m>=9&&m<=11)?'autumn':'winter';
    var P = {
      spring:{bg:'#F7FAF6',surface:'#FFFFFF',ink:'#2E3A33',muted:'#7A8A80',accent:'#7FB77E',accentSoft:'#E3F0E2',deco:'#F3C6D3'},
      summer:{bg:'#FBF9F3',surface:'#FFFFFF',ink:'#33302A',muted:'#8A8270',accent:'#E0A93C',accentSoft:'#FBEFD3',deco:'#6FB1A0'},
      autumn:{bg:'#FAF6F0',surface:'#FFFFFF',ink:'#3A2F28',muted:'#8C7A68',accent:'#C98A3E',accentSoft:'#F3E2CC',deco:'#B5612E'},
      winter:{bg:'#F6F8FA',surface:'#FFFFFF',ink:'#2C333A',muted:'#79868F',accent:'#7FA8C9',accentSoft:'#E4EEF4',deco:'#C9D6DE'}
    };
    var saved = localStorage.getItem('el:season-override');
    var key = (saved==='spring'||saved==='summer'||saved==='autumn'||saved==='winter') ? saved : s;
    var p = P[key];
    var root = document.documentElement;
    root.setAttribute('data-season', key);
    root.style.setProperty('--bg', p.bg);
    root.style.setProperty('--surface', p.surface);
    root.style.setProperty('--ink', p.ink);
    root.style.setProperty('--muted', p.muted);
    root.style.setProperty('--accent', p.accent);
    root.style.setProperty('--accent-soft', p.accentSoft);
    root.style.setProperty('--deco', p.deco);
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>
        <SeasonThemeProvider>{children}</SeasonThemeProvider>
      </body>
    </html>
  );
}
