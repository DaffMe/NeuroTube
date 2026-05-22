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

// -----------------------------------------------------------------------------
// SPRING ANIMATION CONFIGURATION
// -----------------------------------------------------------------------------
// The 'spring' object controls how bouncy and smooth the UI transitions will be.
const spring = { type: "spring" as const, stiffness: 400, damping: 18 };

export default function HomePage() {
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT (TEMPORARY DATA STORAGE FOR THIS PAGE)
  // ---------------------------------------------------------------------------
  // url: Stores the YouTube link text typed by the user in the search box
  const [url, setUrl] = useState("");
  // error: Stores warning messages if the link is invalid or the system fails
  const [error, setError] = useState("");
  // loading: A boolean (True/False) flag indicating if the system is currently processing an analysis
  const [loading, setLoading] = useState(false);
  // loadingMessage: Stores status messages like "Fetching...", "Analyzing..."
  const [loadingMessage, setLoadingMessage] = useState("");
  // progress: Stores the progress percentage (0 to 100%) of the backend job
  const [progress, setProgress] = useState<number | undefined>(undefined);
  // result: Stores all the final analysis data (statistics, charts, AI summary) upon success
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  // history: Stores the list of previously analyzed videos fetched from the database
  const [history, setHistory] = useState<AnalyzedVideo[]>(getLocalHistory());
  // selectedDate: Stores the specific date filter if the user clicks a point on the timeline chart
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // SIDE EFFECTS (RUNS WHEN THE APP FIRST LOADS)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Contacts the server (backend) to request the list of previous analysis history
    fetchHistory().then(setHistory).catch(console.error);
  }, []);

  // ---------------------------------------------------------------------------
  // MAIN FUNCTION: PROCESS THE ANALYZE BUTTON CLICK
  // ---------------------------------------------------------------------------
  const handleAnalyze = useCallback(
    async (inputUrl?: string) => {
      // Use the URL from the input box, OR a direct URL (if clicked from History)
      const target = inputUrl || url;
      
      // Stop the process if the provided link is not a valid YouTube URL
      if (!isValidYouTubeUrl(target)) {
        setError("Please enter a valid YouTube URL!");
        return;
      }
      
      // Clear any previous error messages and activate the Loading mode
      setError("");
      setLoading(true);
      setLoadingMessage("Sending request to server...");
      setProgress(0);

      try {
        // 1. Send the video to the Backend Queue system. The server responds with a 'Job ID'
        const jobRes = await submitAnalysisJob(target);
        const jobId = jobRes.jobId;

        // 2. Check if the job happens to be completed immediately
        // Using const because this value is set once and never reassigned afterward
        const completed = jobRes.status === "completed";
        
        // If not finished yet, we will continuously monitor (Polling/Streaming) the progress
        if (!completed) {
          try {
            await new Promise<void>((resolve, reject) => {
              // Establish a dedicated Server-Sent Events (SSE) connection to receive real-time progress updates
              const eventSource = new EventSource(getJobStatusStreamUrl(jobId));

              // Every time the Backend sends a new progress message:
              eventSource.onmessage = (event) => {
                try {
                  const data = JSON.parse(event.data);
                  // Update the progress bar percentage in the UI
                  if (typeof data.progress === "number") {
                    setProgress(data.progress);
                  }
                  // Update the loading text message in the UI
                  if (data.message) {
                    setLoadingMessage(data.message);
                  }

                  // If the server says the process is "completed"
                  if (data.status === "completed") {
                    eventSource.close(); // Close the communication channel
                    resolve();           // Proceed to the next step (fetching results)
                  } else if (data.status === "failed") {
                    eventSource.close();
                    reject(new Error(data.message || "Analysis failed during processing"));
                  }
                } catch (err) {
                  eventSource.close();
                  reject(err);
                }
              };

              // If the internet connection drops unexpectedly
              eventSource.onerror = () => {
                eventSource.close();
                reject(new Error("Connection lost"));
              };
            });
          } catch (sseErr) {
            // IF the dedicated SSE stream fails, fallback to manual Polling mode
            console.warn("SSE stream connection failed, switching to manual polling...", sseErr);
            let fallbackCompleted = false;
            
            // The system will ask the server "Is it done yet?" every 2 seconds
            while (!fallbackCompleted) {
              await new Promise((r) => setTimeout(r, 2000));
              const statusRes = await getJobStatus(jobId);
              setLoadingMessage(statusRes.message);

              if (statusRes.status === "completed") {
                fallbackCompleted = true;
              } else if (statusRes.status.startsWith("failed")) {
                // Attach the original caught error (sseErr) as the 'cause' for proper error tracing
                throw new Error(statusRes.message, { cause: sseErr });
              }
            }
          }
        }

        // 3. Fetch the Complete Results (Statistics Data & Comments) once 100% processed
        setLoadingMessage("Downloading final results...");
        const data = await getAnalysisResults(jobId);
        setResult(data); // Save the results into the 'result' state so it renders on the screen
        
        // Refresh the history list because we just successfully analyzed a new video
        const newHistory = await fetchHistory();
        setHistory(newHistory);

      } catch (err) {
        // Display red error text if the analysis fails
        setError(err instanceof Error ? err.message : "An error occurred during analysis");
      } finally {
        // Regardless of success or failure, turn off the loading spinner
        setLoading(false);
        setLoadingMessage("");
        setProgress(undefined);
      }
    },
    [url]
  );

  // ---------------------------------------------------------------------------
  // HELPER FUNCTIONS
  // ---------------------------------------------------------------------------

  // Function for the "Sample" button (fills the box with a Rickroll link for testing)
  const handleSample = useCallback(async () => {
    setUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    handleAnalyze("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  }, [handleAnalyze]);

  // Function when a user clicks on a previously analyzed video from the history sidebar
  const handleHistorySelect = useCallback(async (video: AnalyzedVideo) => {
    setError("");
    setLoading(true);
    setLoadingMessage("Loading results from database...");
    try {
      const data = await getAnalysisByVideo(video.videoId);
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
            <span className="bg-linear-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
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
