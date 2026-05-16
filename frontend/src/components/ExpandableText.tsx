import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ExpandableTextProps {
  text: string;
  limit?: number;
  className?: string;
  buttonClassName?: string;
}

export function ExpandableText({ 
  text, 
  limit = 200, 
  className = "", 
  buttonClassName = "" 
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = text.length > limit;
  
  const displayedText = isExpanded || !shouldTruncate 
    ? text 
    : text.slice(0, limit) + "...";

  return (
    <div className="space-y-1">
      <p className={`${className} whitespace-pre-wrap`}>
        {displayedText}
      </p>
      {shouldTruncate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className={`text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors cursor-pointer ${buttonClassName}`}
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
