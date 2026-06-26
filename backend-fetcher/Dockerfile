FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod ./
RUN go mod download || true

COPY . .

RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -o /fetcher ./cmd/main.go

FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /fetcher /fetcher

EXPOSE 8080

ENTRYPOINT ["/fetcher"]
