import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyzedVideoList } from "@/components/AnalyzedVideoList";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { VideoDetails } from "@/components/VideoDetails";
import { CommentCharts } from "@/components/CommentCharts";
import { CommentSection } from "@/components/CommentSection";
import { SentimentSummary } from "@/components/StatBlock";
import { AiSummary } from "@/components/AiSummary";
import { SentimentTimeline } from "@/components/SentimentTimeline";
import {
  isValidYouTubeUrl,
  submitAnalysisJob,
  getJobStatus,
  getJobStatusStreamUrl,
  getAnalysisResults,
  getAnalysisByVideo,
  fetchHistory,
  getLocalHistory,
  deleteHistoryFromServer,
  deleteVideoFromServer,
} from "@/services/api";
import type { AnalysisResponse, AnalyzedVideo } from "@/types";

const spring = { type: "spring" as const, stiffness: 400, damping: 18 };

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [history, setHistory] = useState<AnalyzedVideo[]>(getLocalHistory());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Fetch history from server on mount
  useEffect(() => {
    fetchHistory().then(setHistory).catch(console.error);
  }, []);

  const handleAnalyze = useCallback(
    async (inputUrl?: string) => {
      const target = inputUrl || url;
      if (!isValidYouTubeUrl(target)) {
        setError("Please enter a valid YouTube URL");
        return;
      }
      setError("");
      setLoading(true);
      setLoadingMessage("Submitting job...");
      setProgress(0);

      try {
        // 1. Submit job
        const jobRes = await submitAnalysisJob(target);
        const jobId = jobRes.jobId;

        // 2. Stream progress via SSE (if not already completed)
        let completed = jobRes.status === "completed";
        if (!completed) {
          try {
            await new Promise<void>((resolve, reject) => {
              const eventSource = new EventSource(getJobStatusStreamUrl(jobId));

              eventSource.onmessage = (event) => {
                try {
                  const data = JSON.parse(event.data);
                  if (typeof data.progress === "number") {
                    setProgress(data.progress);
                  }
                  if (data.message) {
                    setLoadingMessage(data.message);
                  }

                  if (data.status === "completed") {
                    eventSource.close();
                    resolve();
                  } else if (data.status === "failed") {
                    eventSource.close();
                    reject(new Error(data.message || "Analysis failed"));
                  }
                } catch (err) {
                  eventSource.close();
                  reject(err);
                }
              };

              eventSource.onerror = () => {
                eventSource.close();
                reject(new Error("Connection error"));
              };
            });
          } catch (sseErr) {
            console.warn("SSE progress stream failed, falling back to polling...", sseErr);
            // Fallback: poll until completed
            let fallbackCompleted = false;
            while (!fallbackCompleted) {
              await new Promise((r) => setTimeout(r, 2000));
              const statusRes = await getJobStatus(jobId);
              setLoadingMessage(statusRes.message);

              if (statusRes.status === "completed") {
                fallbackCompleted = true;
              } else if (statusRes.status.startsWith("failed")) {
                throw new Error(statusRes.message);
              }
            }
          }
        }

        // 3. Get results
        setLoadingMessage("Fetching results...");
        const data = await getAnalysisResults(jobId);
        setResult(data);
        
        // Refresh history
        const newHistory = await fetchHistory();
        setHistory(newHistory);

      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred during analysis");
      } finally {
        setLoading(false);
        setLoadingMessage("");
        setProgress(undefined);
      }
    },
    [url]
  );

  const handleSample = useCallback(async () => {
    setUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    handleAnalyze("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  }, [handleAnalyze]);

  const handleHistorySelect = useCallback(async (video: AnalyzedVideo) => {
    setError("");
    setLoading(true);
    setLoadingMessage("Loading analysis...");
    try {
      const data = await getAnalysisByVideo(video.videoId);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analysis");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  }, []);

  const handleBack = useCallback(() => {
    setResult(null);
    setUrl("");
    setError("");
    setSelectedDate(null);
  }, []);

  const handleClearHistory = useCallback(async () => {
    try {
      await deleteHistoryFromServer();
      setHistory([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
      // Fallback to just clearing local if server fails
      setHistory([]);
    }
  }, []);

  const handleDeleteVideo = useCallback(async (videoId: string) => {
    try {
      await deleteVideoFromServer(videoId);
      setHistory((prev) => prev.filter((v) => v.videoId !== videoId));
    } catch (err) {
      console.error("Failed to delete video:", err);
    }
  }, []);

  // ── Result View ─────────────────────────────────────────────────────────────
  if (result) {
    return (
      <motion.div
        key="result"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="mx-auto max-w-4xl space-y-6 px-4 py-8"
      >
        {/* Back button */}
        <motion.button
          onClick={handleBack}
          whileHover={{ scale: 1.05, x: -4 }}
          whileTap={{ scale: 0.95 }}
          transition={spring}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          ← New Analysis
        </motion.button>

        <VideoDetails video={result.videoInfo} />
        <SentimentSummary result={result.sentimentResult} />
        <CommentCharts result={result.sentimentResult} />
        <AiSummary
          topicsPositive={result.sentimentResult.topicsPositive}
          topicsNegative={result.sentimentResult.topicsNegative}
        />
        <SentimentTimeline
          comments={result.comments}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
        <CommentSection
          comments={result.comments}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </motion.div>
    );
  }

  // ── Home / Landing View ─────────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="home"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center px-4 py-16"
      >
        {/* Decorative background blobs */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <motion.div
            className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-primary/8 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-20 right-1/4 h-80 w-80 rounded-full bg-accent/8 blur-3xl"
            animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/10 blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Hero */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...spring, delay: 0.15 }}
          className="text-center"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            ML-Powered Sentiment Analysis
          </motion.div>

          <h1 className="mb-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Youtube Comments{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Sentiment Analyzer
            </span>
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            Paste any YouTube link and instantly see what thousands of comments really think.
            Powered by Machine Learning sentiment analysis.
          </p>
        </motion.div>

        {/* Input bar */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...spring, delay: 0.25 }}
          className="mt-10 w-full max-w-xl"
        >
          <div className="flex gap-2">
            <motion.div className="flex-1" whileHover={{ scale: 1.01 }} transition={spring}>
              <Input
                id="youtube-url-input"
                placeholder="Paste a YouTube link..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                className="h-12 rounded-2xl border-primary/20 bg-secondary/40 px-5 text-sm backdrop-blur-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary"
              />
            </motion.div>
            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }} transition={spring}>
              <Button
                id="analyze-button"
                onClick={() => handleAnalyze()}
                disabled={loading}
                className="h-12 rounded-2xl px-6 font-semibold shadow-lg shadow-primary/25"
              >
                <Search className="mr-1.5 h-4 w-4" />
                Analyze
              </Button>
            </motion.div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-xs text-rose-400"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Sample button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...spring, delay: 0.35 }}
          className="mt-6"
        >
          <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }} transition={spring}>
            <Button
              id="sample-button"
              variant="outline"
              onClick={handleSample}
              disabled={loading}
              className="group rounded-full border-primary/20 text-sm font-medium text-primary"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              See a Sample Result
              <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Loading */}
        <AnimatePresence>
          {loading && (
            <LoadingSpinner
              message={loadingMessage || "Loading..."}
              progress={progress}
            />
          )}
        </AnimatePresence>

        {/* History */}
        <AnalyzedVideoList
          history={history}
          onSelect={handleHistorySelect}
          onClear={handleClearHistory}
          onDelete={handleDeleteVideo}
        />
      </motion.div>
    </AnimatePresence>
  );
}
