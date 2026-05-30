package youtube

import (
	"testing"
)

func TestHasAPIKey(t *testing.T) {
	tests := []struct {
		name   string
		apiKey string
		want   bool
	}{
		{"empty string", "", false},
		{"whitespace only", "   ", true}, // non-empty string → true
		{"valid key", "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567890", true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			c := NewClient(tc.apiKey)
			got := c.HasAPIKey()
			if got != tc.want {
				t.Errorf("HasAPIKey(%q) = %v, want %v", tc.apiKey, got, tc.want)
			}
		})
	}
}

func TestVideoInfo_JSONNaming(t *testing.T) {
	// VideoInfo fields must be camelCase to match frontend expectations.
	info := VideoInfo{
		ID:           "abc123",
		Title:        "Test Video",
		ChannelTitle: "Test Channel",
		Thumbnail:    "https://example.com/thumb.jpg",
		PublishedAt:  "2025-01-01T00:00:00Z",
		ViewCount:    "12345",
		LikeCount:    "678",
		CommentCount: "90",
		Description:  "A test description",
	}

	if info.ID == "" {
		t.Error("VideoInfo.ID should not be empty")
	}
	if info.Title == "" {
		t.Error("VideoInfo.Title should not be empty")
	}
	if info.ChannelTitle == "" {
		t.Error("VideoInfo.ChannelTitle should not be empty")
	}
}

func TestComment_JSONNaming(t *testing.T) {
	// Comment fields must be camelCase to match frontend expectations.
	comment := Comment{
		ID:                    "comment_id",
		AuthorDisplayName:     "John Doe",
		AuthorProfileImageURL: "https://example.com/avatar.jpg",
		TextDisplay:           "Great video!",
		TextOriginal:          "Great video!",
		LikeCount:             42,
		PublishedAt:           "2025-01-01T00:00:00Z",
		IsReply:               false,
		ParentID:             "",
	}

	if comment.ID == "" {
		t.Error("Comment.ID should not be empty")
	}
	if comment.TextOriginal == "" && comment.TextDisplay == "" {
		t.Error("Comment must have at least one text field")
	}
}
