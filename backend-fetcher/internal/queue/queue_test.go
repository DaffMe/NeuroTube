package queue

import (
	"encoding/json"
	"testing"

	"neurotube/backend-fetcher/internal/youtube"
)

func TestJobPayload_JSONShape(t *testing.T) {
	// Verify JobPayload serializes correctly for the Python worker.
	payload := JobPayload{
		JobID:     "test-job-id",
		VideoID:   "dQw4w9WgXcQ",
		VideoInfo: &youtube.VideoInfo{ID: "dQw4w9WgXcQ", Title: "Test"},
		Comments:  []youtube.Comment{{ID: "c1", TextOriginal: "Great!"}},
	}

	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("json.Marshal(JobPayload) failed: %v", err)
	}

	// Deserialize as generic map to verify keys
	var decoded map[string]interface{}
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("json.Unmarshal failed: %v", err)
	}

	wantKeys := []string{"jobId", "videoId", "videoInfo", "comments"}
	for _, key := range wantKeys {
		if _, ok := decoded[key]; !ok {
			t.Errorf("JobPayload JSON missing key %q", key)
		}
	}

	videoInfo, ok := decoded["videoInfo"].(map[string]interface{})
	if !ok {
		t.Fatal("videoInfo should be an object")
	}
	if _, ok := videoInfo["id"]; !ok {
		t.Error("videoInfo.id should be present")
	}
}

func TestStatusKeyFormat(t *testing.T) {
	jobID := "my-job-123"
	key := StatusPrefix + jobID
	expected := "neurotube:status:my-job-123"
	if key != expected {
		t.Errorf("Status key = %q, want %q", key, expected)
	}
}

func TestNewPublisher_InvalidURL(t *testing.T) {
	// Invalid Redis URL should return an error.
	_, err := NewPublisher("redis://:invalid")
	if err == nil {
		t.Error("NewPublisher with invalid URL should return an error")
	}
}
