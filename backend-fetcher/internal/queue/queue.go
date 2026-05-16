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
	// QueueKey is the Redis list used as the job queue.
	QueueKey = "neurotube:jobs"
	// StatusPrefix is the prefix for job status keys.
	StatusPrefix = "neurotube:status:"
	// StatusTTL is how long job status keys live in Redis.
	StatusTTL = 1 * time.Hour
)

// JobPayload is the message published to Redis for the Python ML engine.
type JobPayload struct {
	JobID     string            `json:"jobId"`
	VideoID   string            `json:"videoId"`
	VideoInfo *youtube.VideoInfo `json:"videoInfo"`
	Comments  []youtube.Comment `json:"comments"`
	CreatedAt string            `json:"createdAt"`
}

// Publisher handles publishing jobs to Redis.
type Publisher struct {
	client *redis.Client
	ctx    context.Context
}

// NewPublisher creates a new Redis publisher from a URL.
func NewPublisher(redisURL string) (*Publisher, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid Redis URL: %w", err)
	}

	client := redis.NewClient(opts)
	ctx := context.Background()

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping Redis: %w", err)
	}

	return &Publisher{client: client, ctx: ctx}, nil
}

// PublishJob serializes the video info + comments and pushes to the Redis queue.
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

	// Set initial status
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

// SetStatus updates the status of a job in Redis.
func (p *Publisher) SetStatus(jobID, status string) error {
	statusKey := StatusPrefix + jobID
	return p.client.Set(p.ctx, statusKey, status, StatusTTL).Err()
}

// PublishError sets the job status to "failed" in Redis.
func (p *Publisher) PublishError(jobID, videoID, errMsg string) error {
	statusKey := StatusPrefix + jobID
	return p.client.Set(p.ctx, statusKey, "failed:"+errMsg, StatusTTL).Err()
}

// GetJobStatus retrieves the current status of a job from Redis.
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

// Close closes the Redis client connection.
func (p *Publisher) Close() error {
	return p.client.Close()
}
