import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Comment } from "@/types";
import { getTimelineData } from "@/lib/timeline";
import { Calendar, RefreshCw } from "lucide-react";

interface Props {
  comments: Comment[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

const spring = { type: "spring" as const, stiffness: 400, damping: 20 };

const TIME_RANGES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "MAX"];

export function SentimentTimeline({ comments, selectedDate, onSelectDate }: Props) {
  const [timeRange, setTimeRange] = useState("1D");

  const filteredComments = useMemo(() => {
    if (timeRange === "MAX" || !comments || comments.length === 0) return comments;
    
    const times = comments.map(c => new Date(c.publishedAt).getTime()).filter(t => !isNaN(t));
    if (times.length === 0) return comments;
    const now = new Date(Math.max(...times));
    
    const cutoff = new Date(now.getTime());
    switch (timeRange) {
      case "1D": cutoff.setDate(cutoff.getDate() - 1); break;
      case "5D": cutoff.setDate(cutoff.getDate() - 5); break;
      case "1M": cutoff.setMonth(cutoff.getMonth() - 1); break;
      case "6M": cutoff.setMonth(cutoff.getMonth() - 6); break;
      case "YTD":
        cutoff.setMonth(0); 
        cutoff.setDate(1);  
        break;
      case "1Y": cutoff.setFullYear(cutoff.getFullYear() - 1); break;
    }
    
    return comments.filter(c => new Date(c.publishedAt).getTime() >= cutoff.getTime());
  }, [comments, timeRange]);
  
  const { data, bucketType } = getTimelineData(filteredComments, timeRange);

  const formatXAxis = (tickItem: string) => {
    if (!tickItem) return "";

    let d = new Date(tickItem);
    
    if (isNaN(d.getTime())) {
       let cleanTick = tickItem;
       if (cleanTick.startsWith("Wk ")) cleanTick = cleanTick.substring(3);
       
       if (cleanTick.includes(" ")) {
         // "2026-05-21 13:00" -> "2026-05-21T13:00:00"
         cleanTick = cleanTick.replace(" ", "T") + ":00";
       } else if (cleanTick.length === 10) {
         // "2026-05-21" -> "2026-05-21T00:00:00"
         cleanTick += "T00:00:00";
       } else if (cleanTick.length === 7) {
         // "2026-05" -> "2026-05-01T00:00:00"
         cleanTick += "-01T00:00:00";
       }
       
       d = new Date(cleanTick);
    }
    
    if (isNaN(d.getTime())) {
      if (tickItem.includes(" ")) return tickItem.split(" ")[1];
      return tickItem;
    }
    
    switch (bucketType) {
      case "hour":
        // Format: "16.00"
        return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", ".");
      case "day":
        // Format: "19 May"
        return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      case "month":
        if (timeRange === "MAX") {
          return d.getFullYear().toString();
        }
        // Format: "Feb 2026"
        return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      default:
        return d.getFullYear().toString();
    }
  };

  if (data.length === 0) return null;

  interface ChartClickState {
    activeLabel?: string | number;
    activePayload?: { value: number; name: string }[];
  }

  const handleChartClick = (state: ChartClickState) => {
    if (state && state.activeLabel != null) {
      const label = String(state.activeLabel);
      onSelectDate(selectedDate === label ? null : label);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.4 }}
      className="rounded-[2.5rem] border border-border/40 bg-card/40 p-6 backdrop-blur-md shadow-2xl shadow-primary/5 space-y-6"
    >
      <div className="flex flex-col gap-4">
        {}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/80">
                Sentiment Timeline
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium pl-9">
              Click on any data point on the chart to filter comments by that time period.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border/50 bg-background/50 p-1">
            {TIME_RANGES.map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  timeRange === range
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 self-start sm:self-center"
          >
            <span className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-black text-primary">
              Filtering: {selectedDate}
            </span>
            <button
              onClick={() => onSelectDate(null)}
              className="rounded-xl border border-border bg-background hover:bg-muted p-1.5 transition-colors"
              title="Clear filter"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </div>

      <div className="h-70 w-full rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          
          <LineChart data={data} onClick={handleChartClick} className="cursor-pointer">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.2} />
            <XAxis
              dataKey="dateLabel"
              tickFormatter={formatXAxis}
              tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--chart-tick))" }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--chart-tick))" }}
              axisLine={false}
              tickLine={false}
              dx={-5}
            />
            {}
            <Tooltip
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid hsl(var(--chart-tooltip-border))",
                background: "hsl(var(--chart-tooltip-bg) / 0.9)",
                color: "hsl(var(--chart-tooltip-text))",
                fontSize: "12px",
                fontWeight: "700",
                backdropFilter: "blur(8px)",
              }}
              itemStyle={{ color: "hsl(var(--chart-tooltip-text))" }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--muted-foreground)",
              }}
            />
            
            <Line
              type="monotone"
              dataKey="positive"
              name="Positive"
              stroke="var(--color-emerald-500)"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 0, fill: "var(--color-emerald-500)" }}
              activeDot={{ r: 6, strokeWidth: 0, fill: "var(--color-emerald-500)" }}
            />
            
            <Line
              type="monotone"
              dataKey="neutral"
              name="Neutral"
              stroke="var(--color-amber-500)"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 0, fill: "var(--color-amber-500)" }}
              activeDot={{ r: 6, strokeWidth: 0, fill: "var(--color-amber-500)" }}
            />
            
            <Line
              type="monotone"
              dataKey="negative"
              name="Negative"
              stroke="var(--color-rose-500)"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 0, fill: "var(--color-rose-500)" }}
              activeDot={{ r: 6, strokeWidth: 0, fill: "var(--color-rose-500)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
