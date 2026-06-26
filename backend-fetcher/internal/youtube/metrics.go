package youtube

import (
	"log"
)

// ── Comment Metrics & Analysis ───────────────────────────────────

// logCommentMetrics calculates and logs various comment statistics.
func (c *Client) logCommentMetrics(originalComments []Comment) {
	comments := make([]Comment, len(originalComments))
	copy(comments, originalComments)

	if len(comments) == 0 {
		return
	}

	log.Println("--- Generating Comment Metrics ---")

	totalComments := len(comments)
	log.Printf("Processing %d comments for metrics analysis", totalComments)

	totalLength := calculateTotalLength(comments)
	log.Printf("Total characters across all comments: %d", totalLength)

	initialLength := len(comments[0].TextOriginal)
	sanitizeCommentText(&comments[0])
	log.Printf("Sanitized first comment text (Length diff: %d -> %d)", initialLength, len(comments[0].TextOriginal))

	rcount := recursiveCount(comments, len(comments))
	log.Printf("Recursive comment count validation: %d", rcount)

	var minLikes, maxLikes int
	findExtremeLikes(comments, len(comments), &minLikes, &maxLikes)
	log.Printf("Like extremes: Min = %d, Max = %d", minLikes, maxLikes)

	targetID := comments[len(comments)-1].ID
	idxSeq := searchSequentialByID(comments, len(comments), targetID)
	log.Printf("Sequential search for ID '%s' found at index %d", targetID, idxSeq)

	log.Println("Sorting comments by LikeCount (Ascending) using Selection Sort...")
	sortSelectionByLikes(comments, len(comments))

	targetLike := comments[len(comments)/2].LikeCount
	idxBin := searchBinaryByLikes(comments, len(comments), targetLike)
	log.Printf("Binary search for LikeCount %d found at index %d", targetLike, idxBin)

	log.Println("Sorting comments by LikeCount (Descending) using Insertion Sort...")
	sortInsertionByLikesDesc(comments, len(comments))

	log.Println("--- Metrics Generation Complete ---")
}

func calculateTotalLength(arr []Comment) int {
	total := 0
	for i := 0; i < len(arr); i++ {
		total += len(arr[i].TextOriginal)
	}
	return total
}

func sanitizeCommentText(c *Comment) {
	if c.TextOriginal == "" {
		c.TextOriginal = c.TextDisplay
	}
}

func recursiveCount(arr []Comment, n int) int {
	if n == 0 {
		return 0
	}
	return 1 + recursiveCount(arr, n-1)
}

func findExtremeLikes(arr []Comment, n int, min *int, max *int) {
	if n == 0 {
		return
	}
	*min = arr[0].LikeCount
	*max = arr[0].LikeCount
	for i := 1; i < n; i++ {
		if arr[i].LikeCount < *min {
			*min = arr[i].LikeCount
		}
		if arr[i].LikeCount > *max {
			*max = arr[i].LikeCount
		}
	}
}

func searchSequentialByID(arr []Comment, n int, id string) int {
	found := -1
	i := 0
	for i < n && found == -1 {
		if arr[i].ID == id {
			found = i
		}
		i++
	}
	return found
}

func searchBinaryByLikes(arr []Comment, n int, target int) int {
	found := -1
	kr := 0
	kn := n - 1
	var med int

	for kr <= kn && found == -1 {
		med = (kr + kn) / 2
		if target < arr[med].LikeCount {
			kn = med - 1
		} else if target > arr[med].LikeCount {
			kr = med + 1
		} else {
			found = med
		}
	}
	return found
}

func sortSelectionByLikes(arr []Comment, n int) {
	var temp Comment
	var idxMin int
	for i := 1; i <= n-1; i++ {
		idxMin = i - 1
		for j := i; j < n; j++ {
			if arr[idxMin].LikeCount > arr[j].LikeCount {
				idxMin = j
			}
		}
		temp = arr[idxMin]
		arr[idxMin] = arr[i-1]
		arr[i-1] = temp
	}
}

func sortInsertionByLikesDesc(arr []Comment, n int) {
	var temp Comment
	var i, j int
	i = 1
	for i <= n-1 {
		j = i
		temp = arr[j]
		for j > 0 && temp.LikeCount > arr[j-1].LikeCount {
			arr[j] = arr[j-1]
			j = j - 1
		}
		arr[j] = temp
		i = i + 1
	}
}
