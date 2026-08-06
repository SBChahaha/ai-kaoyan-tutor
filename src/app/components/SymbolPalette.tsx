"use client";

// 常用数学符号快捷面板：点一下插入，不用记 LaTeX
const SYMBOLS = [
  "√",
  "π",
  "∞",
  "≥",
  "≤",
  "≠",
  "±",
  "×",
  "÷",
  "²",
  "³",
  "ⁿ",
  "⁻¹",
  "∑",
  "∫",
  "→",
  "∈",
  "∪",
  "∩",
  "⊂",
  "∅",
  "⇒",
  "⇔",
  "ℝ",
];

export default function SymbolPalette({
  onInsert,
  disabled,
}: {
  onInsert: (s: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {SYMBOLS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onInsert(s)}
          disabled={disabled}
          className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-40"
          title={`插入 ${s}`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
