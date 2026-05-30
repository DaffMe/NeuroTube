"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  VideoDetailsSkeleton,
  SentimentSummarySkeleton,
  ChartsSkeleton,
  AiSummarySkeleton,
  CommentSectionSkeleton,
} from "@/components/SkeletonLoaders";
import {
  isValidYouTubeUrl,
  submitAnalysisJob,
  getJobStatus,
  getJobStatusStreamUrl,
  getAnalysisResults,
  fetchHistory,
  getLocalHistory,
  deleteHistoryFromServer,
  deleteVideoFromServer,
} from "@/services/api";
import type { AnalysisResponse, AnalyzedVideo } from "@/types";

// -----------------------------------------------------------------------------
// SPRING ANIMATION CONFIGURATION
// -----------------------------------------------------------------------------
const spring = { type: "spring" as const, stiffness: 400, damping: 18 };

export default function HomePage() {
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT (TEMPORARY DATA STORAGE FOR THIS PAGE)
  // ---------------------------------------------------------------------------
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [history, setHistory] = useState<AnalyzedVideo[]>(getLocalHistory());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Keep a ref to the latest URL so handleAnalyze always reads the current value
  // without needing 'url' in its dependency array (which would recreate the callback on every keystroke)
  const urlRef = useRef(url);
  useEffect(() => { urlRef.current = url; }, [url]);

  // ---------------------------------------------------------------------------
  // SIDE EFFECTS (RUNS WHEN THE APP FIRST LOADS)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchHistory().then(setHistory).catch(console.error);
  }, []);

  // ---------------------------------------------------------------------------
  // MAIN FUNCTION: PROCESS THE ANALYZE BUTTON CLICK
  // ---------------------------------------------------------------------------
  const handleAnalyze = useCallback(
    async (inputUrl?: string) => {
      const target = inputUrl || urlRef.current;

      if (!isValidYouTubeUrl(target)) {
        setError("Please enter a valid YouTube URL!");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      setError("");
      setLoading(true);
      setLoadingMessage("Sending request to server...");
      setProgress(0);

      try {
        const jobRes = await submitAnalysisJob(target);
        const jobId = jobRes.jobId;

        const completed = jobRes.status === "completed";

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
                    reject(new Error(data.message || "Analysis failed during processing"));
                  }
                } catch (err) {
                  eventSource.close();
                  reject(err);
                }
              };

              eventSource.onerror = () => {
                eventSource.close();
                reject(new Error("Connection lost"));
              };
            });
          } catch (sseErr) {
            console.warn("SSE stream connection failed, switching to manual polling...", sseErr);
            let fallbackCompleted = false;
            let pollAttempts = 0;
            const MAX_POLL_ATTEMPTS = 60; // 2 minutes at 2s intervals

            while (!fallbackCompleted && pollAttempts < MAX_POLL_ATTEMPTS) {
              await new Promise((r) => setTimeout(r, 2000));
              const statusRes = await getJobStatus(jobId);
              setLoadingMessage(statusRes.message);
              pollAttempts++;

              if (statusRes.status === "completed") {
                fallbackCompleted = true;
              } else if (statusRes.status.startsWith("failed") || statusRes.status === "unknown") {
                throw new Error(statusRes.message || "Analysis failed", { cause: sseErr as Error });
              }
            }

            if (pollAttempts >= MAX_POLL_ATTEMPTS) {
              throw new Error("Analysis timed out after 2 minutes", { cause: sseErr as Error });
            }
          }
        }

        setLoadingMessage("Downloading final results...");
        const data = await getAnalysisResults(jobId);
        setResult(data);

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
    []
  );

  // ---------------------------------------------------------------------------
  // HELPER FUNCTIONS
  // ---------------------------------------------------------------------------

  const handleSample = useCallback(() => {
    // Pass URL directly to handleAnalyze so it bypasses the url state entirely.
    // This avoids any timing issues with setUrl being asynchronous.
    handleAnalyze("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  }, [handleAnalyze]);

  const handleHistorySelect = useCallback(async (video: AnalyzedVideo, jobId: string) => {
    setError("");
    setLoading(true);
    setLoadingMessage("Loading results from database...");
    try {
      // Use the exact jobId from the history entry so we load the correct analysis,
      // not just the latest completed job for this video
      const data = await getAnalysisResults(jobId);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load that history record");
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
            <span className="bg-linear-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Sentiment Analyzer
            </span>
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            Paste any YouTube link and instantly see what thousands of comments really think.
            Powered by Machine Learning sentiment analysis.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...spring, delay: 0.25 }}
          className="mt-10 w-full max-w-xl relative"
        >
          <div className="flex gap-2">
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.01 }}
              animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
              transition={shake ? { duration: 0.4 } : spring}
            >
              <Input
                id="youtube-url-input"
                placeholder="Paste a YouTube link..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                className={`h-12 rounded-2xl border-primary/20 bg-secondary/40 px-5 text-sm backdrop-blur-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary ${error ? 'border-rose-500/50 focus-visible:ring-rose-500/50' : ''}`}
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
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-full left-0 right-0 mt-3 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500 shadow-xl shadow-rose-500/5 backdrop-blur-md z-10"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20">
                  <span className="text-xs font-bold text-rose-500">!</span>
                </div>
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

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

        <AnimatePresence>
          {loading && !result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-4xl space-y-6 px-4 py-8 w-full"
            >
              <VideoDetailsSkeleton />
              <SentimentSummarySkeleton />
              <ChartsSkeleton />
              <AiSummarySkeleton />
              <CommentSectionSkeleton />
            </motion.div>
          )}
          {loading && result && (
            <LoadingSpinner
              message={loadingMessage || "Loading..."}
              progress={progress}
            />
          )}
        </AnimatePresence>

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
