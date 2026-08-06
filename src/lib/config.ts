// 全局配置：考试日期、科目结构等
export const EXAM_DATE = "2026-12-19";
export const APP_NAME = "AI 考研助教";

// 备考四阶段（与备考计划一致）
export const PHASES = [
  {
    name: "基础奠基",
    start: "2026-08-01",
    end: "2026-08-31",
    note: "数学一：函数·极限·连续 ｜ 408：数据结构",
  },
  {
    name: "强化提升",
    start: "2026-09-01",
    end: "2026-09-30",
    note: "数学强化 + 408 全面铺开 + 英语真题",
  },
  {
    name: "真题实战",
    start: "2026-10-01",
    end: "2026-10-31",
    note: "近 10 年真题一轮 + 政治启动",
  },
  {
    name: "冲刺押题",
    start: "2026-11-01",
    end: "2026-12-19",
    note: "模拟卷 + 错题回归 + 政治背诵",
  },
];

export type Phase = {
  name: string;
  note: string;
  days_total: number;
  days_left: number;
  percent: number;
};

export function currentPhase(now = new Date()): Phase | null {
  const today = now.toISOString().slice(0, 10);
  for (const p of PHASES) {
    if (today >= p.start && today <= p.end) {
      const total =
        (new Date(p.end).getTime() - new Date(p.start).getTime()) / 86400000 + 1;
      const elapsed =
        (new Date(today).getTime() - new Date(p.start).getTime()) / 86400000 + 1;
      const daysLeft = Math.max(0, Math.round(total - elapsed + 1));
      return {
        name: p.name,
        note: p.note,
        days_total: Math.round(total),
        days_left: daysLeft,
        percent: Math.min(100, Math.round((elapsed / total) * 100)),
      };
    }
  }
  return null;
}

// 科目主题色（课程页 UI）
export const SUBJECT_COLORS: Record<string, { grad: string; text: string; badge: string }> = {
  "数学一": { grad: "from-indigo-500 to-blue-600", text: "text-indigo-600", badge: "bg-indigo-100 text-indigo-700" },
  "408": { grad: "from-emerald-500 to-teal-600", text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  "英语一": { grad: "from-amber-500 to-orange-600", text: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
  "政治": { grad: "from-rose-500 to-pink-600", text: "text-rose-600", badge: "bg-rose-100 text-rose-700" },
};

// 科目树：科目 -> 章节（种子数据用，408 按考纲）
export const SUBJECTS: { name: string; chapters: string[] }[] = [
  {
    name: "数据结构",
    chapters: ["绪论", "线性表", "栈、队列和数组", "串", "树与二叉树", "图", "查找", "排序"],
  },
  {
    name: "操作系统",
    chapters: ["计算机系统概述", "进程与线程", "内存管理", "文件管理", "输入/输出（I/O）管理"],
  },
  {
    name: "计算机组成原理",
    chapters: ["计算机系统概述", "数据的表示和运算", "存储系统", "指令系统", "中央处理器（CPU）", "总线", "输入/输出系统"],
  },
  {
    name: "计算机网络",
    chapters: ["计算机网络概述", "物理层", "数据链路层", "网络层", "传输层", "应用层"],
  },
  {
    name: "数学一",
    chapters: ["函数、极限、连续", "一元函数微分学", "一元函数积分学", "向量代数与空间解析几何", "多元函数微分学", "多元函数积分学", "无穷级数", "常微分方程", "线性代数：行列式与矩阵", "线性代数：向量与线性方程组", "线性代数：特征值与二次型", "概率论：随机变量与分布", "概率论：数字特征与极限定理", "数理统计"],
  },
  {
    name: "英语一",
    chapters: ["词汇", "长难句", "阅读理解", "写作", "翻译与新题型"],
  },
  {
    name: "政治",
    chapters: ["马克思主义基本原理", "毛泽东思想和中国特色社会主义理论", "中国近现代史纲要", "思想道德与法治", "形势与政策"],
  },
];
