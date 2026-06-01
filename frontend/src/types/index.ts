export interface VideoInfo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  description: string;
}

export interface Comment {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  textOriginal: string;
  likeCount: number;
  publishedAt: string;
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number;
  isReply: boolean;
  parentId?: string;
}

export interface TopicCluster {
  topic: string;
  summary: string;
  keywords: string[];
  quotes: string[];
}

export interface SentimentResult {
  positive: number;
  negative: number;
  neutral: number;
  totalComments: number;
  averageScore: number;
  topicsPositive?: TopicCluster[];
  topicsNegative?: TopicCluster[];
}


export interface AnalyzedVideo {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  analyzedAt: string;
  sentimentResult: SentimentResult;
}

export interface AnalysisResponse {
  videoInfo: VideoInfo;
  comments: Comment[];
  sentimentResult: SentimentResult;
}
