import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ChevronDown, ChevronUp, Filter, Search as SearchIcon, Edit2, Trash2, Send } from "lucide-react";
import type { Comment } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExpandableText } from "./ExpandableText";
import { getTimelineData } from "@/lib/timeline";
import { addComment, updateComment, deleteComment } from "@/services/api";
import { sequentialSearch, binarySearch, selectionSortByLength, insertionSortBySentiment } from "@/lib/algorithms";

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
  onEdit: (commentId: string, newText: string) => void;
  onDelete: (commentId: string) => void;
}

function CommentItem({ comment, replies = [], isReply = false, onEdit, onDelete }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.textDisplay);
  
  const hasReplies = replies.length > 0;
  const authorName = comment.authorDisplayName || "User";
  const cleanName = authorName.startsWith("@") ? authorName.slice(1) : authorName;
  const initial = cleanName.charAt(0).toUpperCase() || "?";
  
  const avatarColors = [
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 ring-pink-500/20",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 ring-purple-500/20",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 ring-indigo-500/20",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 ring-rose-500/20",
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 ring-violet-500/20",
  ];
  
  const hash = cleanName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorClass = avatarColors[hash % avatarColors.length];
  
  // Deteksi komentar manual (bukan dari YouTube API) untuk menampilkan tombol Edit/Delete
  const isManual = comment.id.startsWith("manual_");

  const handleSaveEdit = () => {
    if (!editValue.trim()) return;
    onEdit(comment.id, editValue);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`group flex gap-3 rounded-2xl p-3 transition-colors hover:bg-muted/30 ${
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
          <div className="flex items-center justify-between">
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
            
            {/* Action Buttons for Manual Comments */}
            {isManual && !isEditing && (
              <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                <button onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-primary transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete(comment.id)} className="text-muted-foreground hover:text-rose-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          
          {isEditing ? (
            <div className="mt-2 flex gap-2">
              <Input 
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-8 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") setIsEditing(false);
                }}
              />
              <Button size="sm" onClick={handleSaveEdit} className="h-8 px-3 text-xs">Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-8 px-3 text-xs">Cancel</Button>
            </div>
          ) : (
            <ExpandableText 
              text={comment.textOriginal || comment.textDisplay} 
              lineLimit={4}
              className="mt-1 text-xs leading-relaxed text-foreground/90 font-medium break-words whitespace-pre-wrap"
            />
          )}
          
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
                className="flex items-center gap-2 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors py-1"
              >
                {showReplies ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
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
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                isReply 
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Props {
  videoId: string;
  comments: Comment[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

const PAGE_SIZE = 10;

export function CommentSection({ videoId, comments: initialComments, selectedDate, onSelectDate }: Props) {
  const [filter, setFilter] = useState<"all" | "positive" | "neutral" | "negative">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState(true);
  
  // Local state untuk menyimpan seluruh komentar secara dinamis agar bisa melakukan aksi CRUD di antarmuka pengguna tanpa memuat ulang API
  const [localComments, setLocalComments] = useState<Comment[]>(initialComments);

  // Search and Sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"sequential" | "binary">("sequential");
  const [sortMode, setSortMode] = useState<"none" | "lengthDesc" | "lengthAsc" | "sentiment">("none");

  // Add Comment Form State
  const [newCommentName, setNewCommentName] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prevInitialComments, setPrevInitialComments] = useState(initialComments);

  // Sync initial comments when props change (like selecting a new video)
  if (initialComments !== prevInitialComments) {
    setPrevInitialComments(initialComments);
    setLocalComments(initialComments);
  }

  // CRUD Handlers
  const handleAddComment = async () => {
    if (!newCommentName.trim() || !newCommentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const newComment = await addComment(videoId, newCommentName, newCommentText);
      setLocalComments(prev => [newComment, ...prev]);
      setNewCommentName("");
      setNewCommentText("");
    } catch (err) {
      console.error(err);
      alert("Failed to add comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string, newText: string) => {
    try {
      const updatedComment = await updateComment(commentId, newText);
      setLocalComments(prev => prev.map(c => c.id === commentId ? { ...c, ...updatedComment } : c));
    } catch (err) {
      console.error(err);
      alert("Failed to update comment.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setLocalComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete comment.");
    }
  };

  const groupedComments = useMemo(() => {
    const { getBucketKey } = getTimelineData(localComments);
    
    let processed = selectedDate
      ? localComments.filter((c) => getBucketKey(c.publishedAt) === selectedDate)
      : localComments;

    // Apply Search Algorithm (Requirement C)
    if (searchQuery.trim()) {
      if (searchMode === "sequential") {
        processed = sequentialSearch(processed, searchQuery);
      } else if (searchMode === "binary") {
        processed = binarySearch(processed, searchQuery);
      }
    }

    let main = processed.filter(c => !c.isReply);
    
    // Apply Sort Algorithm (Requirement D)
    if (sortMode === "lengthDesc") {
      main = selectionSortByLength(main, "desc");
    } else if (sortMode === "lengthAsc") {
      main = selectionSortByLength(main, "asc");
    } else if (sortMode === "sentiment") {
      main = insertionSortBySentiment(main);
    }

    const repliesMap: Record<string, Comment[]> = {};
    processed.forEach(c => {
      if (c.isReply && c.parentId) {
        if (!repliesMap[c.parentId]) repliesMap[c.parentId] = [];
        repliesMap[c.parentId].push(c);
      }
    });

    const filteredMain = filter === "all" ? main : main.filter((c) => c.sentiment === filter);
    
    return {
      main: filteredMain,
      repliesMap
    };
  }, [localComments, filter, selectedDate, searchQuery, searchMode, sortMode]);

  const visible = groupedComments.main.slice(0, visibleCount);
  const hasMore = visibleCount < groupedComments.main.length;

  const dateComments = useMemo(() => {
    if (!selectedDate) return localComments;
    const { getBucketKey } = getTimelineData(localComments);
    return localComments.filter((c) => getBucketKey(c.publishedAt) === selectedDate);
  }, [localComments, selectedDate]);

  const filters = [
    { key: "all" as const, label: "All", count: dateComments.filter(c => !c.isReply).length },
    { key: "positive" as const, label: "Positive", count: dateComments.filter((c) => !c.isReply && c.sentiment === "positive").length },
    { key: "neutral" as const, label: "Neutral", count: dateComments.filter((c) => !c.isReply && c.sentiment === "neutral").length },
    { key: "negative" as const, label: "Negative", count: dateComments.filter((c) => !c.isReply && c.sentiment === "negative").length },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.45 }}
      className="rounded-[2.5rem] border border-border/40 bg-card/40 backdrop-blur-md shadow-2xl shadow-primary/5"
    >
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
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
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
            {selectedDate && (
              <div className="mx-6 mb-4 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-semibold text-primary">
                <span>Showing comments from <strong>{selectedDate}</strong></span>
                <button
                  onClick={() => onSelectDate(null)}
                  className="rounded-xl border border-primary/30 px-3 py-1 bg-background hover:bg-muted text-primary text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Show All Dates
                </button>
              </div>
            )}

            {/* --- ADD NEW COMMENT FORM --- */}
            <div className="px-6 mb-6">
              <div className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-background/50 p-4">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Add Manual Comment</div>
                <Input 
                  placeholder="Your Name" 
                  value={newCommentName} 
                  onChange={e => setNewCommentName(e.target.value)} 
                  className="h-10 text-sm bg-background"
                />
                <div className="flex gap-2">
                  <Input 
                    placeholder="Type your comment here..." 
                    value={newCommentText} 
                    onChange={e => setNewCommentText(e.target.value)} 
                    className="h-10 text-sm bg-background"
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  />
                  <Button onClick={handleAddComment} disabled={isSubmitting} className="h-10 px-4 shrink-0">
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </div>

            {/* --- SEARCH & SORT CONTROLS --- */}
            <div className="px-6 mb-6 flex flex-col sm:flex-row gap-4">
              {/* Search Control */}
              <div className="flex-1 flex gap-2 rounded-xl border border-border/50 bg-background/50 p-1 pl-3 items-center">
                <SearchIcon className="w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search comments..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-sm focus:outline-none"
                />
                <select 
                  value={searchMode} 
                  onChange={(e) => setSearchMode(e.target.value as "sequential" | "binary")}
                  className="text-xs border-l border-border pl-2 pr-1 py-2 bg-transparent text-muted-foreground focus:outline-none cursor-pointer"
                >
                  <option value="sequential">Sequential Search</option>
                  <option value="binary">Binary Search</option>
                </select>
              </div>
              
              {/* Sort Control */}
              <select 
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as "none" | "lengthDesc" | "lengthAsc" | "sentiment")}
                className="rounded-xl border border-border/50 bg-background/50 px-4 py-2 text-sm focus:outline-none cursor-pointer text-muted-foreground"
              >
                <option value="none">Default Sort</option>
                <option value="lengthDesc">Sort: Longest Text (Selection)</option>
                <option value="lengthAsc">Sort: Shortest Text (Selection)</option>
                <option value="sentiment">Sort: Sentiment Level (Insertion)</option>
              </select>
            </div>

            <div className="flex gap-2 overflow-x-auto px-6 pb-6 no-scrollbar">
              {filters.map(({ key, label, count }) => (
                <motion.button
                  key={key}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setFilter(key); setVisibleCount(PAGE_SIZE); }}
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

            <div className="space-y-4 px-6 pb-8">
              {visible.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No comments found.
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {visible.map((comment) => (
                    <CommentItem 
                      key={comment.id} 
                      comment={comment} 
                      replies={groupedComments.repliesMap[comment.id]} 
                      onEdit={handleEditComment}
                      onDelete={handleDeleteComment}
                    />
                  ))}
                </AnimatePresence>
              )}

              {hasMore && (
                <div className="pt-6 text-center">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="rounded-4xl px-8 py-6 text-xs font-black uppercase tracking-widest border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all active:scale-95"
                  >
                    Load more ({groupedComments.main.length - visibleCount} remaining)
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
