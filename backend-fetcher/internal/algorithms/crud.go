package algorithms

// AddComment menambahkan komentar baru dan menganalisis sentimennya secara otomatis.
func AddComment(comments []Comment, newComment Comment) []Comment {
	sentiment, score := AnalyzeSentiment(newComment.TextDisplay)
	newComment.Sentiment = sentiment
	newComment.SentimentScore = score

	return append(comments, newComment)
}

// UpdateComment mengubah teks komentar berdasarkan ID dan menghitung ulang sentimennya.
func UpdateComment(comments []Comment, id string, newText string) ([]Comment, bool) {
	result := make([]Comment, len(comments))
	copy(result, comments)

	for i := range result {
		if result[i].ID == id {
			result[i].TextDisplay = newText
			result[i].TextOriginal = newText

			sentiment, score := AnalyzeSentiment(newText)
			result[i].Sentiment = sentiment
			result[i].SentimentScore = score

			return result, true
		}
	}

	return result, false
}

// DeleteComment menghapus komentar berdasarkan ID.
func DeleteComment(comments []Comment, id string) ([]Comment, bool) {
	var result []Comment
	found := false

	for _, c := range comments {
		if c.ID == id {
			found = true
			continue
		}
		result = append(result, c)
	}

	return result, found
}
