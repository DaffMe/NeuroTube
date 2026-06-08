package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"neurotube/backend-fetcher/internal/handler"
	"neurotube/backend-fetcher/internal/queue"
)

// penerapan materi Modul 04 (Prosedur Utama)
// baris code ini berfungsi sebagai titik awal eksekusi program tanpa mengembalikan nilai apapun (void)
func main() {
	// ── Koneksi Redis ─────────────────────────────────────────
	// Mengambil URL Redis dari environment variable, jika kosong maka gunakan alamat localhost default
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379/0"
	}

	// Membuat koneksi ke server Redis menggunakan URL yang sudah ditentukan
	publisher, err := queue.NewPublisher(redisURL)
	if err != nil {
		// Jika koneksi gagal, program akan berhenti dan mencetak pesan error
		log.Fatalf("❌ Failed to connect to Redis: %v", err)
	}
	// Pastikan koneksi Redis ditutup secara otomatis saat fungsi main selesai dieksekusi
	defer publisher.Close()
	log.Println("✅ Connected to Redis")

	// ── YouTube API key ──────────────────────────────────────────
	// Mengambil kunci API YouTube dari environment variable
	apiKey := os.Getenv("YOUTUBE_API_KEY")
	if apiKey == "" {
		// Peringatan jika kunci API tidak ditemukan
		log.Println("⚠️  YOUTUBE_API_KEY not set — YouTube fetching will fail")
	}

	// ── HTTP handler ─────────────────────────────────────────────
	// Menginisialisasi handler HTTP yang berisi fungsi untuk mengatur alur data dari frontend ke Redis dan YouTube
	h := handler.New(publisher, apiKey)

	// ── Router ───────────────────────────────────────────────────
	// Membuat router baru menggunakan library chi
	r := chi.NewRouter()
	
	// Menambahkan middleware bawaan chi untuk log, recovery, request ID, IP asli, dan timeout
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Timeout(600 * time.Second))

	// Konfigurasi CORS (Cross-Origin Resource Sharing)
	// Mengizinkan domain asal mana saja yang boleh mengakses API ini (biasanya domain frontend)
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:5173,http://localhost:3000"
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   splitOrigins(allowedOrigins),
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Mendaftarkan rute-rute API ke fungsi handler yang sesuai
	r.Get("/api/health", h.Health) // Mengecek kesehatan server
	r.Post("/api/analyze", h.Analyze) // Menerima URL YouTube dan memulai analisis
	r.Get("/api/status/{jobId}", h.Status) // Mengecek status antrean
	r.Get("/api/status/{jobId}/stream", h.StatusStream) // Membuka koneksi stream SSE untuk loading

	// ── Server ───────────────────────────────────────────────────
	// Mengambil konfigurasi port jaringan dari environment variable
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Mengonfigurasi properti server HTTP seperti alamat IP, router, dan batas waktu
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Memulai server di dalam Goroutine (jalan di latar belakang) agar program bisa lanjut menerima sinyal
	go func() {
		log.Printf("🚀 NeuroTube Fetcher listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Server error: %v", err)
		}
	}()

	// Menunggu sinyal interupsi (misal: CTRL+C) untuk mematikan server dengan aman (graceful shutdown)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	// Mematikan server secara perlahan agar request yang sedang berjalan bisa diselesaikan dulu
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("❌ Server forced to shutdown: %v", err)
	}
	log.Println("👋 Server stopped")
}

// Fungsi pembantu untuk memisahkan string berdasarkan koma menjadi array string
func splitOrigins(s string) []string {
	var origins []string
	current := ""
	for _, c := range s {
		if c == ',' {
			if current != "" {
				origins = append(origins, current)
			}
			current = ""
		} else {
			current += string(c)
		}
	}
	if current != "" {
		origins = append(origins, current)
	}
	return origins
}
