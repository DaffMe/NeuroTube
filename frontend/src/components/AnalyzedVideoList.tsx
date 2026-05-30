import { motion } from "framer-motion";
import { Trash2, BarChart3, Clock, Video } from "lucide-react";
import type { AnalyzedVideo } from "@/types";
import { clearHistory } from "@/services/api";
import { Button } from "@/components/ui/button";

const spring = { type: "spring" as const, stiffness: 400, damping: 20 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: spring },
};

interface Props {
  history: AnalyzedVideo[];
  onSelect: (video: AnalyzedVideo, jobId: string) => void;
  onClear: () => void;
  onDelete: (videoId: string) => void;
}

export function AnalyzedVideoList({ history, onSelect, onClear, onDelete }: Props) {
  if (history.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.3 }}
        className="mt-12 w-full max-w-2xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Analyses
          </h2>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/40 bg-card/20 p-8 text-center backdrop-blur-sm">
          <div className="rounded-full bg-muted/30 p-3">
            <Video className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            No analyses yet
          </p>
          <p className="text-xs text-muted-foreground/60">
            Paste a YouTube link above to get started
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.3 }}
      className="mt-12 w-full max-w-2xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Analyses
          </h2>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} transition={spring}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearHistory();
              onClear();
            }}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Clear All
          </Button>
        </motion.div>
      </div>

      <motion.div
        className="space-y-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {history.map((video) => (
          <motion.div
            key={video.id}
            variants={itemVariants}
            whileHover={{ scale: 1.01, x: 4 }}
            whileTap={{ scale: 0.99 }}
            transition={spring}
            onClick={() => onSelect(video, video.id)}
            className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-3 text-left backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-card cursor-pointer group"
          >
            <img
              src={video.thumbnail}
              alt={video.title}
              referrerPolicy="no-referrer"
              className="h-12 w-20 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{video.title}</p>
              <p className="text-xs text-muted-foreground">{video.channelTitle}</p>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                <BarChart3 className="h-3 w-3" />
                {video.sentimentResult.totalComments}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                onClick={() => onDelete(video.videoId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
