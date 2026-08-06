"use client";

import { useEffect, useState } from "react";

// ⬆️ 回到顶部：滚动超过一定距离后出现
export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 left-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-lg shadow-lg transition hover:bg-blue-50"
      title="回到顶部"
    >
      ⬆️
    </button>
  );
}
