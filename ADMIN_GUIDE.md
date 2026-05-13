# 🛠️ Neurotube Admin Guide

This guide provides instructions for managing, monitoring, and troubleshooting the Neurotube microservices ecosystem.

---

## 🚀 Quick Control

### Start the entire system
```bash
docker compose up -d
```

### Stop the entire system
```bash
docker compose down
```

### Restart all services
```bash
docker compose restart
```

### Rebuild and update (after code changes)
```bash
docker compose up --build -d
```

---

## 📊 Monitoring & Logs

### View combined logs
```bash
docker compose logs -f
```

### View logs for a specific service
```bash
docker compose logs -f backend-fetcher
docker compose logs -f backend-ml
docker compose logs -f frontend
```

### Check container health
```bash
docker compose ps
```

---

## 💾 Infrastructure Access

### PostgreSQL (Database)
The database stores video metadata, analyzed comments, and sentiment summaries.
- **Connection**: `postgresql://neurotube:neurotube_secret@localhost:5432/neurotube`
- **Interactive Shell**:
  ```bash
  docker exec -it neurotube-postgres psql -U neurotube
  ```

### Redis (Queue & Status)
Redis handles job queuing between Go and Python, and stores real-time job status.
- **Interactive CLI**:
  ```bash
  docker exec -it neurotube-redis redis-cli
  ```
- **Check Queue Length**: `LLEN neurotube:jobs`
- **Check Job Status**: `GET neurotube:status:<jobId>`

---

## 🔧 Configuration (.env)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `YOUTUBE_API_KEY` | Your Google Cloud API Key | **Required** |
| `POSTGRES_PASSWORD` | Database password | `neurotube_secret` |
| `FETCHER_PORT` | Port for Go Fetcher API | `8080` |
| `ML_PORT` | Port for Python ML API | `8000` |
| `FRONTEND_PORT` | Port for React UI | `5173` |

---

## 💡 Troubleshooting

### "Failed to get job status" (404)
- **Cause**: The fetcher hasn't reached the initial "processing" state yet, or Redis is down.
- **Action**: Check `docker compose logs backend-fetcher`. Ensure Redis is healthy.

### "ERR_EMPTY_RESPONSE" or API Hangs
- **Cause**: Python event loop is blocked or the ML service crashed.
- **Action**: Check `docker compose logs backend-ml`. Ensure you are using the `redis.asyncio` client in the worker.

### Analysis takes too long
- **Cause**: YouTube video has millions of comments.
- **Action**: The system fetches *all* comments. For faster results during testing, use videos with < 5,000 comments.

### YouTube API Errors (403/429)
- **Cause**: API quota exceeded or invalid key.
- **Action**: Check `.env` for a valid `YOUTUBE_API_KEY` and monitor quota in [Google Cloud Console](https://console.cloud.google.com/).

---

## 🛠️ Development Tips

### Local Go/Python Environment
To get autocomplete and linting in your IDE (VS Code/Cursor) without red squiggles:
- **Go**: Run `go mod tidy` in `./backend-fetcher`.
- **Python**: Run `pip install redis fastapi sqlmodel vaderSentiment httpx` on your host machine.
