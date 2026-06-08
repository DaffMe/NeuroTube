package queue

import (
	"context" // Mengelola pembatalan tugas paksa atau jatah jeda waktu dari suatu proses
	"encoding/json" // Membongkar dan membungkus struktur data Golang ke dalam bentuk teks JSON
	"fmt" // Menggabungkan pesan error dengan nama variabel aslinya secara rapi
	"time" // Mengatur waktu saat ini, waktu durasi, dan waktu kedaluwarsa hapus otomatis di memori (TTL)

	"github.com/redis/go-redis/v9" // Pustaka eksternal kuat penghubung program Golang ke database RAM (Redis)

	"neurotube/backend-fetcher/internal/youtube" // Memanggil folder modul YouTube mandiri agar program ini kenal dengan format struct Komentar
)

// Konstanta (nilai tetap) yang digunakan sebagai kunci (key) di dalam memori Redis
const (
	// QueueKey is the Redis list used as the job queue.
	// Kunci antrean utama untuk menampung JSON data komentar sebelum diproses Python
	QueueKey = "neurotube:jobs"
	
	// StatusPrefix is the prefix for job status keys.
	// Awalan untuk kunci status, nantinya akan digabung dengan JobID (misal: neurotube:status:12345)
	StatusPrefix = "neurotube:status:"
	
	// StatusTTL is how long job status keys live in Redis.
	// Batas waktu hidup (Time-To-Live) data di Redis. Dihapus otomatis setelah 1 jam untuk hemat RAM
	StatusTTL = 1 * time.Hour
)

// JobPayload is the message published to Redis for the Python ML engine.
// penerapan materi Modul 06 (Tipe Bentukan)
// baris code ini berfungsi membuat struktur tipe data payload yang menggabungkan banyak tipe (string, pointer, dan slice/array)
type JobPayload struct {
	JobID     string            `json:"jobId"`     // ID unik tugas
	VideoID   string            `json:"videoId"`   // ID video terkait
	VideoInfo *youtube.VideoInfo `json:"videoInfo"` // Pointer ke data informasi video
	Comments  []youtube.Comment `json:"comments"`  // Array/Slice berisi ribuan komentar
	CreatedAt string            `json:"createdAt"` // Waktu tugas dibuat
}

// Publisher handles publishing jobs to Redis.
// Struct ini membungkus koneksi client Redis dan Context untuk mengelola status jaringan
type Publisher struct {
	client *redis.Client
	ctx    context.Context
}

// NewPublisher creates a new Redis publisher from a URL.
// penerapan materi Modul 03 (Fungsi)
// baris code ini berfungsi sebagai fungsi yang bertugas membuat koneksi Redis lalu mengembalikan referensinya ke fungsi pemanggil
func NewPublisher(redisURL string) (*Publisher, error) {
	// Memecah format URL Redis (redis://...) menjadi opsi koneksi yang bisa dibaca library
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid Redis URL: %w", err)
	}

	// Membuka koneksi baru
	client := redis.NewClient(opts)
	ctx := context.Background()

	// Test connection
	// Menguji koneksi dengan mengirim perintah "Ping". Jika gagal, kembalikan error
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping Redis: %w", err)
	}

	// Jika sukses, kembalikan struct Publisher
	return &Publisher{client: client, ctx: ctx}, nil
}

// PublishJob serializes the video info + comments and pushes to the Redis queue.
// Fungsi ini mengubah struct JobPayload menjadi format string JSON, lalu memasukkannya ke antrean Redis
func (p *Publisher) PublishJob(jobID, videoID string, videoInfo *youtube.VideoInfo, comments []youtube.Comment) error {
	// Merakit data menjadi satu kesatuan objek JobPayload
	payload := JobPayload{
		JobID:     jobID,
		VideoID:   videoID,
		VideoInfo: videoInfo,
		Comments:  comments,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	// Mengubah objek Go menjadi format JSON (serialization/marshaling)
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal job payload: %w", err)
	}

	// Set initial status
	// Menyimpan status awal "processing" ke Redis
	statusKey := StatusPrefix + jobID
	if err := p.client.Set(p.ctx, statusKey, "processing", StatusTTL).Err(); err != nil {
		return fmt.Errorf("failed to set job status: %w", err)
	}

	// Push to queue (LPUSH so Python BRPOP gets FIFO order)
	// Memasukkan JSON ke antrean dengan perintah LPUSH (Left Push). 
	// Python nanti akan mengambilnya dengan BRPOP (dari sisi kanan), menciptakan konsep FIFO (First In First Out)
	if err := p.client.LPush(p.ctx, QueueKey, string(data)).Err(); err != nil {
		return fmt.Errorf("failed to push job to queue: %w", err)
	}

	return nil
}

// GetCache retrieves the cached jobId for a video, if it exists.
// Mengecek apakah suatu video sudah pernah dianalisis dan hasilnya masih ada di Redis (Cache)
func (p *Publisher) GetCache(videoID string) (string, error) {
	cacheKey := "neurotube:cache:" + videoID
	// Mengambil nilai berdasarkan kunci cache
	result, err := p.client.Get(p.ctx, cacheKey).Result()
	if err == redis.Nil {
		return "", nil // Cache miss: Data tidak ditemukan
	}
	if err != nil {
		return "", err // Error koneksi Redis
	}
	return result, nil // Mengembalikan ID pekerjaan (JobID) lama
}

// SetStatus updates the status of a job in Redis.
// Menimpa nilai status pekerjaan saat ini (misal diubah dari "processing" jadi "completed")
func (p *Publisher) SetStatus(jobID, status string) error {
	statusKey := StatusPrefix + jobID
	return p.client.Set(p.ctx, statusKey, status, StatusTTL).Err()
}

// PublishError sets the job status to "failed" in Redis.
// Jika terjadi masalah di Golang, ubah status menjadi failed disertai pesan errornya
func (p *Publisher) PublishError(jobID, videoID, errMsg string) error {
	statusKey := StatusPrefix + jobID
	return p.client.Set(p.ctx, statusKey, "failed:"+errMsg, StatusTTL).Err()
}

// GetJobStatus retrieves the current status of a job from Redis.
// Mengambil status terakhir untuk dikirimkan via API ke Frontend
func (p *Publisher) GetJobStatus(jobID string) (string, error) {
	statusKey := StatusPrefix + jobID
	result, err := p.client.Get(p.ctx, statusKey).Result()
	if err == redis.Nil {
		return "", fmt.Errorf("job not found")
	}
	if err != nil {
		return "", err
	}
	return result, nil
}

// SetProgress updates the numeric progress percentage of a job in Redis.
// Memperbarui nilai angka persentase loading (0 sampai 100)
func (p *Publisher) SetProgress(jobID string, percent int) error {
	progressKey := "neurotube:progress:" + jobID
	return p.client.Set(p.ctx, progressKey, percent, StatusTTL).Err()
}

// GetProgress retrieves the numeric progress percentage of a job from Redis.
// Mengambil angka persentase loading saat ini
func (p *Publisher) GetProgress(jobID string) (int, error) {
	progressKey := "neurotube:progress:" + jobID
	val, err := p.client.Get(p.ctx, progressKey).Int()
	if err == redis.Nil {
		return 0, nil // Jika belum ada, anggap 0%
	}
	return val, err
}

// Close closes the Redis client connection.
// Menutup koneksi database secara manual
func (p *Publisher) Close() error {
	return p.client.Close()
}
