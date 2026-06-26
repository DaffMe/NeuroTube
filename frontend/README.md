# NeuroTube Frontend

This directory contains the user interface for the NeuroTube project, built with React 19, TypeScript, and Vite.

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI (Radix UI primitives)
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React

## Key Features

- **CRUD Komentar Manual**: Tambah, edit, dan hapus komentar melalui form di `CommentSection.tsx`.
- **Sequential & Binary Search**: Pencarian komentar berdasarkan kata kunci menggunakan 2 algoritma berbeda (pilih via dropdown).
- **Selection Sort**: Mengurutkan komentar berdasarkan panjang teks (terpanjang/terpendek).
- **Insertion Sort**: Mengurutkan komentar berdasarkan tingkat sentimen (positif → netral → negatif).
- **Statistik Sentimen**: Filter buttons menampilkan jumlah komentar per kategori sentimen.

## Key Files

- `src/App.tsx` — Halaman utama yang mengoordinasikan seluruh alur dan interaksi web.
- `src/services/api.ts` — Fungsi HTTP Request ke Backend.
- `src/lib/algorithms.ts` — Implementasi algoritma Search (Sequential & Binary) dan Sort (Selection & Insertion) versi Client-side (TypeScript).
- `src/lib/goAlgorithms.ts` — Fetch wrapper untuk mengirim permintaan Search, Sort, dan CRUD ke Backend Go.
- `src/lib/timeline.ts` — Algoritma perhitungan grafik garis waktu (Timeline).
- `src/components/CommentSection.tsx` — UI komentar dengan form CRUD, search bar, sort dropdown, dan *toggle switch* Go Backend.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Build for production:

   ```bash
   npm run build
   ```

## Note on Architecture

The frontend connects directly to the Go Fetcher Service (`localhost:8080`) for analyzing videos and to the Python ML Service (`localhost:8000`) for polling results, historical data, and manual comment CRUD operations. Make sure both backend services are running (either via Docker or locally) for the frontend to work correctly.
