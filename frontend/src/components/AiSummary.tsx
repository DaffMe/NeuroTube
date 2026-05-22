import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ThumbsUp, ThumbsDown, Quote, ChevronDown, ChevronUp } from "lucide-react";
import type { TopicCluster } from "@/types";

interface Props {
  topicsPositive?: TopicCluster[];
  topicsNegative?: TopicCluster[];
}

const spring = { type: "spring" as const, stiffness: 400, damping: 20 };

function TopicCard({ topic, type }: { topic: TopicCluster; type: "positive" | "negative" }) {
  const [expanded, setExpanded] = useState(false);

  const isPositive = type === "positive";
  const accentClass = isPositive ? "text-emerald-500" : "text-rose-500";
  const bgAccentClass = isPositive ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20";
  const pillClass = isPositive 
    ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10 hover:bg-emerald-500/10" 
    : "bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/10 hover:bg-rose-500/10";

  return (
    <motion.div
      layout
      className={`rounded-2xl border bg-card/50 p-4 transition-colors hover:bg-card/75 backdrop-blur-sm ${
        isPositive ? "border-emerald-500/25" : "border-rose-500/25"
      }`}
    >
      <div
        className="flex items-start justify-between gap-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-black tracking-tight ${accentClass}`}>
              {topic.topic}
            </span>
          </div>
          <p className="text-xs text-foreground/90 font-medium leading-relaxed">
            {topic.summary}
          </p>
        </div>
        <div className={`h-8 w-8 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
          isPositive ? "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" : "border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
        }`}>
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Keywords */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {topic.keywords.map((kw, i) => (
          <span
            key={i}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold transition-all ${pillClass}`}
          >
            #{kw}
          </span>
        ))}
      </div>

      {/* Expanded Direct Quotes */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-4 space-y-3 pt-3 border-t border-border/50"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">
              Representative Quotes
            </p>
            {topic.quotes.map((quote, i) => (
              <div
                key={i}
                className={`relative pl-7 pr-3 py-2.5 rounded-xl border text-xs leading-relaxed text-foreground/80 font-medium ${bgAccentClass}`}
              >
                <Quote className={`absolute left-2.5 top-3 h-3.5 w-3.5 opacity-40 ${accentClass}`} />
                <p className="italic">"{quote}"</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AiSummary({ topicsPositive = [], topicsNegative = [] }: Props) {
  const hasPositive = topicsPositive.length > 0;
  const hasNegative = topicsNegative.length > 0;

  if (!hasPositive && !hasNegative) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.38 }}
      className="rounded-[2.5rem] border border-border/40 bg-card/40 p-6 backdrop-blur-md shadow-2xl shadow-primary/5 space-y-6"
    >
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/80">
          AI Summary & Topic Clustering
        </h3>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Positive Topics Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-2">
            <ThumbsUp className="h-4 w-4 text-emerald-500" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">
              Positive Themes
            </h4>
          </div>
          {hasPositive ? (
            <div className="space-y-3">
              {topicsPositive.map((topic, i) => (
                <TopicCard key={i} topic={topic} type="positive" />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic pl-1">
              No prominent positive themes extracted.
            </p>
          )}
        </div>

        {/* Negative Topics Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-rose-500/10 pb-2">
            <ThumbsDown className="h-4 w-4 text-rose-500" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-rose-500 dark:text-rose-400">
              Negative Themes
            </h4>
          </div>
          {hasNegative ? (
            <div className="space-y-3">
              {topicsNegative.map((topic, i) => (
                <TopicCard key={i} topic={topic} type="negative" />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic pl-1">
              No prominent negative themes extracted.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
