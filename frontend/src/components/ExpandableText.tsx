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
  const [isExpanded, setIsExpanded] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const isLineBased = typeof lineLimit === "number";

  useEffect(() => {
    if (!isLineBased) return;

    const el = textRef.current;
    if (!el) return;

    const checkOverflow = () => {
      if (!isExpanded) {
        setHasOverflow(el.scrollHeight > el.clientHeight);
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
        className={`${className} whitespace-pre-wrap break-words`}
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
