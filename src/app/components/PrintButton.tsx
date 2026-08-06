"use client";

// 🖨️ 打印按钮（客户端组件，供服务端页面使用）
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
    >
      🖨️ 打印报告
    </button>
  );
}
