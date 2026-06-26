package algorithms

// ── Selection Sort ───────────────────────────────────────────────

// SelectionSortByLength mengurutkan komentar berdasarkan panjang teks (asc/desc)
// menggunakan algoritma Selection Sort. Kompleksitas waktu: O(n²).
func SelectionSortByLength(comments []Comment, mode string) []Comment {
	if mode == "" {
		mode = "desc"
	}

	// Buat salinan agar tidak mengubah array asli
	arr := make([]Comment, len(comments))
	copy(arr, comments)
	n := len(arr)

	for i := 0; i < n-1; i++ {
		targetIdx := i

		for j := i + 1; j < n; j++ {
			lenA := len(arr[j].TextDisplay)
			lenTarget := len(arr[targetIdx].TextDisplay)

			if mode == "desc" {
				if lenA > lenTarget {
					targetIdx = j
				}
			} else {
				if lenA < lenTarget {
					targetIdx = j
				}
			}
		}

		if targetIdx != i {
			arr[i], arr[targetIdx] = arr[targetIdx], arr[i]
		}
	}

	return arr
}

// ── Insertion Sort ───────────────────────────────────────────────

// sentimentScore mengembalikan skor numerik dari label sentimen.
func sentimentScore(sentiment string) int {
	switch sentiment {
	case SentimentPositive:
		return 3
	case SentimentNeutral:
		return 2
	case SentimentNegative:
		return 1
	default:
		return 0
	}
}

// InsertionSortBySentiment mengurutkan komentar berdasarkan tingkat sentimen (asc/desc)
// menggunakan algoritma Insertion Sort. Kompleksitas waktu: O(n²).
func InsertionSortBySentiment(comments []Comment, mode string) []Comment {
	if mode == "" {
		mode = "desc"
	}

	// Buat salinan agar tidak mengubah array asli
	arr := make([]Comment, len(comments))
	copy(arr, comments)
	n := len(arr)

	for i := 1; i < n; i++ {
		currentItem := arr[i]
		currentScore := sentimentScore(currentItem.Sentiment)
		j := i - 1

		if mode == "desc" {
			for j >= 0 && sentimentScore(arr[j].Sentiment) < currentScore {
				arr[j+1] = arr[j]
				j--
			}
		} else {
			for j >= 0 && sentimentScore(arr[j].Sentiment) > currentScore {
				arr[j+1] = arr[j]
				j--
			}
		}

		arr[j+1] = currentItem
	}

	return arr
}
