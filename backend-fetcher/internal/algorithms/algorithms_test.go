package algorithms

import (
	"testing"
)

// ── Test Data ────────────────────────────────────────────────────

func sampleComments() []Comment {
	return []Comment{
		{ID: "1", AuthorDisplayName: "Alice", TextDisplay: "Video ini sangat bagus dan keren!", Sentiment: "positive", SentimentScore: 1.0},
		{ID: "2", AuthorDisplayName: "Bob", TextDisplay: "Biasa aja sih", Sentiment: "neutral", SentimentScore: 0.0},
		{ID: "3", AuthorDisplayName: "Charlie", TextDisplay: "Jelek banget, mengecewakan", Sentiment: "negative", SentimentScore: -1.0},
		{ID: "4", AuthorDisplayName: "Diana", TextDisplay: "Mantap! Luar biasa helpful", Sentiment: "positive", SentimentScore: 1.0},
		{ID: "5", AuthorDisplayName: "Eve", TextDisplay: "Bosan, membosankan dan payah", Sentiment: "negative", SentimentScore: -1.0},
		{ID: "6", AuthorDisplayName: "Frank", TextDisplay: "Ok lah", Sentiment: "neutral", SentimentScore: 0.0},
		{ID: "7", AuthorDisplayName: "Grace", TextDisplay: "Sangat bagus sekali videonya, love it!", Sentiment: "positive", SentimentScore: 1.0},
	}
}

// ══════════════════════════════════════════════════════════════════
// TEST: Analisis Sentimen (Specification b)
// ══════════════════════════════════════════════════════════════════

func TestAnalyzeSentiment_Positive(t *testing.T) {
	sentiment, score := AnalyzeSentiment("Video ini sangat bagus dan keren sekali!")
	if sentiment != SentimentPositive {
		t.Errorf("Expected positive, got %s", sentiment)
	}
	if score <= 0 {
		t.Errorf("Expected positive score > 0, got %f", score)
	}
}

func TestAnalyzeSentiment_Negative(t *testing.T) {
	sentiment, score := AnalyzeSentiment("Jelek banget, sangat mengecewakan dan buruk")
	if sentiment != SentimentNegative {
		t.Errorf("Expected negative, got %s", sentiment)
	}
	if score >= 0 {
		t.Errorf("Expected negative score < 0, got %f", score)
	}
}

func TestAnalyzeSentiment_Neutral(t *testing.T) {
	sentiment, score := AnalyzeSentiment("Hmm mungkin nanti saya coba")
	if sentiment != SentimentNeutral {
		t.Errorf("Expected neutral, got %s", sentiment)
	}
	if score != 0.0 {
		t.Errorf("Expected score 0.0, got %f", score)
	}
}

func TestAnalyzeSentiment_Mixed(t *testing.T) {
	// Komentar dengan kata positif dan negatif sekaligus
	sentiment, _ := AnalyzeSentiment("Bagus sih tapi agak mengecewakan juga")
	// Bisa positif atau neutral tergantung jumlah kata kunci
	if sentiment == "" {
		t.Error("Expected a valid sentiment label, got empty string")
	}
}

func TestAnalyzeSentimentBatch(t *testing.T) {
	comments := []Comment{
		{ID: "1", TextDisplay: "Sangat bagus!"},
		{ID: "2", TextDisplay: "Jelek sekali"},
		{ID: "3", TextDisplay: "Hmm biasa"},
	}

	results := AnalyzeSentimentBatch(comments)
	if len(results) != 3 {
		t.Fatalf("Expected 3 results, got %d", len(results))
	}

	if results[0].Sentiment != SentimentPositive {
		t.Errorf("Comment 1: expected positive, got %s", results[0].Sentiment)
	}
	if results[1].Sentiment != SentimentNegative {
		t.Errorf("Comment 2: expected negative, got %s", results[1].Sentiment)
	}
}

// ══════════════════════════════════════════════════════════════════
// TEST: Sequential Search (Specification c)
// ══════════════════════════════════════════════════════════════════

func TestSequentialSearch_Found(t *testing.T) {
	comments := sampleComments()
	results := SequentialSearch(comments, "bagus")

	if len(results) != 2 {
		t.Errorf("Expected 2 results for 'bagus', got %d", len(results))
	}

	// Verifikasi bahwa semua hasil benar-benar mengandung kata kunci
	for _, r := range results {
		if r.ID != "1" && r.ID != "7" {
			t.Errorf("Unexpected comment ID in results: %s", r.ID)
		}
	}
}

func TestSequentialSearch_NotFound(t *testing.T) {
	comments := sampleComments()
	results := SequentialSearch(comments, "xyznotexist")

	if len(results) != 0 {
		t.Errorf("Expected 0 results, got %d", len(results))
	}
}

func TestSequentialSearch_EmptyKeyword(t *testing.T) {
	comments := sampleComments()
	results := SequentialSearch(comments, "")

	if len(results) != len(comments) {
		t.Errorf("Expected all %d comments returned for empty keyword, got %d", len(comments), len(results))
	}
}

func TestSequentialSearch_CaseInsensitive(t *testing.T) {
	comments := sampleComments()
	results := SequentialSearch(comments, "BAGUS")

	if len(results) != 2 {
		t.Errorf("Expected 2 results for case-insensitive 'BAGUS', got %d", len(results))
	}
}

// ══════════════════════════════════════════════════════════════════
// TEST: Binary Search (Specification c)
// ══════════════════════════════════════════════════════════════════

func TestBinarySearch_Found(t *testing.T) {
	comments := sampleComments()
	results := BinarySearch(comments, "bagus")

	if len(results) < 1 {
		t.Error("Expected at least 1 result for 'bagus'")
	}

	// Verifikasi bahwa semua hasil mengandung kata kunci
	for _, r := range results {
		found := false
		for _, c := range comments {
			if c.ID == r.ID {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Binary search returned comment not in original data: %s", r.ID)
		}
	}
}

func TestBinarySearch_NotFound(t *testing.T) {
	comments := sampleComments()
	results := BinarySearch(comments, "xyznotexist")

	if len(results) != 0 {
		t.Errorf("Expected 0 results, got %d", len(results))
	}
}

func TestBinarySearch_EmptyKeyword(t *testing.T) {
	comments := sampleComments()
	results := BinarySearch(comments, "")

	if len(results) != len(comments) {
		t.Errorf("Expected all %d comments returned for empty keyword, got %d", len(comments), len(results))
	}
}

// ══════════════════════════════════════════════════════════════════
// TEST: Selection Sort by Length (Specification d)
// ══════════════════════════════════════════════════════════════════

func TestSelectionSortByLength_Desc(t *testing.T) {
	comments := sampleComments()
	sorted := SelectionSortByLength(comments, "desc")

	if len(sorted) != len(comments) {
		t.Fatalf("Expected %d comments, got %d", len(comments), len(sorted))
	}

	// Verifikasi urutan: panjang teks harus menurun (descending)
	for i := 0; i < len(sorted)-1; i++ {
		lenCurrent := len(sorted[i].TextDisplay)
		lenNext := len(sorted[i+1].TextDisplay)
		if lenCurrent < lenNext {
			t.Errorf("Position %d (len=%d) should be >= position %d (len=%d)",
				i, lenCurrent, i+1, lenNext)
		}
	}
}

func TestSelectionSortByLength_Asc(t *testing.T) {
	comments := sampleComments()
	sorted := SelectionSortByLength(comments, "asc")

	// Verifikasi urutan: panjang teks harus meningkat (ascending)
	for i := 0; i < len(sorted)-1; i++ {
		lenCurrent := len(sorted[i].TextDisplay)
		lenNext := len(sorted[i+1].TextDisplay)
		if lenCurrent > lenNext {
			t.Errorf("Position %d (len=%d) should be <= position %d (len=%d)",
				i, lenCurrent, i+1, lenNext)
		}
	}
}

func TestSelectionSort_DoesNotMutateOriginal(t *testing.T) {
	comments := sampleComments()
	originalFirstID := comments[0].ID
	_ = SelectionSortByLength(comments, "desc")

	if comments[0].ID != originalFirstID {
		t.Error("Selection sort mutated the original array!")
	}
}

// ══════════════════════════════════════════════════════════════════
// TEST: Insertion Sort by Sentiment (Specification d)
// ══════════════════════════════════════════════════════════════════

func TestInsertionSortBySentiment_Desc(t *testing.T) {
	comments := sampleComments()
	sorted := InsertionSortBySentiment(comments, "desc")

	if len(sorted) != len(comments) {
		t.Fatalf("Expected %d comments, got %d", len(comments), len(sorted))
	}

	// Verifikasi: komentar positif harus muncul duluan, lalu netral, lalu negatif
	for i := 0; i < len(sorted)-1; i++ {
		scoreCurrent := sentimentScore(sorted[i].Sentiment)
		scoreNext := sentimentScore(sorted[i+1].Sentiment)
		if scoreCurrent < scoreNext {
			t.Errorf("Position %d (sentiment=%s, score=%d) should be >= position %d (sentiment=%s, score=%d)",
				i, sorted[i].Sentiment, scoreCurrent, i+1, sorted[i+1].Sentiment, scoreNext)
		}
	}
}

func TestInsertionSortBySentiment_Asc(t *testing.T) {
	comments := sampleComments()
	sorted := InsertionSortBySentiment(comments, "asc")

	// Verifikasi: komentar negatif duluan, lalu netral, lalu positif
	for i := 0; i < len(sorted)-1; i++ {
		scoreCurrent := sentimentScore(sorted[i].Sentiment)
		scoreNext := sentimentScore(sorted[i+1].Sentiment)
		if scoreCurrent > scoreNext {
			t.Errorf("Position %d (sentiment=%s, score=%d) should be <= position %d (sentiment=%s, score=%d)",
				i, sorted[i].Sentiment, scoreCurrent, i+1, sorted[i+1].Sentiment, scoreNext)
		}
	}
}

func TestInsertionSort_DoesNotMutateOriginal(t *testing.T) {
	comments := sampleComments()
	originalFirstID := comments[0].ID
	_ = InsertionSortBySentiment(comments, "desc")

	if comments[0].ID != originalFirstID {
		t.Error("Insertion sort mutated the original array!")
	}
}

// ══════════════════════════════════════════════════════════════════
// TEST: CRUD Operations (Specification a)
// ══════════════════════════════════════════════════════════════════

func TestAddComment(t *testing.T) {
	comments := sampleComments()
	originalLen := len(comments)

	newComment := Comment{
		ID:                "8",
		AuthorDisplayName: "Hadi",
		TextDisplay:       "Video ini sangat bagus dan bermanfaat!",
	}

	result := AddComment(comments, newComment)

	if len(result) != originalLen+1 {
		t.Errorf("Expected %d comments after add, got %d", originalLen+1, len(result))
	}

	// Verifikasi bahwa sentimen terisi otomatis
	lastComment := result[len(result)-1]
	if lastComment.Sentiment == "" {
		t.Error("Expected sentiment to be auto-analyzed, got empty")
	}
	if lastComment.Sentiment != SentimentPositive {
		t.Errorf("Expected positive sentiment for 'bagus dan bermanfaat', got %s", lastComment.Sentiment)
	}
}

func TestUpdateComment(t *testing.T) {
	comments := sampleComments()

	// Ubah komentar negatif menjadi teks positif
	result, found := UpdateComment(comments, "3", "Ternyata bagus juga setelah ditonton lagi!")
	if !found {
		t.Error("Expected to find comment with ID '3'")
	}

	// Cari komentar yang diubah
	for _, c := range result {
		if c.ID == "3" {
			if c.TextDisplay != "Ternyata bagus juga setelah ditonton lagi!" {
				t.Errorf("Text not updated, got: %s", c.TextDisplay)
			}
			if c.Sentiment != SentimentPositive {
				t.Errorf("Expected sentiment to be re-analyzed as positive, got %s", c.Sentiment)
			}
			break
		}
	}
}

func TestUpdateComment_NotFound(t *testing.T) {
	comments := sampleComments()
	_, found := UpdateComment(comments, "999", "new text")
	if found {
		t.Error("Expected not to find comment with ID '999'")
	}
}

func TestDeleteComment(t *testing.T) {
	comments := sampleComments()
	originalLen := len(comments)

	result, found := DeleteComment(comments, "3")
	if !found {
		t.Error("Expected to find and delete comment with ID '3'")
	}
	if len(result) != originalLen-1 {
		t.Errorf("Expected %d comments after delete, got %d", originalLen-1, len(result))
	}

	// Pastikan komentar yang dihapus benar-benar tidak ada
	for _, c := range result {
		if c.ID == "3" {
			t.Error("Comment with ID '3' should have been deleted")
		}
	}
}

func TestDeleteComment_NotFound(t *testing.T) {
	comments := sampleComments()
	_, found := DeleteComment(comments, "999")
	if found {
		t.Error("Expected not to find comment with ID '999'")
	}
}

// ══════════════════════════════════════════════════════════════════
// TEST: Statistik Sentimen (Specification e)
// ══════════════════════════════════════════════════════════════════

func TestCountSentimentStats(t *testing.T) {
	comments := sampleComments()
	stats := CountSentimentStats(comments)

	if stats.Total != 7 {
		t.Errorf("Expected total 7, got %d", stats.Total)
	}
	if stats.Positive != 3 {
		t.Errorf("Expected 3 positive, got %d", stats.Positive)
	}
	if stats.Neutral != 2 {
		t.Errorf("Expected 2 neutral, got %d", stats.Neutral)
	}
	if stats.Negative != 2 {
		t.Errorf("Expected 2 negative, got %d", stats.Negative)
	}
}

func TestCountSentimentStats_Empty(t *testing.T) {
	stats := CountSentimentStats([]Comment{})
	if stats.Total != 0 {
		t.Errorf("Expected total 0 for empty slice, got %d", stats.Total)
	}
}
