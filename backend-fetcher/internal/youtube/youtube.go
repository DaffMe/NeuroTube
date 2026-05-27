package youtube

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"sync"
	"time"
)

// Client handles YouTube Data API v3 requests.
type Client struct {
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a new YouTube API client.
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// HasAPIKey returns true if the client has a non-empty API key.
func (c *Client) HasAPIKey() bool {
	return c.apiKey != ""
}

// ── Data types (camelCase JSON for frontend compatibility) ────────

// VideoInfo represents YouTube video metadata.
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
	NextPageToken string `json:"nextPageToken"`
	PageInfo      struct {
		TotalResults int `json:"totalResults"`
	} `json:"pageInfo"`
	Items []struct {
		ID      string `json:"id"`
		Snippet struct {
			TopLevelComment struct {
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
		Replies *struct {
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
func (c *Client) FetchVideoInfo(videoID string) (*VideoInfo, error) {
	params := url.Values{
		"part": {"snippet,statistics"},
		"id":   {videoID},
		"key":  {c.apiKey},
	}

	resp, err := c.httpClient.Get(
		"https://www.googleapis.com/youtube/v3/videos?" + params.Encode(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to call YouTube Videos API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("YouTube API returned %d: %s", resp.StatusCode, string(body))
	}

	var result videoListResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode YouTube API response: %w", err)
	}

	if len(result.Items) == 0 {
		return nil, fmt.Errorf("video not found: %s", videoID)
	}

	item := result.Items[0]
	thumbnail := item.Snippet.Thumbnails.High.URL
	if thumbnail == "" {
		thumbnail = item.Snippet.Thumbnails.Medium.URL
	}
	if thumbnail == "" {
		thumbnail = item.Snippet.Thumbnails.Default.URL
	}

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
func (c *Client) FetchComments(videoID string, limit int, onProgress func(int)) ([]Comment, error) {
	// First, we need to know the total count
	videoInfo, err := c.FetchVideoInfo(videoID)
	if err != nil {
		return nil, err
	}

	totalCommentsOnYT, err := strconv.Atoi(videoInfo.CommentCount)
	if err != nil {
		log.Printf("⚠️ Could not parse comment count %q: %v — defaulting to 0", videoInfo.CommentCount, err)
		totalCommentsOnYT = 0
	}
	log.Printf("🔍 Video %s has %d total comments on YouTube. Target: %d", videoID, totalCommentsOnYT, limit)

	// We use two strategies if needed: first 'relevance' (for top comments), then 'time' (to fill the quota)
	strategies := []string{"relevance", "time"}
	if totalCommentsOnYT <= limit {
		// If total is small, 'time' is enough to get everything
		strategies = []string{"time"}
	}

	return c.fetchCommentsConcurrent(videoID, limit, strategies, onProgress)
}

func (c *Client) fetchCommentsConcurrent(videoID string, limit int, strategies []string, onProgress func(int)) ([]Comment, error) {
	var (
		mu          sync.Mutex
		commentsMap = make(map[string]Comment)
	)

	for _, order := range strategies {
		mu.Lock()
		if len(commentsMap) >= limit && limit > 0 {
			mu.Unlock()
			break
		}
		mu.Unlock()

		log.Printf("🚀 Starting strategy: %s", order)
		
		// Initial page
		page, token, err := c.fetchCommentPage(videoID, "", order)
		if err != nil {
			continue
		}

		mu.Lock()
		for _, cm := range page {
			if len(commentsMap) < limit || limit <= 0 {
				commentsMap[cm.ID] = cm
			}
		}
		currentCount := len(commentsMap)
		mu.Unlock()

		if onProgress != nil && limit > 0 {
			percent := int(float64(currentCount) / float64(limit) * 45.0)
			if percent > 45 {
				percent = 45
			}
			onProgress(5 + percent)
		}

		if token == "" {
			continue
		}

		// Concurrent pages — use semaphore to cap concurrent API calls
		ctx, cancel := context.WithCancel(context.Background())
		var wg sync.WaitGroup
		tokenCh := make(chan string, 1000)
		tokenCh <- token

		// Limit to 5 concurrent API requests to avoid quota exhaustion
		sem := make(chan struct{}, 5)
		// Start 10 workers
		for i := 0; i < 10; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for {
					select {
					case <-ctx.Done():
						return
					case t, ok := <-tokenCh:
						if !ok {
							return
						}
						
						sem <- struct{}{}
						p, next, err := c.fetchCommentPage(videoID, t, order)
						<-sem
						if err != nil {
							log.Printf("⚠️ fetchCommentPage error for video %s: %v", videoID, err)
							cancel()
							return
						}
						
						mu.Lock()
						for _, cm := range p {
							if len(commentsMap) < limit || limit <= 0 {
								commentsMap[cm.ID] = cm
							}
						}
						currentCount := len(commentsMap)
						full := (limit > 0 && len(commentsMap) >= limit)
						mu.Unlock()

						if onProgress != nil && limit > 0 {
							percent := int(float64(currentCount) / float64(limit) * 45.0)
							if percent > 45 {
								percent = 45
							}
							onProgress(5 + percent)
						}

						if next != "" && !full {
							select {
							case tokenCh <- next:
							case <-ctx.Done():
								return
							}
						} else {
							cancel()
							return
						}
					}
				}
			}()
		}
		wg.Wait()
		cancel()
		close(tokenCh)
	}

	// Convert map to slice
	allComments := make([]Comment, 0, len(commentsMap))
	for _, c := range commentsMap {
		allComments = append(allComments, c)
	}

	// Sort by priority
	sort.SliceStable(allComments, func(i, j int) bool {
		if allComments[i].LikeCount != allComments[j].LikeCount {
			return allComments[i].LikeCount > allComments[j].LikeCount
		}
		return allComments[i].PublishedAt < allComments[j].PublishedAt
	})

	return allComments, nil
}

// fetchCommentPage fetches a single page of comments.
func (c *Client) fetchCommentPage(videoID, pageToken, order string) ([]Comment, string, error) {
	params := url.Values{
		"part":       {"snippet,replies"},
		"videoId":    {videoID},
		"maxResults": {"100"},
		"order":      {order},
		"key":        {c.apiKey},
	}
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

	var result commentThreadsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, "", fmt.Errorf("failed to decode comments response: %w", err)
	}

	comments := make([]Comment, 0, len(result.Items)*2)
	for _, item := range result.Items {
		// Add Top Level Comment
		ts := item.Snippet.TopLevelComment.Snippet
		comments = append(comments, Comment{
			ID:                    item.Snippet.TopLevelComment.ID,
			AuthorDisplayName:     ts.AuthorDisplayName,
			AuthorProfileImageURL: ts.AuthorProfileImageURL,
			TextDisplay:           ts.TextDisplay,
			TextOriginal:          ts.TextOriginal,
			LikeCount:             ts.LikeCount,
			PublishedAt:           ts.PublishedAt,
			IsReply:               false,
			ParentID:              "",
		})

		// Fetch ALL Replies
		// Extract replies from the inline expansion if present to avoid extra API requests
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
					IsReply:               true,
					ParentID:              item.Snippet.TopLevelComment.ID,
				})
			}
		}
	}

	return comments, result.NextPageToken, nil
}


