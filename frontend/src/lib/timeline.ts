import type { Comment } from "@/types";

export interface TimelineBucket {
  dateLabel: string;
  positive: number;
  neutral: number;
  negative: number;
  timestamp: number;
}

export function getTimelineData(comments: Comment[], timeRange: string = "MAX") {
  if (!comments || comments.length === 0) return { data: [], bucketType: "day" as const, getBucketKey: () => "" };

  // Parse publish times
  const times = comments
    .map((c) => new Date(c.publishedAt).getTime())
    .filter((t) => !isNaN(t));
  if (times.length === 0) return { data: [], bucketType: "day" as const, getBucketKey: () => "" };

  let bucketType: "hour" | "day" | "month" | "year" = "day";
  switch (timeRange) {
    case "1D":
      bucketType = "hour";
      break;
    case "5D":
    case "1M":
      bucketType = "day";
      break;
    case "6M":
    case "YTD":
    case "1Y":
      bucketType = "month";
      break;
    case "MAX":
    default:
      bucketType = "year";
      break;
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
    } else if (bucketType === "month") {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      return `${yr}-${mo}`;
    } else {
      return `${d.getFullYear()}`;
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
      } else if (bucketType === "month") {
        bucketDate.setDate(1);
        bucketDate.setHours(0, 0, 0, 0);
      } else {
        bucketDate.setMonth(0, 1);
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
