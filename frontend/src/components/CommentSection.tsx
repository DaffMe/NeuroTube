import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ChevronDown, ChevronUp, Filter } from "lucide-react";
import type { Comment } from "@/types";
import { Button } from "@/components/ui/button";
import { ExpandableText } from "./ExpandableText";
import { getTimelineData } from "@/lib/timeline";

const spring = { type: "spring" as const, stiffness: 400, damping: 20 };

const sentimentBadge = {
  positive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  neutral: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  negative: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

interface CommentItemProps {
  comment: Comment;
  replies?: Comment[];
  isReply?: boolean;
}

function CommentItem({ comment, replies = [], isReply = false }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hasReplies = replies.length > 0;

  const authorName = comment.authorDisplayName || "User";
  const cleanName = authorName.startsWith("@") ? authorName.slice(1) : authorName;
  const initial = cleanName.charAt(0).toUpperCase() || "?";
  
  // Deterministic pastel color palette based on username hash
  const avatarColors = [
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 ring-pink-500/20",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 ring-purple-500/20",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 ring-indigo-500/20",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 ring-rose-500/20",
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 ring-violet-500/20",
  ];
  
  const hash = cleanName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorClass = avatarColors[hash % avatarColors.length];

  return (
    <div className="flex flex-col gap-1">
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`flex gap-3 rounded-2xl p-3 transition-colors hover:bg-muted/30 ${
          isReply ? "ml-1 border-l border-border/50" : ""
        }`}
      >
        {!imgError && comment.authorProfileImageUrl ? (
          <img
            src={comment.authorProfileImageUrl}
            alt={comment.authorDisplayName}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className={`${isReply ? "h-6 w-6" : "h-8 w-8"} shrink-0 rounded-full ring-2 ring-background object-cover`}
          />
        ) : (
          <div
            className={`${
              isReply ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"
            } shrink-0 rounded-full flex items-center justify-center font-bold uppercase ring-2 ring-background ${colorClass}`}
          >
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-semibold tracking-tight ${isReply ? "text-[11px]" : "text-xs"}`}>
              {comment.authorDisplayName}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${sentimentBadge[comment.sentiment]}`}
            >
              {comment.sentiment}
            </span>
          </div>
          <ExpandableText 
            text={comment.textOriginal || comment.textDisplay} 
            lineLimit={4}
            className="mt-1 text-xs leading-relaxed text-foreground/90 font-medium"
          />
          <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground/60 font-semibold">
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {comment.likeCount}
            </div>
          </div>

          {hasReplies && !isReply && (
            <div className="mt-2">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-2 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors py-1 group"
              >
                {showReplies ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                <span className="flex items-center gap-1.5">
                  {showReplies ? "Hide replies" : `View ${replies.length} replies`}
                </span>
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showReplies && hasReplies && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-8 overflow-hidden border-l-2 border-primary/10 pl-4 space-y-1"
          >
            {replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Props {
  comments: Comment[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

const PAGE_SIZE = 10;

export function CommentSection({ comments, selectedDate, onSelectDate }: Props) {
  const [filter, setFilter] = useState<"all" | "positive" | "neutral" | "negative">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState(true);

  // Group comments: Map parentId -> replies
  const groupedComments = useMemo(() => {
    const { getBucketKey } = getTimelineData(comments);
    
    // Filter comments by selectedDate if applicable
    const dateFiltered = selectedDate
      ? comments.filter((c) => getBucketKey(c.publishedAt) === selectedDate)
      : comments;

    const main = dateFiltered.filter(c => !c.isReply);
    const repliesMap: Record<string, Comment[]> = {};
    
    // Replies can belong to main comments that are filtered out or in
    comments.forEach(c => {
      if (c.isReply && c.parentId) {
        if (!repliesMap[c.parentId]) repliesMap[c.parentId] = [];
        repliesMap[c.parentId].push(c);
      }
    });

    // Apply sentiment filtering to main comments
    const filteredMain = filter === "all" ? main : main.filter((c) => c.sentiment === filter);
    
    return {
      main: filteredMain,
      repliesMap
    };
  }, [comments, filter, selectedDate]);

  const visible = groupedComments.main.slice(0, visibleCount);
  const hasMore = visibleCount < groupedComments.main.length;

  const dateComments = useMemo(() => {
    if (!selectedDate) return comments;
    const { getBucketKey } = getTimelineData(comments);
    return comments.filter((c) => getBucketKey(c.publishedAt) === selectedDate);
  }, [comments, selectedDate]);

  const filters = [
    { key: "all" as const, label: "All", count: filteredMain.length },
    { key: "positive" as const, label: "Positive", count: filteredMain.filter(c => c.sentiment === "positive").length },
    { key: "neutral" as const, label: "Neutral", count: filteredMain.filter(c => c.sentiment === "neutral").length },
    { key: "negative" as const, label: "Negative", count: filteredMain.filter(c => c.sentiment === "negative").length },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.45 }}
      className="rounded-[2.5rem] border border-border/40 bg-card/40 backdrop-blur-md shadow-2xl shadow-primary/5"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-6 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/80">
            Comments ({groupedComments.main.length})
          </h3>
        </div>
        <div className="h-8 w-8 rounded-full border border-border/50 flex items-center justify-center hover:bg-muted/50 transition-colors">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            {/* Filter banner when selectedDate is active */}
            {selectedDate && (
              <div className="mx-6 mb-4 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-semibold text-primary">
                <span>
                  Showing comments from <strong>{selectedDate}</strong>
                </span>
                <button
                  onClick={() => onSelectDate(null)}
                  className="rounded-xl border border-primary/30 px-3 py-1 bg-background hover:bg-muted text-primary text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Show All Dates
                </button>
              </div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto px-6 pb-6 no-scrollbar">
              {filters.map(({ key, label, count }) => (
                <motion.button
                  key={key}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setFilter(key);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`shrink-0 rounded-2xl border px-5 py-2.5 text-xs font-black transition-all cursor-pointer ${
                    filter === key
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "border-border/50 bg-background/50 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {label} <span className="ml-1 opacity-60 font-medium">({count})</span>
                </motion.button>
              ))}
            </div>

            {/* Comment list */}
            <div className="space-y-4 px-6 pb-8">
              <AnimatePresence mode="popLayout">
                {visible.map((comment) => (
                  <CommentItem 
                    key={comment.id} 
                    comment={comment} 
                    replies={groupedComments.repliesMap[comment.id]} 
                  />
                ))}
              </AnimatePresence>

              {hasMore && (
                <div className="pt-4 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="text-xs font-semibold text-primary hover:text-primary/80 hover:bg-primary/5 px-4 py-2 rounded-full border border-primary/20 transition-colors"
                  >
                    Load more
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
