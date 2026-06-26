package algorithms

// Comment merepresentasikan sebuah komentar media sosial beserta hasil analisis sentimennya.
type Comment struct {
	ID                    string  `json:"id"`
	AuthorDisplayName     string  `json:"authorDisplayName"`
	AuthorProfileImageUrl string  `json:"authorProfileImageUrl"`
	TextDisplay           string  `json:"textDisplay"`
	TextOriginal          string  `json:"textOriginal"`
	LikeCount             int     `json:"likeCount"`
	PublishedAt           string  `json:"publishedAt"`
	Sentiment             string  `json:"sentiment"`      // "positive", "negative", "neutral"
	SentimentScore        float64 `json:"sentimentScore"`
	IsReply               bool    `json:"isReply"`
	ParentID              string  `json:"parentId,omitempty"`
}

// SentimentCategory mendefinisikan kategori sentimen yang tersedia.
const (
	SentimentPositive = "positive"
	SentimentNeutral  = "neutral"
	SentimentNegative = "negative"
)

// SentimentStats menyimpan statistik jumlah komentar berdasarkan kategori sentimen.
type SentimentStats struct {
	Positive int `json:"positive"`
	Neutral  int `json:"neutral"`
	Negative int `json:"negative"`
	Total    int `json:"total"`
}
