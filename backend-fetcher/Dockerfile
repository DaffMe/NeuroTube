# -----------------------------------------------------------------------------
# DOCKERFILE: GOLANG FETCHER
# Berfungsi sebagai resep (blueprint) untuk membungkus seluruh aplikasi Go 
# menjadi sebuah kontainer mandiri yang bisa dijalankan di mana saja tanpa error.
# -----------------------------------------------------------------------------

# ── Tahap 1: Pembangunan (Build Stage) ──────────────────────────────────
# Menggunakan sistem operasi Linux Alpine berukuran mini dengan Go versi 1.24
FROM golang:1.24-alpine AS builder

# Tetapkan ruang kerja utama (Folder kerja) di dalam kontainer
WORKDIR /app

# Unduh paket git karena bahasa Go sering membutuhkan git untuk mengunduh pustaka luar (dependencies)
RUN apk add --no-cache git

# Trik Optimasi: Salin file konfigurasi pustaka (go.mod) terlebih dahulu
# Jika tidak ada perubahan paket, Docker akan memakai ingatan (cache) lama agar build melesat cepat
COPY go.mod ./
RUN go mod download || true

# Salin semua sisa kode asli ke dalam kontainer
COPY . .

# Rapihkan pustaka yang tidak terpakai, matikan fitur bahasa C (CGO_ENABLED=0 agar hasil murni statis),
# lalu satukan seluruh kode menjadi 1 file aplikasi eksekusi (binary) bernama "/fetcher"
RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -o /fetcher ./cmd/main.go

# ── Tahap 2: Eksekusi (Runtime Stage) ──────────────────────────────────
# Mulai dari awal lagi dengan sistem operasi Alpine yang benar-benar bersih dan ringan
# (tanpa ada file compiler/penerjemah Golang yang berat)
FROM alpine:3.19

# Pasang sertifikat HTTPS keamanan dasar dan pengaturan zona waktu
RUN apk add --no-cache ca-certificates tzdata

# Ambil HANYA file "/fetcher" yang sudah jadi dari Tahap 1 tadi, buang sisanya
COPY --from=builder /fetcher /fetcher

# Beritahu Docker bahwa aplikasi ini berjalan di port 8080
EXPOSE 8080

# Saat kontainer dinyalakan, langsung jalankan file "/fetcher" ini
ENTRYPOINT ["/fetcher"]
