import type { AnalysisResponse, AnalyzedVideo } from "@/types";

const STORAGE_KEY = "NeuroTube_history";

const FETCHER_API = (import.meta.env.VITE_FETCHER_API_URL || "http://localhost:8080") + "/api";
const ML_API = (import.meta.env.VITE_ML_API_URL || "http://localhost:8000") + "/api";

// ── Public API ───────────────────────────────────────────────────────────────

export async function submitAnalysisJob(url: string): Promise<{ jobId: string; status: string; message: string }> {
  const response = await fetch(`${FETCHER_API}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to submit analysis job");
  }
  return response.json();
}

export async function getJobStatus(jobId: string): Promise<{ status: string; message: string }> {
  const response = await fetch(`${FETCHER_API}/status/${jobId}`);
  if (!response.ok) {
    throw new Error("Failed to get job status");
  }
  return response.json();
}

export async function getAnalysisResults(jobId: string): Promise<AnalysisResponse> {
  const response = await fetch(`${ML_API}/analysis/${jobId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to get analysis results");
  }
  const data = await response.json();
  if (data.status !== "completed") {
      throw new Error(`Analysis not completed. Status: ${data.status}`);
  }
  return data as AnalysisResponse;
}

export async function getAnalysisByVideo(videoId: string): Promise<AnalysisResponse> {
    const response = await fetch(`${ML_API}/analysis/video/${videoId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || "Failed to get analysis results");
    }
    const data = await response.json();
    if (data.status !== "completed") {
        throw new Error(`Analysis not completed. Status: ${data.status}`);
    }
    return data as AnalysisResponse;
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:v=|\/v\/|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

// ── History (API + localStorage fallback) ───────────────────────────────────────────────────

export async function fetchHistory(limit = 20): Promise<AnalyzedVideo[]> {
    try {
        const response = await fetch(`${ML_API}/history?limit=${limit}`);
        if (!response.ok) throw new Error("Failed to fetch history from server");
        const data = await response.json();
        
        // Sync to local storage just in case
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        return data;
    } catch (err) {
        console.warn("Failed to fetch history from server, falling back to local storage", err);
        return getLocalHistory();
    }
}

export function getLocalHistory(): AnalyzedVideo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(video: AnalyzedVideo): void {
  const history = getLocalHistory();
  const exists = history.findIndex((v) => v.videoId === video.videoId);
  if (exists !== -1) {
    history.splice(exists, 1);
  }
  history.unshift(video);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function deleteHistoryFromServer(): Promise<void> {
  const response = await fetch(`${ML_API}/history`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to clear history on server");
  }
  clearHistory();
}
