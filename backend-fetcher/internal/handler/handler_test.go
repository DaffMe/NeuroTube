package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"neurotube/backend-fetcher/internal/queue"
)

func TestExtractVideoID(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		expected string
	}{
		{"v= param", "https://youtube.com/watch?v=abc123xyz78", "abc123xyz78"},
		{"v= param full", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"},
		{"/v/ format", "https://youtube.com/v/dQw4w9WgXcQ", "dQw4w9WgXcQ"},
		{"youtu.be short", "https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"},
		{"/embed/ format", "https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"},
		{"bare ID", "dQw4w9WgXcQ", "dQw4w9WgXcQ"},
		{"with timestamp", "https://youtube.com/watch?v=abc123xyz78&t=42s", "abc123xyz78"},
		{"with playlist", "https://youtube.com/watch?v=abc123xyz78&list=PLxxx", "abc123xyz78"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := extractVideoID(tc.url)
			if got != tc.expected {
				t.Errorf("extractVideoID(%q) = %q, want %q", tc.url, got, tc.expected)
			}
		})
	}
}

func TestExtractVideoID_Invalid(t *testing.T) {
	invalid := []string{
		"",
		"not-a-url",
		"https://example.com",
		"https://youtube.com/",
		"abc",
		"abcdefghijkl",
	}

	for _, url := range invalid {
		got := extractVideoID(url)
		if got != "" {
			t.Errorf("extractVideoID(%q) = %q, want empty string", url, got)
		}
	}
}

func TestGetStatusMessage(t *testing.T) {
	tests := []struct {
		status  string
		needle  string
	}{
		{"processing", "fetched"},
		{"analyzing", "analysis"},
		{"completed", "complete"},
		{"failed", "failed"},
		{"unknown", "Unknown"},
		{"something-else", "Unknown"},
	}

	for _, tc := range tests {
		t.Run(tc.status, func(t *testing.T) {
			got := getStatusMessage(tc.status)
			if !strings.Contains(got, tc.needle) {
				t.Errorf("getStatusMessage(%q) = %q, want substring %q", tc.status, got, tc.needle)
			}
		})
	}
}

func newTestHandler() *Handler {
	return New(&queue.Publisher{}, "")
}

func TestAnalyze_InvalidJSON(t *testing.T) {
	h := newTestHandler()
	body := strings.NewReader("not json")
	req := httptest.NewRequest(http.MethodPost, "/api/analyze", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.Analyze(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestAnalyze_EmptyBody(t *testing.T) {
	h := newTestHandler()
	body := strings.NewReader(`{"url": ""}`)
	req := httptest.NewRequest(http.MethodPost, "/api/analyze", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.Analyze(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestAnalyze_NonYouTubeURL(t *testing.T) {
	h := newTestHandler()
	body := strings.NewReader(`{"url": "https://example.com/video"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/analyze", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.Analyze(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestAnalyze_NoAPIKey(t *testing.T) {
	h := New(&queue.Publisher{}, "") // intentionally no API key
	body := strings.NewReader(`{"url": "https://youtube.com/watch?v=dQw4w9WgXcQ"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/analyze", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.Analyze(w, req)

	// HasAPIKey returns false → 500 Internal Server Error
	if w.Code != http.StatusInternalServerError {
		t.Errorf("got %d, want %d", w.Code, http.StatusInternalServerError)
	}

	var resp ErrorResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}
	if !strings.Contains(resp.Error, "API key") {
		t.Errorf("error = %q, want to contain 'API key'", resp.Error)
	}
}

func TestStatus_MissingJobId(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/status/", nil)
	w := httptest.NewRecorder()
	h.Status(w, req)

	// chi URL param missing → 400 Bad Request
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestHealth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	h.Health(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("got %d, want %d", w.Code, http.StatusOK)
	}

	var resp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode health response: %v", err)
	}
	if resp["status"] != "ok" {
		t.Errorf("status = %q, want 'ok'", resp["status"])
	}
	if resp["service"] != "NeuroTube-fetcher" {
		t.Errorf("service = %q, want 'NeuroTube-fetcher'", resp["service"])
	}
}
