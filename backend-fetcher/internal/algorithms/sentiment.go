package algorithms

import "strings"

// ── Daftar Kata Kunci Sentimen ───────────────────────────────────

// PositiveKeywords berisi kata kunci yang mengindikasikan sentimen positif.
var PositiveKeywords = []string{
	// Bahasa Indonesia
	"bagus", "keren", "mantap", "suka", "hebat", "luar biasa", "amazing",
	"terbaik", "sempurna", "indah", "cantik", "menarik", "wow", "top",
	"recommended", "favorit", "senang", "gokil", "jos", "oke", "ok",
	"setuju", "benar", "betul", "sip", "asik", "asyik", "cakep",
	"membantu", "bermanfaat", "berguna", "inspiratif", "kreatif",
	"terima kasih", "thanks", "thank you", "makasih",
	// Bahasa Inggris
	"good", "great", "awesome", "love", "excellent", "best", "nice",
	"perfect", "beautiful", "wonderful", "fantastic", "incredible",
	"brilliant", "outstanding", "superb", "helpful", "useful",
	"like", "enjoy", "appreciate", "recommend", "favorite",
}

// NegativeKeywords berisi kata kunci yang mengindikasikan sentimen negatif.
var NegativeKeywords = []string{
	// Bahasa Indonesia
	"jelek", "buruk", "kecewa", "benci", "sampah", "payah", "busuk",
	"parah", "mengecewakan", "bohong", "hoax", "tipu", "scam",
	"marah", "kesal", "jijik", "menyebalkan", "membosankan", "bosan",
	"gagal", "hancur", "rusak", "lambat", "lelet", "lemot",
	"tidak suka", "gak suka", "ga suka", "nggak suka",
	"tidak bagus", "gak bagus", "ga bagus",
	// Bahasa Inggris
	"bad", "terrible", "horrible", "hate", "worst", "ugly", "awful",
	"disgusting", "boring", "disappointing", "disappointed", "trash",
	"garbage", "useless", "waste", "scam", "fake", "fraud",
	"annoying", "stupid", "dumb", "poor", "fail", "failed",
	"dislike", "sucks", "suck",
}

// ── Analisis Sentimen ────────────────────────────────────────────

// AnalyzeSentiment melakukan analisis sentimen sederhana berdasarkan kata kunci
// positif dan negatif. Mengembalikan label sentimen ("positive", "neutral", "negative")
// dan skor numerik (-1.0 sampai 1.0).
func AnalyzeSentiment(text string) (string, float64) {
	lowerText := strings.ToLower(text)

	positiveCount := 0
	negativeCount := 0

	// Hitung jumlah kata kunci positif yang ditemukan (Sequential Search pada daftar kata kunci)
	for _, keyword := range PositiveKeywords {
		if strings.Contains(lowerText, keyword) {
			positiveCount++
		}
	}

	// Hitung jumlah kata kunci negatif yang ditemukan
	for _, keyword := range NegativeKeywords {
		if strings.Contains(lowerText, keyword) {
			negativeCount++
		}
	}

	// Tentukan sentimen berdasarkan perbandingan jumlah kata kunci
	totalKeywords := positiveCount + negativeCount
	if totalKeywords == 0 {
		return SentimentNeutral, 0.0
	}

	// Hitung skor: range -1.0 (sangat negatif) sampai 1.0 (sangat positif)
	score := float64(positiveCount-negativeCount) / float64(totalKeywords)

	if positiveCount > negativeCount {
		return SentimentPositive, score
	} else if negativeCount > positiveCount {
		return SentimentNegative, score
	}
	return SentimentNeutral, 0.0
}

// AnalyzeSentimentBatch menganalisis sentimen untuk sekumpulan komentar
// dan mengisi field Sentiment serta SentimentScore pada setiap komentar.
func AnalyzeSentimentBatch(comments []Comment) []Comment {
	result := make([]Comment, len(comments))
	copy(result, comments)

	for i := range result {
		sentiment, score := AnalyzeSentiment(result[i].TextDisplay)
		result[i].Sentiment = sentiment
		result[i].SentimentScore = score
	}
	return result
}

// ── Statistik Sentimen ───────────────────────────────────────────

// CountSentimentStats menghitung statistik jumlah komentar
// berdasarkan kategori sentimen (positif, netral, negatif).
func CountSentimentStats(comments []Comment) SentimentStats {
	stats := SentimentStats{}

	for _, c := range comments {
		switch c.Sentiment {
		case SentimentPositive:
			stats.Positive++
		case SentimentNeutral:
			stats.Neutral++
		case SentimentNegative:
			stats.Negative++
		}
		stats.Total++
	}

	return stats
}
