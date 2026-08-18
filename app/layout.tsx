import type { Metadata } from "next";
import "./globals.css";
import { SeasonThemeProvider } from "@/components/SeasonTheme";

export const metadata: Metadata = {
  title: "英语学习 · 每天推开一扇窗",
  description: "单词学习 · 语境复习 · 影视字幕，随季节变化的清新学习空间",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <SeasonThemeProvider>{children}</SeasonThemeProvider>
      </body>
    </html>
  );
}
