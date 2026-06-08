package handler

import (
	"encoding/json" // Mengubah data menjadi bentuk teks JSON sebelum dilempar ke frontend
	"fmt" // Membungkus data teks dengan rapi (string formatting)
	"log" // Mencetak pesan pemberitahuan status kerja ke layar terminal
	"net/http" // Membaca permintaan (request) dan mengirim balasan status web (response)
	"regexp" // Membaca dan menyeleksi pola unik dalam sebuah kata (mencari huruf ID video di dalam URL YouTube)
	"strings" // Memotong karakter spasi berlebih atau merapikan sebuah kalimat
	"strconv" // Mengonversi teks yang bertuliskan angka (String) menjadi murni Angka (Integer)
	"time" // Membantu mengatur batas detik dan detak perulangan Server-Sent Events

	"github.com/go-chi/chi/v5" // Pustaka pengatur rute yang dipakai untuk membaca parameter dari URL
	"github.com/google/uuid" // Pustaka untuk memproduksi nomor resi acak yang dijamin unik (ID Pekerjaan)

	"neurotube/backend-fetcher/internal/queue" // Memanggil folder modul buatan sendiri agar bisa menyuruh antrean Redis
	"neurotube/backend-fetcher/internal/youtube" // Memanggil folder modul buatan sendiri yang berisi logika unduh YouTube
)

// Handler holds dependencies for HTTP handlers.
// Struct Handler berfungsi untuk menyimpan dependensi yang dibutuhkan oleh server, seperti koneksi ke Redis dan YouTube API
type Handler struct {
	publisher *queue.Publisher
	ytClient  *youtube.Client
}

// New creates a new Handler with the given dependencies.
// Fungsi ini adalah pembuat (constructor) untuk menginisialisasi Handler baru beserta klien YouTube-nya
func New(publisher *queue.Publisher, apiKey string) *Handler {
	return &Handler{
		publisher: publisher,
		ytClient:  youtube.NewClient(apiKey),
	}
}

// ── Request / Response types ─────────────────────────────────────

// penerapan materi Modul 06 (Tipe Bentukan)
// baris code ini berfungsi mendefinisikan custom struct untuk menampung format JSON pada request
type AnalyzeRequest struct {
	URL string `json:"url"` // Menampung data URL video dari frontend
}

// Struct untuk menampung format balasan (response) saat analisis berhasil dimulai
type AnalyzeResponse struct {
	JobID   string `json:"jobId"`   // ID unik untuk pekerjaan analisis ini
	VideoID string `json:"videoId"` // ID video YouTube yang diekstrak
	Status  string `json:"status"`  // Status saat ini (misal: processing)
	Message string `json:"message"` // Pesan keterangan tambahan
}

// Struct untuk menampung format balasan saat frontend mengecek status analisis
type StatusResponse struct {
	JobID   string `json:"jobId"`
	Status  string `json:"status"`
	Message string `json:"message"`
}

// Struct untuk menampung pesan error jika terjadi kesalahan
type ErrorResponse struct {
	Error   string `json:"error"`             // Pesan error utama
	Details string `json:"details,omitempty"` // Detail error tambahan (opsional)
}

// ── Handlers ─────────────────────────────────────────────────────

// Health returns a simple health check.
// penerapan materi Modul 04 (Prosedur)
// baris code ini berfungsi sebagai prosedur HTTP handler yang mengelola request dan memodifikasi ResponseWriter tanpa mengembalikan nilai (return void)
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	// Mengembalikan JSON berisi status server (untuk memastikan server menyala)
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "NeuroTube-fetcher",
		"time":    time.Now().UTC().Format(time.RFC3339),
	})
}

// Analyze accepts a YouTube URL, fetches video data + comments,
// and publishes a job to Redis for the ML engine.
// Fungsi Analyze adalah rute utama yang menerima URL video, mengunduh komentar, dan menaruhnya ke Redis
func (h *Handler) Analyze(w http.ResponseWriter, r *http.Request) {
	var req AnalyzeRequest
	// Mencoba mengurai (decode) data JSON dari body request masuk
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	// Mengekstrak ID video dari URL penuh YouTube menggunakan fungsi bantuan
	videoID := extractVideoID(req.URL)
	if videoID == "" {
		// Mengembalikan pesan error 400 Bad Request jika URL tidak valid
		writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid YouTube URL",
			Details: fmt.Sprintf("Could not extract video ID from: %s", req.URL),
		})
		return
	}

	// Quota Guard: Check Cache
	// Memeriksa apakah opsi "force" disertakan untuk memaksa analisis ulang
	force := r.URL.Query().Get("force") == "true"
	if !force {
		// Jika tidak di-force, periksa apakah video ini sudah pernah dianalisis sebelumnya (berada di cache Redis)
		cachedJobID, err := h.publisher.GetCache(videoID)
		if err == nil && cachedJobID != "" {
			log.Printf(" [Quota Guard] Cache hit for video %s -> Job %s", videoID, cachedJobID)
			// Memperbarui masa aktif status di Redis agar tidak kedaluwarsa
			_ = h.publisher.SetStatus(cachedJobID, "completed")

			// Mengembalikan hasil analisis dari cache untuk menghemat kuota API YouTube
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
	// Membuat ID unik acak (UUID) untuk menandai tugas analisis ini
	jobID := uuid.New().String()

	// Set initial status immediately so status polling works
	// Menyimpan status awal "processing" ke Redis agar frontend bisa langsung memantaunya
	if err := h.publisher.SetStatus(jobID, "processing"); err != nil {
		log.Printf(" Failed to set initial job status: %v", err)
	}

	// Fetch video info + comments asynchronously
	// Membuka Goroutine baru untuk mengunduh data secara asinkron di latar belakang
	go func() {
		log.Printf(" [%s] Fetching video info for %s...", jobID, videoID)
		_ = h.publisher.SetProgress(jobID, 5) // Set progres loading ke 5%

		// 1. Mengambil detail metadata video (seperti judul dan total komentar) dari API YouTube
		videoInfo, err := h.ytClient.FetchVideoInfo(videoID)
		if err != nil {
			log.Printf(" [%s] Failed to fetch video info: %v", jobID, err)
			_ = h.publisher.PublishError(jobID, videoID, fmt.Sprintf("Failed to fetch video: %v", err))
			return
		}

		_ = h.publisher.SetProgress(jobID, 10) // Set progres loading ke 10%
		totalComments, _ := strconv.Atoi(videoInfo.CommentCount) // Mengonversi jumlah komentar menjadi integer
		log.Printf(" [%s] Video: %s | Total comments on YT: %d (Target: 5000)", jobID, videoInfo.Title, totalComments)

		// 2. Mengunduh komentar secara bertahap
		// Fungsi ini memanggil YouTube API berkali-kali untuk meraup hingga 5000 komentar, sambil mengupdate persen progres
		comments, err := h.ytClient.FetchComments(videoID, 5000, func(percent int) {
			_ = h.publisher.SetProgress(jobID, percent)
		})
		if err != nil {
			// Jika error saat mengunduh sebagian data, kita tetap lanjut menganalisis data yang sudah didapat (partial)
			log.Printf(" [%s] Error fetching comments (partial results): %v", jobID, err)
		}

		log.Printf(" [%s] Fetched %d comments", jobID, len(comments))
		_ = h.publisher.SetProgress(jobID, 50) // Set progres loading ke 50% setelah unduhan selesai

		// 3. Menerbitkan data komentar yang sudah diunduh ke dalam antrean Redis
		err = h.publisher.PublishJob(jobID, videoID, videoInfo, comments)
		if err != nil {
			log.Printf(" [%s] Failed to publish to Redis: %v", jobID, err)
			return
		}

		log.Printf(" [%s] Job published to Redis queue", jobID)
	}()

	// Return immediately with job ID
	// Mengirimkan balasan sukses secepat mungkin ke frontend, meskipun proses unduh berjalan di latar belakang
	writeJSON(w, http.StatusAccepted, AnalyzeResponse{
		JobID:   jobID,
		VideoID: videoID,
		Status:  "processing",
		Message: "Analysis job submitted. Poll /api/status/{jobId} for updates.",
	})
}

// Status checks the status of an analysis job.
// Fungsi ini digunakan frontend untuk mengecek status terakhir pekerjaan analisis berdasarkan ID-nya
func (h *Handler) Status(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId") // Mengambil parameter jobId dari URL
	if jobID == "" {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Missing jobId"})
		return
	}

	// Mengambil status pekerjaan dari memori Redis
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
// Fungsi ini menjaga koneksi tetap terbuka dan mengalirkan pembaruan persentase loading secara real-time ke frontend
func (h *Handler) StatusStream(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	if jobID == "" {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Missing jobId"})
		return
	}

	// Memeriksa apakah client mendukung mekanisme streaming (Flusher)
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}

	// Menyiapkan header HTTP yang sesuai untuk komunikasi SSE (Server-Sent Events)
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Content-Type-Options", "nosniff")

	// Mendorong (flush) header ke klien sesegera mungkin
	flusher.Flush()

	// Membuat pengatur waktu (ticker) untuk mengecek status Redis setiap 500 milidetik (0.5 detik)
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	// Looping berkelanjutan (infinite loop) untuk selalu mengirimkan pembaruan
	for {
		select {
		case <-r.Context().Done():
			// Jika pengguna menutup tab browser atau membatalkan request, loop dihentikan
			log.Printf(" SSE client disconnected for job %s", jobID)
			return
		case <-ticker.C:
			// Setiap 0.5 detik, ambil status terbaru dari Redis
			status, err := h.publisher.GetJobStatus(jobID)
			if err != nil {
				// Jika pekerjaan tidak ditemukan, kirim status "unknown"
				eventData := map[string]interface{}{
					"progress": 0,
					"status":   "unknown",
					"message":  "Job not found or still in queue",
				}
				sendSSEEvent(w, flusher, eventData)
				continue
			}

			// Mengambil angka persentase kemajuan dari Redis
			progress, err := h.publisher.GetProgress(jobID)
			if err != nil {
				progress = 0
			}

			displayStatus := status
			message := getStatusMessage(status) // Menerjemahkan status teknis menjadi pesan yang ramah pengguna
			
			// Menangani kasus jika status analisis dilaporkan gagal
			if strings.HasPrefix(status, "failed") {
				displayStatus = "failed"
				message = strings.TrimPrefix(status, "failed:")
			}

			// Mengemas data status menjadi format peta (map) JSON
			eventData := map[string]interface{}{
				"progress": progress,
				"status":   displayStatus,
				"message":  message,
			}

			// Mengirim event tersebut ke klien
			sendSSEEvent(w, flusher, eventData)

			// Jika analisis sudah 100% selesai atau gagal, hentikan streaming
			if displayStatus == "completed" || displayStatus == "failed" {
				return
			}
		}
	}
}

// Fungsi pembantu untuk membungkus data menjadi format JSON SSE dan mem-flush koneksi
func sendSSEEvent(w http.ResponseWriter, flusher http.Flusher, data interface{}) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Printf("Error marshaling SSE event data: %v", err)
		return
	}
	// Format wajib SSE: diawali "data: " dan diakhiri dengan dua baris baru
	fmt.Fprintf(w, "data: %s\n\n", jsonData)
	flusher.Flush()
}

// ── Helpers ──────────────────────────────────────────────────────

// Variabel penampung pola regex untuk mencari 11-karakter ID unik dari format URL YouTube apapun
var videoIDPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?:v=|/v/|youtu\.be/|/embed/)([a-zA-Z0-9_-]{11})`),
	regexp.MustCompile(`^([a-zA-Z0-9_-]{11})$`),
}

// penerapan materi Modul 03 (Fungsi)
// baris code ini berfungsi sebagai fungsi yang menerima string url dan memprosesnya untuk mengembalikan nilai string berupa ID video
func extractVideoID(url string) string {
	url = strings.TrimSpace(url) // Menghapus spasi ekstra di awal dan akhir URL
	// Melakukan pengulangan (loop) pada setiap pola regex untuk mencocokkan pola ID
	for _, pattern := range videoIDPatterns {
		matches := pattern.FindStringSubmatch(url)
		if len(matches) >= 2 {
			return matches[1] // Mengembalikan ID video (huruf/angka sepanjang 11 karakter)
		}
	}
	return "" // Mengembalikan teks kosong jika URL tidak sesuai dengan pola YouTube
}

// Fungsi untuk menerjemahkan status mesin menjadi pesan string yang deskriptif bagi antarmuka pengguna
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

// Fungsi pembantu untuk mengirimkan balasan HTTP berformat JSON dengan kode status tertentu
func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json") // Mengubah tipe respons menjadi JSON
	w.WriteHeader(status) // Menyisipkan kode status HTTP (misal: 200 OK)
	json.NewEncoder(w).Encode(v) // Menyandikan dan mengirim isi data
}
