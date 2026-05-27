package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"neurotube/backend-fetcher/internal/queue"
	"neurotube/backend-fetcher/internal/youtube"
)

// Handler holds dependencies for HTTP handlers.
type Handler struct {
	publisher *queue.Publisher
	ytClient  *youtube.Client
}

// New creates a new Handler with the given dependencies.
func New(publisher *queue.Publisher, apiKey string) *Handler {
	return &Handler{
		publisher: publisher,
		ytClient:  youtube.NewClient(apiKey),
	}
}

// ── Request / Response types ─────────────────────────────────────

type AnalyzeRequest struct {
	URL string `json:"url"`
}

type AnalyzeResponse struct {
	JobID   string `json:"jobId"`
	VideoID string `json:"videoId"`
	Status  string `json:"status"`
	Message string `json:"message"`
}

type StatusResponse struct {
	JobID   string `json:"jobId"`
	Status  string `json:"status"`
	Message string `json:"message"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
}

// ── Handlers ─────────────────────────────────────────────────────

// Health returns a simple health check.
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "NeuroTube-fetcher",
		"time":    time.Now().UTC().Format(time.RFC3339),
	})
}

// Analyze accepts a YouTube URL, fetches video data + comments,
// and publishes a job to Redis for the ML engine.
func (h *Handler) Analyze(w http.ResponseWriter, r *http.Request) {
	// Enforce 1MB request body limit to prevent OOM from oversized payloads
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var req AnalyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	// Extract video ID from URL
	videoID := extractVideoID(req.URL)
	if videoID == "" {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid YouTube URL",
			Details: fmt.Sprintf("Could not extract video ID from: %s", req.URL),
		})
		return
	}

	// Validate that the API key is configured before accepting the job
	if !h.ytClient.HasAPIKey() {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{
			Error:   "YouTube API key not configured",
			Details: "Set YOUTUBE_API_KEY in your environment",
		})
		return
	}

	// Quota Guard: Check Cache
	force := r.URL.Query().Get("force") == "true"
	if !force {
		cachedJobID, err := h.publisher.GetCache(videoID)
		if err == nil && cachedJobID != "" {
			log.Printf("🛡️ [Quota Guard] Cache hit for video %s -> Job %s", videoID, cachedJobID)
			// Refresh status key in Redis just in case status TTL expired
			_ = h.publisher.SetStatus(cachedJobID, "completed")

			writeJSON(w, http.StatusOK, AnalyzeResponse{
				JobID:   cachedJobID,
				VideoID: videoID,
				Status:  "completed",
				Message: "Analysis retrieved from cache (Quota Guard).",
			})
			return
		}
	}

	// Generate a unique job ID
	jobID := uuid.New().String()

	// Set initial status immediately so status polling works
	if err := h.publisher.SetStatus(jobID, "processing"); err != nil {
		log.Printf("⚠️ Failed to set initial job status: %v", err)
	}

	// Fetch video info + comments asynchronously
	go func() {
		log.Printf("📥 [%s] Fetching video info for %s...", jobID, videoID)
		_ = h.publisher.SetProgress(jobID, 5)

		// 1. Fetch video metadata
		videoInfo, err := h.ytClient.FetchVideoInfo(videoID)
		if err != nil {
			log.Printf("❌ [%s] Failed to fetch video info: %v", jobID, err)
			_ = h.publisher.PublishError(jobID, videoID, fmt.Sprintf("Failed to fetch video: %v", err))
			return
		}

		_ = h.publisher.SetProgress(jobID, 10)
		totalComments, _ := strconv.Atoi(videoInfo.CommentCount)
		log.Printf("📝 [%s] Video: %s | Total comments on YT: %d (Target: 5000)", jobID, videoInfo.Title, totalComments)

		// 2. Fetch comments (sampled for speed)
		// We pass the total count so the fetcher can decide to use 'time' order if count <= 5000
		comments, err := h.ytClient.FetchComments(videoID, 5000, func(percent int) {
			_ = h.publisher.SetProgress(jobID, percent)
		})
		if err != nil {
			log.Printf("⚠️ [%s] Error fetching comments (partial results): %v", jobID, err)
			// Continue with partial results
		}

		log.Printf("✅ [%s] Fetched %d comments", jobID, len(comments))
		_ = h.publisher.SetProgress(jobID, 50)

		// 3. Publish to Redis queue for Python ML processing
		err = h.publisher.PublishJob(jobID, videoID, videoInfo, comments)
		if err != nil {
			log.Printf("❌ [%s] Failed to publish to Redis: %v", jobID, err)
			return
		}

		log.Printf("📨 [%s] Job published to Redis queue", jobID)
	}()

	// Return immediately with job ID
	writeJSON(w, http.StatusAccepted, AnalyzeResponse{
		JobID:   jobID,
		VideoID: videoID,
		Status:  "processing",
		Message: "Analysis job submitted. Poll /api/status/{jobId} for updates.",
	})
}

// Status checks the status of an analysis job.
func (h *Handler) Status(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	if jobID == "" {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Missing jobId"})
		return
	}

	status, err := h.publisher.GetJobStatus(jobID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, StatusResponse{
			JobID:   jobID,
			Status:  "unknown",
			Message: "Job not found or still in queue",
		})
		return
	}

	writeJSON(w, http.StatusOK, StatusResponse{
		JobID:   jobID,
		Status:  status,
		Message: getStatusMessage(status),
	})
}

// StatusStream streams the progress and status of a job using Server-Sent Events (SSE).
func (h *Handler) StatusStream(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	if jobID == "" {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Missing jobId"})
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}

	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Content-Type-Options", "nosniff")

	// Flush headers immediately
	flusher.Flush()

	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			log.Printf("🔌 SSE client disconnected for job %s", jobID)
			return
		case <-ticker.C:
			status, err := h.publisher.GetJobStatus(jobID)
			if err != nil {
				// Job might not be in Redis yet or status expired
				eventData := map[string]interface{}{
					"progress": 0,
					"status":   "unknown",
					"message":  "Job not found or still in queue",
				}
				sendSSEEvent(w, flusher, eventData)
				continue
			}

			progress, err := h.publisher.GetProgress(jobID)
			if err != nil {
				progress = 0
			}

			displayStatus := status
			message := getStatusMessage(status)
			if strings.HasPrefix(status, "failed") {
				displayStatus = "failed"
				message = strings.TrimPrefix(status, "failed:")
			}

			eventData := map[string]interface{}{
				"progress": progress,
				"status":   displayStatus,
				"message":  message,
			}

			sendSSEEvent(w, flusher, eventData)

			if displayStatus == "completed" || displayStatus == "failed" {
				return
			}
		}
	}
}

func sendSSEEvent(w http.ResponseWriter, flusher http.Flusher, data interface{}) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Printf("Error marshaling SSE event data: %v", err)
		return
	}
	fmt.Fprintf(w, "data: %s\n\n", jsonData)
	flusher.Flush()
}

// ── Helpers ──────────────────────────────────────────────────────

var videoIDPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?:v=|/v/|youtu\.be/|/embed/)([a-zA-Z0-9_-]{11})`),
	regexp.MustCompile(`^([a-zA-Z0-9_-]{11})$`),
}

func extractVideoID(url string) string {
	url = strings.TrimSpace(url)
	for _, pattern := range videoIDPatterns {
		matches := pattern.FindStringSubmatch(url)
		if len(matches) >= 2 {
			return matches[1]
		}
	}
	return ""
}

func getStatusMessage(status string) string {
	switch status {
	case "processing":
		return "Video data is being fetched and analyzed"
	case "analyzing":
		return "Sentiment analysis in progress"
	case "completed":
		return "Analysis complete — results are ready"
	case "failed":
		return "Analysis failed"
	default:
		return "Unknown status"
	}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
