import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SentimentResult } from "@/types";

const spring = { type: "spring" as const, stiffness: 400, damping: 20 };

interface Props {
  label: string;
  value: number;
  total: number;
  type: "positive" | "negative" | "neutral";
  delay?: number;
}

const config = {
  positive: {
    icon: TrendingUp,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    bar: "bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500",
    glow: "shadow-emerald-500/20",
  },
  negative: {
    icon: TrendingDown,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    bar: "bg-gradient-to-r from-rose-500 to-rose-600 dark:from-rose-400 dark:to-rose-500",
    glow: "shadow-rose-500/20",
  },
  neutral: {
    icon: Minus,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    bar: "bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500",
    glow: "shadow-amber-500/20",
  },
};

export function StatBlock({ label, value, total, type, delay = 0 }: Props) {
  const { icon: Icon, color, bg, bar, glow } = config[type];
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, delay }}
      whileHover={{ scale: 1.04, y: -4 }}
      className={`rounded-2xl border border-border/50 ${bg} p-4 shadow-lg ${glow} backdrop-blur-sm cursor-pointer`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
            {label}
          </span>
        </div>
        <span className={`text-xl font-black ${color} drop-shadow-sm`}>{percentage}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 overflow-hidden rounded-full bg-muted/50">
        <motion.div
          className={`h-full rounded-full ${bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: delay + 0.3 }}
        />
      </div>

      <p className="mt-2 text-right text-[10px] font-bold text-foreground/60 uppercase tracking-tighter">
        {label} count : {value}
      </p>
    </motion.div>
  );
}

// ── Summary Panel ────────────────────────────────────────────────────────────

export function SentimentSummary({ result }: { result: SentimentResult }) {
  const { positive, negative, neutral, totalComments, averageScore } = result;
  const emoji = averageScore > 0.2 ? "😊" : averageScore < -0.2 ? "😟" : "😐";
  const label =
    averageScore > 0.2
      ? "Mostly Positive"
      : averageScore < -0.2
        ? "Mostly Negative"
        : "Mixed / Neutral";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.2 }}
      className="space-y-4"
    >
      {/* Overall badge */}
      <motion.div
        className="flex items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 cursor-pointer"
        whileHover={{ scale: 1.02 }}
        transition={spring}
      >
        <motion.span
          className="text-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
        >
          {emoji}
        </motion.span>
        <div>
          <p className="text-lg font-bold">{label}</p>
          <p className="text-xs text-muted-foreground">
            Average score: {averageScore.toFixed(3)} · {totalComments} comments analyzed
          </p>
        </div>
      </motion.div>

      {/* Stat blocks grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatBlock label="Positive" value={positive} total={totalComments} type="positive" delay={0.3} />
        <StatBlock label="Neutral" value={neutral} total={totalComments} type="neutral" delay={0.4} />
        <StatBlock label="Negative" value={negative} total={totalComments} type="negative" delay={0.5} />
      </div>
    </motion.div>
  );
}
