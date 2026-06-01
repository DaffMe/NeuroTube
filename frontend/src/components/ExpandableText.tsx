import { useState, useRef, useEffect } from "react";

interface ExpandableTextProps {
  text: string;
  limit?: number;
  lineLimit?: number;
  className?: string;
  buttonClassName?: string;
}

export function ExpandableText({ 
  text, 
  limit, 
  lineLimit,
  className = "", 
  buttonClassName = "" 
}: ExpandableTextProps) {
  const isLineBased = typeof lineLimit === "number";

  // Deterministically initialize overflow state to prevent layout jumps during transitions
  const [hasOverflow, setHasOverflow] = useState(() => {
    if (isLineBased) {
      const lines = text.split("\n");
      let estimatedLines = 0;
      const charsPerLine = 75; // average characters per line for text-xs in comment container
      for (const line of lines) {
        estimatedLines += Math.max(1, Math.ceil(line.length / charsPerLine));
      }
      return estimatedLines > lineLimit || text.length > 300;
    }
    return text.length > (limit ?? 200);
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!isLineBased) return;

    const el = textRef.current;
    if (!el) return;

    const checkOverflow = () => {
      if (!isExpanded) {
        // Defer to next animation frame to let Framer Motion transitions/fonts settle
        requestAnimationFrame(() => {
          if (el) {
            setHasOverflow(el.scrollHeight > el.clientHeight);
          }
        });
      }
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, isExpanded, isLineBased]);

  const charLimit = limit ?? 200;
  const shouldTruncateChar = !isLineBased && text.length > charLimit;
  
  const displayedText = isExpanded || isLineBased || !shouldTruncateChar 
    ? text 
    : text.slice(0, charLimit) + "...";

  const showButton = isLineBased ? hasOverflow : shouldTruncateChar;

  const lineClampStyle = isLineBased && !isExpanded
    ? {
        display: "-webkit-box",
        WebkitLineClamp: lineLimit,
        WebkitBoxOrient: "vertical" as const,
        overflow: "hidden",
      }
    : undefined;

  return (
    <div className="space-y-1">
      <p 
        ref={textRef}
        style={lineClampStyle}
        className={`${className} whitespace-pre-wrap text-wrap`}
      >
        {displayedText}
      </p>
      {showButton && (
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
