package youtube

import (
	"context" // Mengelola umur atau jatah jeda waktu suatu sub-pekerja (goroutine)
	"encoding/json" // Mengubah data JSON yang baru diunduh dari Google menjadi bentuk struct Golang
	"fmt" // Mencetak pesan error berformat dengan tambahan variabel
	"io" // Menangani aliran data mentah (stream bytes) saat server mendownload teks panjang
	"log" // Mencetak rekaman jejak proses pekerja ke layar hitam terminal
	"net/http" // Melakukan pemanggilan web jarak jauh (API Request GET) ke komputer Google
	"net/url" // Menyusun rapi parameter URL (seperti ?key=xyz&id=123) tanpa berantakan
	"sort" // Digunakan untuk memanggil mesin pengurut array secara otomatis (built-in sort)
	"strconv" // Mengubah huruf teks (String) murni kembali menjadi angka mutlak (Integer)
	"sync" // Menyediakan fasilitas gembok data (Mutex) agar aman saat banyak thread bekerja berebutan
	"time" // Membantu mengatur batas toleransi lama proses menembak web (Request Timeout)
)

// Client handles YouTube Data API v3 requests.
// Struct ini membungkus koneksi HTTP dan API key yang digunakan untuk menembak server YouTube
type Client struct {
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a new YouTube API client.
// Fungsi inisialisasi Client baru, dengan waktu tunggu (timeout) maksimal 30 detik untuk setiap HTTP Request
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ── Data types (camelCase JSON for frontend compatibility) ────────

// VideoInfo represents YouTube video metadata.
// Struct untuk memetakan informasi detail mengenai suatu video
type VideoInfo struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	ChannelTitle string `json:"channelTitle"`
	Thumbnail    string `json:"thumbnail"`
	PublishedAt  string `json:"publishedAt"`
	ViewCount    string `json:"viewCount"`
	LikeCount    string `json:"likeCount"`
	CommentCount string `json:"commentCount"`
	Description  string `json:"description"`
}

// Comment represents a single YouTube comment.
// penerapan materi Modul 06 (Tipe Bentukan)
// baris code ini berfungsi mendefinisikan tipe data komposit baru (struct) bernama Comment untuk menampung berbagai atribut komentar
type Comment struct {
	ID                    string `json:"id"`
	AuthorDisplayName     string `json:"authorDisplayName"`
	AuthorProfileImageURL string `json:"authorProfileImageUrl"`
	TextDisplay           string `json:"textDisplay"`
	TextOriginal          string `json:"textOriginal"`
	LikeCount             int    `json:"likeCount"`
	PublishedAt           string `json:"publishedAt"`
	IsReply               bool   `json:"isReply"`
	ParentID              string `json:"parentId"`
}

// ── YouTube API response structs ────────────────────────────────
// Kumpulan struct rumit di bawah ini bertugas memetakan (parsing) struktur JSON asli dari Google API
// yang bersarang (nested) ke dalam format yang dimengerti oleh Golang.

type videoListResponse struct {
	Items []struct {
		ID      string `json:"id"`
		Snippet struct {
			Title        string `json:"title"`
			Description  string `json:"description"`
			ChannelTitle string `json:"channelTitle"`
			ChannelID    string `json:"channelId"`
			PublishedAt  string `json:"publishedAt"`
			Thumbnails   struct {
				High struct {
					URL string `json:"url"`
				} `json:"high"`
				Medium struct {
					URL string `json:"url"`
				} `json:"medium"`
				Default struct {
					URL string `json:"url"`
				} `json:"default"`
			} `json:"thumbnails"`
		} `json:"snippet"`
		Statistics struct {
			ViewCount    string `json:"viewCount"`
			LikeCount    string `json:"likeCount"`
			CommentCount string `json:"commentCount"`
		} `json:"statistics"`
	} `json:"items"`
}

type commentThreadsResponse struct {
	NextPageToken string `json:"nextPageToken"` // Token untuk membuka halaman/batch komentar selanjutnya
	PageInfo      struct {
		TotalResults int `json:"totalResults"`
	} `json:"pageInfo"`
	Items []struct {
		ID      string `json:"id"`
		Snippet struct {
			TopLevelComment struct { // Komentar utama (bukan balasan)
				ID      string `json:"id"`
				Snippet struct {
					AuthorDisplayName     string `json:"authorDisplayName"`
					AuthorProfileImageURL string `json:"authorProfileImageUrl"`
					TextDisplay           string `json:"textDisplay"`
					TextOriginal          string `json:"textOriginal"`
					LikeCount             int    `json:"likeCount"`
					PublishedAt           string `json:"publishedAt"`
				} `json:"snippet"`
			} `json:"topLevelComment"`
			TotalReplyCount int  `json:"totalReplyCount"`
			CanReply        bool `json:"canReply"`
		} `json:"snippet"`
		Replies *struct { // Anak komentar (balasan/replies) dari komentar utama di atas
			Comments []struct {
				ID      string `json:"id"`
				Snippet struct {
					AuthorDisplayName     string `json:"authorDisplayName"`
					AuthorProfileImageURL string `json:"authorProfileImageUrl"`
					TextDisplay           string `json:"textDisplay"`
					TextOriginal          string `json:"textOriginal"`
					LikeCount             int    `json:"likeCount"`
					PublishedAt           string `json:"publishedAt"`
				} `json:"snippet"`
			} `json:"comments"`
		} `json:"replies"`
	} `json:"items"`
}

// ── Public methods ───────────────────────────────────────────────

// FetchVideoInfo retrieves metadata for a YouTube video.
// Fungsi untuk memanggil endpoint "videos" pada YouTube API demi mengambil statistik video
func (c *Client) FetchVideoInfo(videoID string) (*VideoInfo, error) {
	// Membentuk paramater (query parameter) seperti ?part=snippet&id=xxx&key=xxx
	params := url.Values{
		"part": {"snippet,statistics"},
		"id":   {videoID},
		"key":  {c.apiKey},
	}

	// Menembak server YouTube via HTTP GET
	resp, err := c.httpClient.Get(
		"https://www.googleapis.com/youtube/v3/videos?" + params.Encode(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to call YouTube Videos API: %w", err)
	}
	defer resp.Body.Close()

	// Cek kode status HTTP (Jika bukan 200 OK berarti terjadi kesalahan)
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("YouTube API returned %d: %s", resp.StatusCode, string(body))
	}

	// Mengubah balasan teks JSON menjadi struktur data Go
	var result videoListResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode YouTube API response: %w", err)
	}

	if len(result.Items) == 0 {
		return nil, fmt.Errorf("video not found: %s", videoID)
	}

	item := result.Items[0]
	// Mengambil gambar pratinjau (thumbnail) dengan kualitas tertinggi yang tersedia
	thumbnail := item.Snippet.Thumbnails.High.URL
	if thumbnail == "" {
		thumbnail = item.Snippet.Thumbnails.Medium.URL
	}
	if thumbnail == "" {
		thumbnail = item.Snippet.Thumbnails.Default.URL
	}

	// Membungkus ulang ke format sederhana yang bersih
	return &VideoInfo{
		ID:           item.ID,
		Title:        item.Snippet.Title,
		ChannelTitle: item.Snippet.ChannelTitle,
		Thumbnail:    thumbnail,
		PublishedAt:  item.Snippet.PublishedAt,
		ViewCount:    item.Statistics.ViewCount,
		LikeCount:    item.Statistics.LikeCount,
		CommentCount: item.Statistics.CommentCount,
		Description:  item.Snippet.Description,
	}, nil
}

// FetchComments fetches up to 'limit' comments for a video using concurrent goroutines.
// Fungsi pembungkus (wrapper) untuk menjalankan algoritma pengunduhan komentar yang lebih cerdas dan paralel
func (c *Client) FetchComments(videoID string, limit int, onProgress func(int)) ([]Comment, error) {
	// First, we need to know the total count
	// Mengambil jumlah komentar total agar tahu strategi apa yang harus dipakai
	videoInfo, err := c.FetchVideoInfo(videoID)
	if err != nil {
		return nil, err
	}

	totalCommentsOnYT, _ := strconv.Atoi(videoInfo.CommentCount)
	log.Printf("🔍 Video %s has %d total comments on YouTube. Target: %d", videoID, totalCommentsOnYT, limit)

	// We use two strategies if needed: first 'relevance' (for top comments), then 'time' (to fill the quota)
	// Kita unduh dulu komentar yang "paling relevan/populer", lalu "terbaru"
	strategies := []string{"relevance", "time"}
	if totalCommentsOnYT <= limit {
		// If total is small, 'time' is enough to get everything
		strategies = []string{"time"}
	}

	return c.fetchCommentsConcurrent(videoID, limit, strategies, onProgress)
}

// Fungsi utama penarikan ribuan komentar secara serentak (Parallel Processing / Multithreading)
func (c *Client) fetchCommentsConcurrent(videoID string, limit int, strategies []string, onProgress func(int)) ([]Comment, error) {
	var (
		mu          sync.Mutex // Mengunci data (Mutex) agar aman saat banyak thread (pekerja) mencoba menulis bersamaan
		commentsMap = make(map[string]Comment) // Menggunakan struktur data Map (kamus) agar tidak ada komentar duplikat (ID sebagai key)
	)

	// Melakukan iterasi ke setiap strategi urutan (Relevance / Time)
	for _, order := range strategies {
		mu.Lock()
		if len(commentsMap) >= limit && limit > 0 {
			mu.Unlock()
			break // Jika kuota limit sudah tercapai, berhenti
		}
		mu.Unlock()

		log.Printf("🚀 Starting strategy: %s", order)
		
		// Initial page
		// Mengambil halaman pertama (tanpa token) untuk mendapatkan token halaman selanjutnya
		page, token, err := c.fetchCommentPage(videoID, "", order)
		if err != nil {
			continue
		}

		// Memasukkan kumpulan komentar awal ke dalam Map
		mu.Lock()
		for _, cm := range page {
			if len(commentsMap) < limit || limit <= 0 {
				commentsMap[cm.ID] = cm
			}
		}
		currentCount := len(commentsMap)
		mu.Unlock()

		// Menghitung persentase kemajuan (Maksimal 45% per strategi)
		if onProgress != nil && limit > 0 {
			percent := int(float64(currentCount) / float64(limit) * 45.0)
			if percent > 45 {
				percent = 45
			}
			onProgress(5 + percent)
		}

		if token == "" {
			continue // Jika tidak ada halaman lanjut, pindah ke strategi lain
		}

		// Concurrent pages
		// Menyiapkan pekerja (Goroutines) untuk mengunduh halaman selanjutnya secara paralel
		ctx, cancel := context.WithCancel(context.Background())
		var wg sync.WaitGroup // Penghitung jumlah pekerja
		tokenCh := make(chan string, 1000) // Saluran data (Channel) yang berisi tiket token halaman
		tokenCh <- token // Memasukkan token pertama ke dalam antrean saluran

		// Start 10 workers
		// Menyewa 10 pekerja serentak
		for i := 0; i < 10; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done() // Kurangi penghitung jika pekerja ini selesai
				for {
					select {
					case <-ctx.Done():
						return // Jika disuruh berhenti (karena limit penuh), langsung pulang
					case t, ok := <-tokenCh:
						if !ok {
							return // Jika saluran ditutup, pulang
						}
						
						// Memanggil API YouTube untuk token spesifik ini
						p, next, err := c.fetchCommentPage(videoID, t, order)
						if err != nil {
							log.Printf("⚠️ fetchCommentPage error for video %s: %v", videoID, err)
							cancel() // Berhentikan pekerja lain jika ada error fatal
							return
						}
						
						// Mengunci dan menyisipkan hasil halaman ini ke Map gabungan
						mu.Lock()
						for _, cm := range p {
							if len(commentsMap) < limit || limit <= 0 {
								commentsMap[cm.ID] = cm
							}
						}
						currentCount := len(commentsMap)
						full := (limit > 0 && len(commentsMap) >= limit)
						mu.Unlock()

						// Update progres
						if onProgress != nil && limit > 0 {
							percent := int(float64(currentCount) / float64(limit) * 45.0)
							if percent > 45 {
								percent = 45
							}
							onProgress(5 + percent)
						}

						// Jika masih ada halaman setelahnya dan kotak limit belum penuh, lemparkan token baru ke saluran
						if next != "" && !full {
							select {
							case tokenCh <- next:
							case <-ctx.Done():
								return
							}
						} else {
							// Jika limit sudah penuh, batalkan seluruh sisa pekerjaan di semua goroutine
							cancel()
							return
						}
					}
				}
			}()
		}
		// Menunggu ke-10 pekerja menyelesaikan tugasnya
		wg.Wait()
		cancel()
		close(tokenCh) // Menutup saluran komunikasi
	}

	// Convert map to slice
	// Karena Map tidak punya urutan, kita tuangkan kembali datanya ke struktur Slice (Array dinamis)
	allComments := make([]Comment, 0, len(commentsMap))
	for _, c := range commentsMap {
		allComments = append(allComments, c)
	}

	// Sort by priority
	// Mengurutkan array agar komentar dengan Like terbanyak ada di paling atas (Algoritma Sorting bawaan Go)
	sort.SliceStable(allComments, func(i, j int) bool {
		if allComments[i].LikeCount != allComments[j].LikeCount {
			return allComments[i].LikeCount > allComments[j].LikeCount // Urut berdasarkan Like secara descending
		}
		return allComments[i].PublishedAt < allComments[j].PublishedAt // Jika Like sama, urutkan berdasar waktu (terlama)
	})

	// Run comment metrics asynchronously to not block the main fetch pipeline
	// Memanggil modul algoritma perkuliahan Anda secara asinkron tanpa mengganggu alur utama aplikasi
	go c.logCommentMetrics(allComments)

	return allComments, nil
}

// fetchCommentPage fetches a single page of comments.
// Fungsi teknis untuk menembak endpoint `commentThreads` dan meraup maksimal 100 balasan per satu kali panggil
func (c *Client) fetchCommentPage(videoID, pageToken, order string) ([]Comment, string, error) {
	params := url.Values{
		"part":       {"snippet,replies"},
		"videoId":    {videoID},
		"maxResults": {"100"},
		"order":      {order},
		"key":        {c.apiKey},
	}
	// Tambahkan kunci token halaman jika disediakan (untuk pagination)
	if pageToken != "" {
		params.Set("pageToken", pageToken)
	}

	resp, err := c.httpClient.Get(
		"https://www.googleapis.com/youtube/v3/commentThreads?" + params.Encode(),
	)
	if err != nil {
		return nil, "", fmt.Errorf("failed to call YouTube CommentThreads API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, "", fmt.Errorf("YouTube CommentThreads API returned %d: %s", resp.StatusCode, string(body))
	}

	// Parsing dari struktur teks JSON rumit ke struktur struct Go
	var result commentThreadsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, "", fmt.Errorf("failed to decode comments response: %w", err)
	}

	// Menginisialisasi memori array dengan kapasitas tebakan awal yang lapang (mencegah relokasi memori berulang)
	comments := make([]Comment, 0, len(result.Items)*2)
	for _, item := range result.Items {
		// Add Top Level Comment
		// Mengekstrak dan merakit Data Komentar Tingkat Atas
		ts := item.Snippet.TopLevelComment.Snippet
		comments = append(comments, Comment{
			ID:                    item.Snippet.TopLevelComment.ID,
			AuthorDisplayName:     ts.AuthorDisplayName,
			AuthorProfileImageURL: ts.AuthorProfileImageURL,
			TextDisplay:           ts.TextDisplay,
			TextOriginal:          ts.TextOriginal,
			LikeCount:             ts.LikeCount,
			PublishedAt:           ts.PublishedAt,
			IsReply:               false, // Bukan balasan
			ParentID:              "",
		})

		// Fetch ALL Replies
		// Extract replies from the inline expansion if present to avoid extra API requests
		// Mengekstrak anak-anak komentar (jika komentar utama tersebut punya balasan) tanpa perlu panggil API kedua kali
		if item.Replies != nil {
			for _, reply := range item.Replies.Comments {
				rs := reply.Snippet
				comments = append(comments, Comment{
					ID:                    reply.ID,
					AuthorDisplayName:     rs.AuthorDisplayName,
					AuthorProfileImageURL: rs.AuthorProfileImageURL,
					TextDisplay:           rs.TextDisplay,
					TextOriginal:          rs.TextOriginal,
					LikeCount:             rs.LikeCount,
					PublishedAt:           rs.PublishedAt,
					IsReply:               true, // Status menandakan ini adalah anak balasan
					ParentID:              item.Snippet.TopLevelComment.ID, // Menunjuk ke ID induknya
				})
			}
		}
	}

	// Mengembalikan list komentar dan kunci "halaman selanjutnya" jika masih ada
	return comments, result.NextPageToken, nil
}
