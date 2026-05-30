# NeuroTube — Claude Code Instructions

## Project Overview

NeuroTube is a full-stack YouTube comment sentiment analyzer with 3 services:
- **Frontend** (`frontend/`): React 19 + TypeScript + Tailwind CSS v4 + Vite
- **Fetcher** (`backend-fetcher/`): Go + Chi router — fetches YouTube data, publishes to Redis
- **ML Backend** (`backend-ml/`): Python + FastAPI + SQLModel — sentiment analysis, topic extraction

## Key Conventions

- Python async: use `pytest-asyncio` with `pytest.ini` config
- Go tests: standard `*_test.go` files in the same package
- Frontend: Vitest (already Vite-based project — add to existing tooling)
- CI: GitHub Actions via `.github/workflows/`

## Redis Keys

| Key | Type | TTL |
|-----|------|-----|
| `neurotube:jobs` | List (queue) | — |
| `neurotube:status:{jobId}` | String | 1 hour |
| `neurotube:progress:{jobId}` | String | 1 hour |
| `neurotube:cache:{videoId}` | String | 24 hours |

## Database Tables

`analysis_jobs`, `video_data`, `comment_data`, `sentiment_summaries` — all via SQLModel.

## Critical Paths

1. **Analyze flow**: Frontend → Go handler → Redis queue → Python worker → PostgreSQL → API response
2. **History flow**: Frontend → GET /api/history → CRUD → response
3. **SSE streaming**: Frontend → GET /api/status/{jobId}/stream → Go handler reads Redis → SSE events

## Recent Bug Fixes (do not regress)

1. `crud.py get_analysis_history`: outerjoin filter must be in join condition, not WHERE clause
2. `crud.py save_video`: camelCase→snake_case mapping via `_VIDEO_FIELD_MAP`
3. `api.ts fetchHistory`: broad error catch, all errors fall back to localStorage
4. `db/session.py get_redis`: shared singleton via `_redis_client` global
5. `worker.py process_job`: DB record created BEFORE Redis "analyzing" status
6. `worker.py`: dead semaphore removed, pipeline_lock serializes GPU calls
7. `sentiment.py`: duplicate asyncio import removed, unused client param removed
