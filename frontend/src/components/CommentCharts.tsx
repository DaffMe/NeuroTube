import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { SentimentResult } from "@/types";

const spring = { type: "spring" as const, stiffness: 400, damping: 20 };

interface Props {
  result: SentimentResult;
}

export function CommentCharts({ result }: Props) {
  const pieData = [
    { name: "Positive", value: result.positive, fill: "var(--color-emerald-500)" },
    { name: "Neutral", value: result.neutral, fill: "var(--color-amber-500)" },
    { name: "Negative", value: result.negative, fill: "var(--color-rose-500)" },
  ];

  const barData = [
    { name: "Positive", count: result.positive, fill: "var(--color-emerald-500)" },
    { name: "Neutral", count: result.neutral, fill: "var(--color-amber-500)" },
    { name: "Negative", count: result.negative, fill: "var(--color-rose-500)" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.35 }}
      className="space-y-6"
    >
      <h3 className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
        Sentiment Distribution
      </h3>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart */}
        <motion.div
          className="flex flex-col items-center rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm cursor-pointer"
          whileHover={{ scale: 1.02 }}
          transition={spring}
        >
          <p className="mb-2 text-[10px] font-black text-foreground/60 uppercase tracking-widest">Proportion</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                animationBegin={400}
                animationDuration={800}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                ))}
              </Pie>
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
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-2 flex gap-4">
            {pieData.map(({ name, fill }) => (
              <div key={name} className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fill }} />
                {name}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bar Chart */}
        <motion.div
          className="flex flex-col items-center rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm cursor-pointer"
          whileHover={{ scale: 1.02 }}
          transition={spring}
        >
          <p className="mb-2 text-[10px] font-black text-foreground/60 uppercase tracking-widest">Count</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--chart-tick))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--chart-tick))" }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
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
              <Bar
                dataKey="count"
                radius={[8, 8, 0, 0]}
                animationBegin={400}
                animationDuration={800}
              >
                {barData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </motion.div>
  );
}
