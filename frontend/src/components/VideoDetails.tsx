import { motion } from "framer-motion";
import { Eye, ThumbsUp, MessageCircle, Calendar, ExternalLink } from "lucide-react";
import type { VideoInfo } from "@/types";
import { ExpandableText } from "./ExpandableText";

const spring = { type: "spring" as const, stiffness: 400, damping: 20 };

interface Props {
  video: VideoInfo;
}

export function VideoDetails({ video }: Props) {
  const stats = [
    { icon: Eye, label: "Views", value: video.viewCount },
    { icon: ThumbsUp, label: "Likes", value: video.likeCount },
    { icon: MessageCircle, label: "Comments", value: video.commentCount },
    {
      icon: Calendar,
      label: "Published",
      value: new Date(video.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.1 }}
      className="overflow-hidden rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
      </div>

      {/* Info */}
      <div className="space-y-4 p-5">
        <div>
          <motion.h2
            className="text-lg font-bold leading-snug"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {video.title}
          </motion.h2>
          <motion.a
            href={`https://youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
            whileHover={{ x: 3 }}
            transition={spring}
          >
            {video.channelTitle}
            <ExternalLink className="h-3 w-3" />
          </motion.a>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap gap-2">
          {stats.map(({ icon: Icon, label, value }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring, delay: 0.25 + i * 0.07 }}
              whileHover={{ scale: 1.08, y: -2 }}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-semibold">{value}</span>
            </motion.div>
          ))}
        </div>

        {/* Description */}
        {video.description && (
          <div className="rounded-2xl bg-secondary/30 p-4">
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
              Description
            </h3>
            <ExpandableText 
              text={video.description} 
              lineLimit={4}
              className="text-xs leading-relaxed text-muted-foreground/90 font-medium"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
