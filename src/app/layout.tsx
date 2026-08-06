import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { APP_NAME } from "@/lib/config";
import ShortcutHelp from "./components/ShortcutHelp";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "11408 备考学习站：AI 授课内容沉淀 + 错题本 + 学习追踪（个人开源项目）",
};

const NAV = [
  { href: "/", label: "首页" },
  { href: "/course", label: "课程" },
  { href: "/chat", label: "AI 答疑" },
  { href: "/mistakes", label: "错题本" },
  { href: "/logs", label: "日志" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-blue-700">
              {APP_NAME}
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <ShortcutHelp />
        <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
          {APP_NAME} · 按 <kbd className="rounded border border-slate-300 bg-slate-50 px-1 font-mono">?</kbd> 查看快捷键
        </footer>
      </body>
    </html>
  );
}
