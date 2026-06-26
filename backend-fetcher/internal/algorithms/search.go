package algorithms

import (
	"sort"
	"strings"
)

// ── Sequential Search ────────────────────────────────────────────

// SequentialSearch mencari komentar yang mengandung kata kunci tertentu
// menggunakan algoritma pencarian sekuensial (linear search).
// Kompleksitas waktu: O(n).
func SequentialSearch(comments []Comment, keyword string) []Comment {
	keyword = strings.TrimSpace(keyword)
	if keyword == "" {
		return comments
	}

	lowerKeyword := strings.ToLower(keyword)
	var results []Comment

	// Iterasi elemen dari awal hingga akhir array
	for i := 0; i < len(comments); i++ {
		text := strings.ToLower(comments[i].TextDisplay)
		if strings.Contains(text, lowerKeyword) {
			results = append(results, comments[i])
		}
	}

	return results
}

// ── Binary Search ────────────────────────────────────────────────

// BinarySearch mencari komentar yang mengandung kata kunci tertentu
// menggunakan algoritma binary search.
//
// Strategi:
//  1. Urutkan komentar secara alfabetis berdasarkan teks.
//  2. Cari posisi anchor pertama (lower bound) di mana teks >= kata kunci.
//  3. Dari posisi anchor, perluas pencarian ke kiri dan kanan untuk mencari semua kecocokan.
//
// Kompleksitas waktu: O(n log n) sorting + O(log n) search + O(n) scan.
func BinarySearch(comments []Comment, keyword string) []Comment {
	keyword = strings.TrimSpace(keyword)
	if keyword == "" {
		return comments
	}

	lowerKeyword := strings.ToLower(keyword)

	// Langkah 1: Urutkan array secara alfabetis
	sortedComments := make([]Comment, len(comments))
	copy(sortedComments, comments)

	sort.Slice(sortedComments, func(i, j int) bool {
		textA := strings.ToLower(sortedComments[i].TextDisplay)
		textB := strings.ToLower(sortedComments[j].TextDisplay)
		return textA < textB
	})

	// Langkah 2: Binary search untuk menemukan lower bound (teks >= kata kunci)
	left := 0
	right := len(sortedComments)

	for left < right {
		mid := (left + right) / 2
		text := strings.ToLower(sortedComments[mid].TextDisplay)

		if text < lowerKeyword {
			left = mid + 1
		} else {
			right = mid
		}
	}
	// left menunjuk ke posisi lower bound

	// Langkah 3: Scan linear ke kiri dan kanan dari anchor
	var results []Comment

	// Scan ke kanan
	for j := left; j < len(sortedComments); j++ {
		text := strings.ToLower(sortedComments[j].TextDisplay)
		if strings.Contains(text, lowerKeyword) {
			results = append(results, sortedComments[j])
		}
	}

	// Scan ke kiri
	for i := left - 1; i >= 0; i-- {
		text := strings.ToLower(sortedComments[i].TextDisplay)
		if strings.Contains(text, lowerKeyword) {
			results = append([]Comment{sortedComments[i]}, results...)
		}
	}

	return results
}
