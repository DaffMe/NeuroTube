import { motion } from "framer-motion";

/**
 * Animated skeleton card that mimics the VideoDetails shape while loading.
 * Shows a shimmer animation via a CSS gradient sweep.
 */
export function VideoDetailsSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl animate-pulse"
    >
      {/* Thumbnail placeholder */}
      <div className="aspect-video w-full bg-muted" />

      {/* Info */}
      <div className="space-y-4 p-5">
        {/* Title */}
        <div className="h-6 w-3/4 rounded-lg bg-muted" />
        {/* Channel */}
        <div className="h-4 w-1/3 rounded-lg bg-muted" />
        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 w-20 rounded-full bg-muted" />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Animated skeleton for SentimentSummary + StatBlocks
 */
export function SentimentSummarySkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="space-y-4 animate-pulse"
    >
      {/* Overall badge */}
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4">
        <div className="h-10 w-10 rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-5 w-32 rounded-lg bg-muted" />
          <div className="h-3 w-48 rounded-lg bg-muted" />
        </div>
      </div>

      {/* Stat blocks */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-2">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-6 w-10 rounded bg-muted" />
            <div className="h-2 w-full rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Animated skeleton for charts
 */
export function ChartsSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="space-y-6 animate-pulse"
    >
      <div className="flex items-center justify-center">
        <div className="h-4 w-36 rounded-lg bg-muted" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie skeleton */}
        <div className="flex flex-col items-center rounded-2xl border border-border/50 bg-card/50 p-4">
          <div className="mb-2 h-3 w-20 rounded-lg bg-muted" />
          <div className="h-48 w-full rounded-xl bg-muted" />
          <div className="mt-2 flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 w-12 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
        {/* Bar skeleton */}
        <div className="flex flex-col items-center rounded-2xl border border-border/50 bg-card/50 p-4">
          <div className="mb-2 h-3 w-16 rounded-lg bg-muted" />
          <div className="h-48 w-full rounded-xl bg-muted" />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Animated skeleton for the AI summary section
 */
export function AiSummarySkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="rounded-[2.5rem] border border-border/40 bg-card/40 p-6 backdrop-blur-md shadow-2xl shadow-primary/5 space-y-8 animate-pulse"
    >
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-2xl bg-muted" />
        <div className="h-4 w-48 rounded-lg bg-muted" />
      </div>
      <div className="rounded-2xl border border-border/40 bg-card/20 p-6 min-h-[200px]">
        <div className="flex flex-wrap gap-3 items-center justify-center mt-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-muted" style={{ opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border bg-card/50 p-4 space-y-3">
            <div className="h-4 w-24 rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
              <div className="h-3 w-3/5 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Animated skeleton for comment section
 */
export function CommentSectionSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.45 }}
      className="rounded-[2.5rem] border border-border/40 bg-card/40 backdrop-blur-md shadow-2xl shadow-primary/5 animate-pulse"
    >
      <div className="flex w-full items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-2xl bg-muted" />
          <div className="h-4 w-28 rounded-lg bg-muted" />
        </div>
        <div className="h-8 w-8 rounded-full border border-border/50 bg-muted" />
      </div>
      <div className="space-y-4 px-6 pb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 rounded-2xl p-3">
            <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded-lg bg-muted" />
              <div className="h-3 w-full rounded-lg bg-muted" />
              <div className="h-3 w-3/4 rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
