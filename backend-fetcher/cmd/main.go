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

	"NeuroTube/backend-fetcher/internal/handler"
	"NeuroTube/backend-fetcher/internal/queue"
)

func main() {
	// ── Redis connection ─────────────────────────────────────────
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379/0"
	}

	publisher, err := queue.NewPublisher(redisURL)
	if err != nil {
		log.Fatalf("❌ Failed to connect to Redis: %v", err)
	}
	defer publisher.Close()
	log.Println("✅ Connected to Redis")

	// ── YouTube API key ──────────────────────────────────────────
	apiKey := os.Getenv("YOUTUBE_API_KEY")
	if apiKey == "" {
		log.Println("⚠️  YOUTUBE_API_KEY not set — YouTube fetching will fail")
	}

	// ── HTTP handler ─────────────────────────────────────────────
	h := handler.New(publisher, apiKey)

	// ── Router ───────────────────────────────────────────────────
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Timeout(600 * time.Second))

	// CORS
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

	// Routes
	r.Get("/api/health", h.Health)
	r.Post("/api/analyze", h.Analyze)
	r.Get("/api/status/{jobId}", h.Status)

	// ── Server ───────────────────────────────────────────────────
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Printf("🚀 NeuroTube Fetcher listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("❌ Server forced to shutdown: %v", err)
	}
	log.Println("👋 Server stopped")
}

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
