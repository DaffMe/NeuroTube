# NeuroTube — Testing Plan

## Context

NeuroTube has **zero automated tests**. The codebase has 3 layers — Go fetcher, Python ML backend, React frontend — with no unit, integration, or e2e test infrastructure. One manual `e2e_test_3.py` script exists but is not maintained or integrated into any CI pipeline.

The codebase is production-grade after 12 bug fixes (data integrity, connection leaks, stale fallbacks) across backend layers. The frontend has 9 UI/UX improvements. Before scaling or adding features, tests are needed to prevent regressions.

---

## What Needs Testing

### Layer 1 — Go Fetcher (`backend-fetcher/`)

**Priority: HIGH**

- `handler.go` — HTTP endpoints (input validation is security-critical)
- `youtube.go` — YouTube API client (handles real user data)
- `queue.go` — Redis queue operations (broker for all jobs)

**Test strategy:** Standard Go test files (`*_test.go`) in the same package. Table-driven tests with realistic inputs. No external dependencies — use interfaces/structs that can be mocked.

### Layer 2 — Python ML Backend (`backend-ml/`)

**Priority: HIGH**

- `crud.py` — All async database operations (data integrity is critical)
- `sentiment.py` — Dual-model routing, label mapping, score computation
- `spam.py` — Spam detection patterns (false positives/negatives directly affect analysis quality)
- `topics.py` — Gemini fallback chain
- `worker.py` — Job processing pipeline (end-to-end correctness)
- `analysis.py` — API endpoints

**Test strategy:** pytest with `pytest-asyncio`. Fixtures for database (in-memory SQLite), Redis (fakeredis), and mocked model pipelines. Tests must be fast (<1s per suite).

### Layer 3 — Frontend (`frontend/`)

**Priority: MEDIUM**

- `api.ts` — All service functions (network edge cases)
- `App.tsx` — State management flows (submit → loading → results → back)
- `CommentSection.tsx` — Filtering, pagination, grouping
- `AiSummary.tsx` — Keyword cloud, topic cards

**Test strategy:** Vitest (already Vite-based project). React Testing Library for components. MSW (Mock Service Worker) for API mocking.

### Layer 4 — Integration / E2E

**Priority: MEDIUM**

- Full job lifecycle: submit URL → Redis queue → ML processing → DB write → API response
- SSE streaming + SSE fallback to polling
- History round-trip (analyze → fetch → delete → verify)
- Cache hit (force=false vs force=true)

**Test strategy:** Extend the existing `e2e_test_3.py` into a formal pytest suite, or migrate to Playwright. Docker Compose for service orchestration in CI.

---

## Recommended Test Tooling

| Layer | Tool | Why |
|-------|------|-----|
| Go fetcher | `go test` + stdlib | Built-in, no extra deps, fast |
| Python ML | `pytest` + `pytest-asyncio` + `fakeredis` | Industry standard for async Python |
| Frontend | `vitest` + `@testing-library/react` | Native to Vite, fast, great DX |
| E2E | `playwright` or extend `e2e_test_3.py` | Browser automation, covers real UI |
| CI/CD | GitHub Actions | Already on GitHub |

---

## Phase 1 — Critical Tests (Do First)

These catch the bugs that were actually fixed in the recent code review:

1. **crud.py `get_analysis_history`** — outerjoin returns rows even when no completed job exists
2. **crud.py `save_video`** — camelCase→snake_case field mapping for both update and create paths
3. **api.ts `fetchHistory`** — server errors don't fall back to localStorage
4. **worker.py `process_job`** — Redis status set before DB record (zombie "analyzing" on DB failure)
5. **sentiment.py `analyze_comment`** — label mapping, score computation, empty text, model loading failure
6. **spam.py `is_spam`** — all 6 detection patterns (URL, sub4sub, crypto, prize, gibberish, word repetition)
7. **topics.py `extract_topics_local`** — empty input, 500+ comment limit, all stopwords fallback

## Phase 2 — API & Handler Contracts

1. Go handler input validation (invalid URL, malformed JSON, missing fields)
2. Go video ID extraction (all patterns: v=, youtu.be, embed, bare ID)
3. Python API endpoints (404 for missing job, correct status for processing/completed/failed)
4. SSE stream end conditions (completed, failed, client disconnect)

## Phase 3 — Worker Pipeline Integrity

1. Job deserialization from Redis (malformed JSON → graceful log and skip)
2. Progress calculation (50%→90% range, 100% final)
3. Spam comments removed before DB save
4. DB transaction rollback on error (no partial writes)
5. Redis status cleanup on failure

## Phase 4 — Frontend State & Components

1. URL input validation → error shake animation
2. History load → exact jobId (not latest-job)
3. Comment filter tabs → correct counts
4. Empty states for history, timeline, AI summary
5. Skeleton loaders render during loading

---

## What to Do

### Step 1 — Add test scaffolding

- Go: `backend-fetcher/internal/handler/handler_test.go`, `backend-fetcher/internal/youtube/youtube_test.go`, `backend-fetcher/internal/queue/queue_test.go`
- Python: `backend-ml/tests/` directory with `conftest.py`, `test_crud.py`, `test_sentiment.py`, `test_spam.py`, `test_topics.py`, `test_worker.py`
- Frontend: `frontend/vitest.config.ts` (add to existing Vite setup), `frontend/src/__tests__/`
- CI: `.github/workflows/test.yml`

### Step 2 — Write Phase 1 critical tests

Cover the bugs that were found and fixed. These prevent regressions and validate the fixes are correct.

### Step 3 — Expand to Phase 2-3

API contracts, handler validation, worker pipeline integrity.

### Step 4 — Phase 4 frontend tests

Component logic and state management. Lower priority — postpone if time-constrained.

### Step 5 — CI integration

Push runs tests. Fail on any test failure.

---

## Risks & Trade-offs

- **Test speed**: ML model tests (sentiment.py) are slow if they load real models. Use mocks/fixtures for unit tests; keep integration tests in a separate `tests/integration/` suite that may be slower.
- **Database state**: CRUD tests need a clean DB per test. Use transactions that roll back, or an in-memory SQLite file per test.
- **Redis**: Use `fakeredis` for unit tests, real Redis only in integration tests.
- **Go handler tests**: SSE stream tests are tricky to test in-process. Focus on the HTTP contract (status codes, response shape) and test SSE behavior in integration tests.
- **Flakiness**: SSE timing, network retries, and DB race conditions can cause flaky tests. Mock external dependencies aggressively in unit tests.

---

## Output

After this plan, implementation will produce:
- Test scaffolding for all 3 layers
- Phase 1 critical tests (covering the bugs that were fixed)
- Phase 2-3 tests for API contracts and worker pipeline
- GitHub Actions CI workflow that runs tests on push
- Phase 4 frontend tests as stretch goal
