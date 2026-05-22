import type { Comment } from "@/types";

export interface TimelineBucket {
  dateLabel: string;
  positive: number;
  neutral: number;
  negative: number;
  timestamp: number;
}

export function getTimelineData(comments: Comment[]) {
  if (!comments || comments.length === 0) return { data: [], bucketType: "day" as const, getBucketKey: () => "" };

  // Parse publish times
  const times = comments
    .map((c) => new Date(c.publishedAt).getTime())
    .filter((t) => !isNaN(t));
  if (times.length === 0) return { data: [], bucketType: "day" as const, getBucketKey: () => "" };

  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const diffMs = maxTime - minTime;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  let bucketType: "hour" | "day" | "week" | "month" = "day";
  if (diffDays < 2) {
    bucketType = "hour";
  } else if (diffDays < 30) {
    bucketType = "day";
  } else if (diffDays < 180) {
    bucketType = "week";
  } else {
    bucketType = "month";
  }

  // Get bucket key for a date
  const getBucketKey = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Unknown";

    if (bucketType === "hour") {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const dy = String(d.getDate()).padStart(2, "0");
      const hr = String(d.getHours()).padStart(2, "0");
      return `${yr}-${mo}-${dy} ${hr}:00`;
    } else if (bucketType === "day") {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const dy = String(d.getDate()).padStart(2, "0");
      return `${yr}-${mo}-${dy}`;
    } else if (bucketType === "week") {
      // Get the Monday of the week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.getTime());
      monday.setDate(diff);
      const yr = monday.getFullYear();
      const mo = String(monday.getMonth() + 1).padStart(2, "0");
      const dy = String(monday.getDate()).padStart(2, "0");
      return `Wk ${yr}-${mo}-${dy}`;
    } else {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      return `${yr}-${mo}`;
    }
  };

  // Group comments into buckets
  const bucketMap: Record<string, { positive: number; neutral: number; negative: number; timestamp: number }> = {};

  comments.forEach((c) => {
    const key = getBucketKey(c.publishedAt);
    if (key === "Unknown") return;

    if (!bucketMap[key]) {
      const bucketDate = new Date(c.publishedAt);
      if (bucketType === "hour") {
        bucketDate.setMinutes(0, 0, 0);
      } else if (bucketType === "day") {
        bucketDate.setHours(0, 0, 0, 0);
      } else if (bucketType === "week") {
        const day = bucketDate.getDay();
        const diff = bucketDate.getDate() - day + (day === 0 ? -6 : 1);
        bucketDate.setDate(diff);
        bucketDate.setHours(0, 0, 0, 0);
      } else {
        bucketDate.setDate(1);
        bucketDate.setHours(0, 0, 0, 0);
      }

      bucketMap[key] = {
        positive: 0,
        neutral: 0,
        negative: 0,
        timestamp: bucketDate.getTime(),
      };
    }
    bucketMap[key][c.sentiment]++;
  });

  // Sort buckets chronologically
  const sortedData: TimelineBucket[] = Object.entries(bucketMap)
    .map(([dateLabel, counts]) => ({
      dateLabel,
      ...counts,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return { data: sortedData, bucketType, getBucketKey };
}
