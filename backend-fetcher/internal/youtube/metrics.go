package youtube

import (
	"log" // Membawa perintah untuk menampilkan pencatatan teks perjalanan program ke layar terminal
)

// ── Comment Metrics & Analysis ───────────────────────────────────

// logCommentMetrics calculates and logs various comment statistics.
// This executes standard computer science algorithms on the dataset.
func (c *Client) logCommentMetrics(originalComments []Comment) {
	// Clone slice to avoid mutating the data processed by the main flow
	comments := make([]Comment, len(originalComments))
	copy(comments, originalComments)

	if len(comments) == 0 {
		return
	}

	log.Println("--- Generating Comment Metrics ---")

	// penerapan materi Modul 06 (Array/Slice)
	// baris code ini berfungsi untuk menghitung panjang data array komentar yang diproses
	totalComments := len(comments)
	log.Printf("Processing %d comments for metrics analysis", totalComments)

	// penerapan materi Modul 03 (Fungsi)
	// baris code ini berfungsi untuk memanggil fungsi kalkulasi total panjang karakter
	totalLength := calculateTotalLength(comments)
	log.Printf("Total characters across all comments: %d", totalLength)

	// penerapan materi Modul 04 (Prosedur / Pass by Reference)
	// baris code ini berfungsi memanggil prosedur pointer untuk memastikan teks tidak kosong
	initialLength := len(comments[0].TextOriginal)
	sanitizeCommentText(&comments[0])
	log.Printf("Sanitized first comment text (Length diff: %d -> %d)", initialLength, len(comments[0].TextOriginal))

	// penerapan materi Modul 05 (Rekursif)
	// baris code ini berfungsi memanggil logika rekursif untuk menghitung total komentar ulang
	rcount := recursiveCount(comments, len(comments))
	log.Printf("Recursive comment count validation: %d", rcount)

	// penerapan materi Modul 09 (Pencarian Nilai Ekstrim)
	// baris code ini berfungsi mencari jumlah likes terendah dan tertinggi di antara komentar
	var minLikes, maxLikes int
	findExtremeLikes(comments, len(comments), &minLikes, &maxLikes)
	log.Printf("Like extremes: Min = %d, Max = %d", minLikes, maxLikes)

	// penerapan materi Modul 10 (Sequential Search)
	// baris code ini berfungsi mencari ID komentar secara linier/sekuensial
	targetID := comments[len(comments)-1].ID
	idxSeq := searchSequentialByID(comments, len(comments), targetID)
	log.Printf("Sequential search for ID '%s' found at index %d", targetID, idxSeq)

	// penerapan materi Modul 12 (Selection Sort)
	// baris code ini berfungsi memanggil fungsi pengurutan selection sort (ascending)
	log.Println("Sorting comments by LikeCount (Ascending) using Selection Sort...")
	sortSelectionByLikes(comments, len(comments))

	// penerapan materi Modul 11 (Binary Search)
	// baris code ini berfungsi melakukan pencarian biner pada data yang sudah terurut sebelumnya
	targetLike := comments[len(comments)/2].LikeCount
	idxBin := searchBinaryByLikes(comments, len(comments), targetLike)
	log.Printf("Binary search for LikeCount %d found at index %d", targetLike, idxBin)

	// penerapan materi Modul 13 (Insertion Sort)
	// baris code ini berfungsi melakukan pengurutan ulang menggunakan insertion sort secara descending
	log.Println("Sorting comments by LikeCount (Descending) using Insertion Sort...")
	sortInsertionByLikesDesc(comments, len(comments))

	log.Println("--- Metrics Generation Complete ---")
}

// penerapan materi Modul 03 (Fungsi)
// baris code ini berfungsi membuat sebuah fungsi (mengembalikan nilai int) yang menjumlahkan total panjang string komentar
func calculateTotalLength(arr []Comment) int {
	total := 0
	for i := 0; i < len(arr); i++ {
		total += len(arr[i].TextOriginal)
	}
	return total
}

// penerapan materi Modul 04 (Prosedur)
// baris code ini berfungsi sebagai prosedur (tidak mengembalikan nilai) yang memanipulasi referensi memori struct (Pointer)
func sanitizeCommentText(c *Comment) {
	if c.TextOriginal == "" {
		c.TextOriginal = c.TextDisplay
	}
}

// penerapan materi Modul 05 (Rekursif)
// baris code ini berfungsi menghitung total iterasi dengan cara memanggil fungsi dirinya sendiri (rekursi) hingga batas akhir n == 0
func recursiveCount(arr []Comment, n int) int {
	if n == 0 {
		return 0
	}
	return 1 + recursiveCount(arr, n-1)
}

// penerapan materi Modul 09 (Nilai Ekstrim)
// baris code ini berfungsi meloop seluruh array untuk membandingkan dan mencari nilai terkecil (min) dan terbesar (max)
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

// penerapan materi Modul 10 (Sequential Search)
// baris code ini berfungsi melakukan pencarian sekuensial dengan iterasi satu per satu hingga menemukan elemen target
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

// penerapan materi Modul 11 (Binary Search)
// baris code ini berfungsi membagi rentang pencarian menjadi dua (kiri, kanan, tengah) untuk pencarian yang sangat cepat pada array terurut
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

// penerapan materi Modul 12 (Selection Sort)
// baris code ini berfungsi mengurutkan secara iteratif dengan mencari elemen terkecil/terbesar dan menukarnya ke posisi paling awal
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

// penerapan materi Modul 13 (Insertion Sort)
// baris code ini berfungsi mengurutkan dengan cara mengambil satu elemen dan menyisipkannya ke posisi yang tepat pada bagian array yang sudah terurut
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
