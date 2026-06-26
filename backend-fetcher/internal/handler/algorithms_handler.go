package handler

import (
	"encoding/json"
	"net/http"
	"neurotube/backend-fetcher/internal/algorithms"
)

// ── Structs for Request / Response ───────────────────────────────

type SortRequest struct {
	Comments []algorithms.Comment `json:"comments"`
	SortBy   string               `json:"sortBy"` // "length" or "sentiment"
	Mode     string               `json:"mode"`   // "asc" or "desc"
}

type SearchRequest struct {
	Comments []algorithms.Comment `json:"comments"`
	Keyword  string               `json:"keyword"`
	Method   string               `json:"method"` // "sequential" or "binary"
}

type CRUDRequest struct {
	Comments []algorithms.Comment `json:"comments"`
	Action   string               `json:"action"` // "add", "update", "delete"
	Comment  algorithms.Comment   `json:"comment,omitempty"`
	ID       string               `json:"id,omitempty"`
	Text     string               `json:"text,omitempty"`
}

type AlgorithmsResponse struct {
	Comments []algorithms.Comment `json:"comments"`
	Found    bool                 `json:"found,omitempty"` // for update/delete status
}

// ── Handlers ─────────────────────────────────────────────────────

// SearchComments handles POST /api/algorithms/search
func (h *Handler) SearchComments(w http.ResponseWriter, r *http.Request) {
	var req SearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	var results []algorithms.Comment
	if req.Method == "binary" {
		results = algorithms.BinarySearch(req.Comments, req.Keyword)
	} else {
		results = algorithms.SequentialSearch(req.Comments, req.Keyword)
	}

	writeJSON(w, http.StatusOK, AlgorithmsResponse{Comments: results})
}

// SortComments handles POST /api/algorithms/sort
func (h *Handler) SortComments(w http.ResponseWriter, r *http.Request) {
	var req SortRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	var results []algorithms.Comment
	if req.SortBy == "sentiment" {
		results = algorithms.InsertionSortBySentiment(req.Comments, req.Mode)
	} else {
		results = algorithms.SelectionSortByLength(req.Comments, req.Mode)
	}

	writeJSON(w, http.StatusOK, AlgorithmsResponse{Comments: results})
}

// CRUDComments handles POST /api/algorithms/crud
func (h *Handler) CRUDComments(w http.ResponseWriter, r *http.Request) {
	var req CRUDRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	var results []algorithms.Comment
	found := false

	switch req.Action {
	case "add":
		results = algorithms.AddComment(req.Comments, req.Comment)
		found = true // Added successfully
	case "update":
		results, found = algorithms.UpdateComment(req.Comments, req.ID, req.Text)
	case "delete":
		results, found = algorithms.DeleteComment(req.Comments, req.ID)
	default:
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid action. Use add, update, or delete."})
		return
	}

	writeJSON(w, http.StatusOK, AlgorithmsResponse{
		Comments: results,
		Found:    found,
	})
}
