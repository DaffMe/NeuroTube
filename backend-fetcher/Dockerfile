# ── Build stage ───────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install git for module downloads
RUN apk add --no-cache git

# Copy go.mod first for layer caching
COPY go.mod ./
RUN go mod download || true

# Copy source and build
COPY . .
RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -o /fetcher ./cmd/main.go

# ── Runtime stage ─────────────────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /fetcher /fetcher

EXPOSE 8080

ENTRYPOINT ["/fetcher"]
