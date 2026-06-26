package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"neurotube/backend-fetcher/internal/youtube"
)

const (
	QueueKey = "neurotube:jobs"
	
	StatusPrefix = "neurotube:status:"
	
	StatusTTL = 1 * time.Hour
)

type JobPayload struct {
	JobID     string            `json:"jobId"`
	VideoID   string            `json:"videoId"`   // ID video terkait
	VideoInfo *youtube.VideoInfo `json:"videoInfo"`
	Comments  []youtube.Comment `json:"comments"`
	CreatedAt string            `json:"createdAt"`
}

type Publisher struct {
	client *redis.Client
	ctx    context.Context
}

func NewPublisher(redisURL string) (*Publisher, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid Redis URL: %w", err)
	}

	// Membuka koneksi baru
	client := redis.NewClient(opts)
	ctx := context.Background()

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping Redis: %w", err)
	}

	return &Publisher{client: client, ctx: ctx}, nil
}

func (p *Publisher) PublishJob(jobID, videoID string, videoInfo *youtube.VideoInfo, comments []youtube.Comment) error {
	payload := JobPayload{
		JobID:     jobID,
		VideoID:   videoID,
		VideoInfo: videoInfo,
		Comments:  comments,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal job payload: %w", err)
	}

	statusKey := StatusPrefix + jobID
	if err := p.client.Set(p.ctx, statusKey, "processing", StatusTTL).Err(); err != nil {
		return fmt.Errorf("failed to set job status: %w", err)
	}

	// Push to queue (LPUSH so Python BRPOP gets FIFO order)
	if err := p.client.LPush(p.ctx, QueueKey, string(data)).Err(); err != nil {
		return fmt.Errorf("failed to push job to queue: %w", err)
	}

	return nil
}

// GetCache retrieves the cached jobId for a video, if it exists.
func (p *Publisher) GetCache(videoID string) (string, error) {
	cacheKey := "neurotube:cache:" + videoID
	result, err := p.client.Get(p.ctx, cacheKey).Result()
	if err == redis.Nil {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return result, nil
}

func (p *Publisher) SetStatus(jobID, status string) error {
	statusKey := StatusPrefix + jobID
	return p.client.Set(p.ctx, statusKey, status, StatusTTL).Err()
}

func (p *Publisher) PublishError(jobID, videoID, errMsg string) error {
	statusKey := StatusPrefix + jobID
	return p.client.Set(p.ctx, statusKey, "failed:"+errMsg, StatusTTL).Err()
}

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

func (p *Publisher) SetProgress(jobID string, percent int) error {
	progressKey := "neurotube:progress:" + jobID
	return p.client.Set(p.ctx, progressKey, percent, StatusTTL).Err()
}

func (p *Publisher) GetProgress(jobID string) (int, error) {
	progressKey := "neurotube:progress:" + jobID
	val, err := p.client.Get(p.ctx, progressKey).Int()
	if err == redis.Nil {
		return 0, nil
	}
	return val, err
}

func (p *Publisher) Close() error {
	return p.client.Close()
}
