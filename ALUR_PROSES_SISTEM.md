# Alur Proses Sistem (System Data Flow) NeuroTube

Dokumen ini menjelaskan urutan proses berjalannya aplikasi NeuroTube secara menyeluruh (*End-to-End*), lengkap dengan file-file kode yang bertanggung jawab di setiap fasenya.

---

## Ringkasan Alur Berjalan

Aplikasi ini dibagi menjadi 3 Fase Utama:
1. **Fase Inisiasi & Antrean (Golang Fetcher)**: Mengambil data komentar dari YouTube API secara paralel dan memasukkannya ke antrean Redis.
2. **Fase Pengolahan AI & Database (Python ML)**: Mengambil data dari Redis, menyaring spam, mengklasifikasi sentimen lewat model BERT (Indo & Multilingual), membuat ringkasan lewat Gemini LLM, dan menyimpannya ke PostgreSQL.
3. **Fase Pengambilan Hasil (React Frontend)**: Menampilkan hasil visualisasi data analisis sentimen ke dashboard interaktif.

---

## 1. Fase Inisiasi & Pengantrean Data (Golang Fetcher)

Proses dimulai saat pengguna memasukkan tautan URL video YouTube di halaman browser:

```
[User Klik Submit]
       │
       ▼
1. [frontend/src/pages/Home.tsx] ──(Kirim HTTP POST /api/analyze)──► 2. [backend-fetcher/cmd/main.go]
                                                                                │
                                                                                ▼
4. [backend-fetcher/internal/youtube/youtube.go] ◄──(Goroutine Asinkron)── 3. [backend-fetcher/internal/handler/handler.go]
       │
       ├─► [backend-fetcher/internal/youtube/metrics.go] (Hitung Statistik / Algoritma Tugas Besar)
       │
       ▼
5. [backend-fetcher/internal/queue/publisher.go] ──(Kirim Data Antrean)──► [Redis Broker]
```

*   **`frontend/src/pages/Home.tsx`**
    *   Pengguna mengetik atau menempelkan URL YouTube dan menekan tombol submit. Frontend mengirimkan permintaan data `POST` ke endpoint API `/api/analyze`.
*   **`backend-fetcher/cmd/main.go`**
    *   Fungsi `main()` menyala pertama kali, menginisiasi koneksi ke Redis menggunakan `queue.NewPublisher` dan mendaftarkan rute (routing) API, kemudian mengarahkan kendali ke Handler.
*   **`backend-fetcher/internal/handler/handler.go` (Fungsi `AnalyzeVideo`)**
    *   Mengekstrak kode unik Video ID dari URL YouTube menggunakan RegEx.
    *   Membuat nomor resi pekerjaan (**Job ID**) yang unik menggunakan `uuid`.
    *   Membuat **Goroutine** baru (background thread asinkron) agar program dapat mengunduh data di latar belakang tanpa membuat browser pengguna macet/menunggu (loading) terlalu lama.
*   **`backend-fetcher/internal/youtube/youtube.go` (Fungsi `FetchComments`)**
    *   Goroutine memanggil fungsi ini untuk melakukan request berulang kali ke server Google (**YouTube Data API v3**) secara paralel guna meraup metadata video dan maksimal 5000 komentar beserta balasannya.
*   **`backend-fetcher/internal/youtube/metrics.go` (Fungsi `logCommentMetrics`)**
    *   Setelah unduhan selesai, data komentar dilempar ke file ini untuk dihitung analisis statistiknya (Selection Sort, Insertion Sort, Binary Search, dll) untuk memenuhi syarat kelulusan Tugas Besar Anda, kemudian dicetak di terminal.
*   **`backend-fetcher/internal/queue/publisher.go` (Fungsi `PublishJob`)**
    *   Data komentar yang sudah bersih dibungkus ke dalam format JSON, kemudian dilempar ke antrean **Redis** menggunakan modul publisher.
    *   Status pekerjaan diubah menjadi `"processing"`.

---

## 2. Fase Pengolahan AI & Database (Python ML)

Background Worker Python mendeteksi keberadaan pekerjaan di Redis, lalu memprosesnya secara otonom:

```
[Redis Broker]
       │ (Deteksi & Ambil Job)
       ▼
1. [backend-ml/app/workers/worker.py]
       │
       ├─► 2. [backend-ml/app/core/sentiment/sentiment.py] (Spam Filter & Dual-Engine BERT Sentiment)
       │
       ├─► 3. [backend-ml/app/core/topics.py] (Generative AI Summary / Gemini API)
       │
       ▼
4. [backend-ml/app/crud/crud.py] ──(Operasi SQL INSERT)──► [PostgreSQL Database]
```

*   **`backend-ml/app/workers/worker.py` (Fungsi `process_job`)**
    *   Proses *background worker* membaca antrean dari Redis secara konstan. Jika terdapat pekerjaan masuk, worker akan menariknya, memperbarui persentase loading progres, dan mengirim data teks ke modul analisis.
*   **`backend-ml/app/core/sentiment/sentiment.py` (Fungsi `analyze_comment`)**
    *   **Penyaringan Spam**: Menjalankan Regex Spammer Filter terlebih dahulu untuk membuang komentar bot/iklan tanpa membebani GPU.
    *   **Deteksi Bahasa**: Menggunakan `langdetect` untuk mengetahui bahasa komentar.
    *   **Routing Dual-Engine**:
        *   Jika terdeteksi Bahasa Indonesia (ID), teks dimasukkan ke model **Indo-RoBERTa** (`w11wo/indonesian-roberta-base-sentiment-classifier`).
        *   Jika terdeteksi bahasa asing, teks dimasukkan ke model **XLM-RoBERTa** (`cardiffnlp/twitter-xlm-roberta-base-sentiment`).
*   **`backend-ml/app/core/topics.py` (Fungsi `extract_topics`)**
    *   Kumpulan komentar dikirim ke Google Gemini API (`gemini-2.5-flash`) untuk dianalisis guna menghasilkan kesimpulan narasi dan kata kunci viral.
    *   Jika API Key Gemini kosong atau error, sistem menggunakan sistem cadangan *Local Extractive Summarization* (menggunakan rumus matematika frekuensi kata secara lokal).
*   **`backend-ml/app/crud/crud.py` (Fungsi `create_analysis_result`)**
    *   Hasil analisis dari model sentimen dan Gemini dibungkus ke dalam skema tabel SQL (`backend-ml/app/models/models.py`), lalu disimpan secara permanen ke database **PostgreSQL**.
    *   Status pekerjaan di Redis diubah menjadi `"completed"`.

---

## 3. Fase Pengambilan Hasil Akhir (React Frontend)

Frontend mengambil data laporan dari PostgreSQL untuk ditampilkan kepada pengguna:

```
[frontend/src/pages/Dashboard.tsx]
       │
       ├─► (Request HTTP GET /api/results/{job_id}) ──► [backend-ml/app/main.py]
       │                                                          │
       │                                                          ▼
       │                                               [backend-ml/app/crud/crud.py]
       │                                                          │
       │                                                          ▼
       ◄────────────────(Balikan Data JSON)───────────────── [PostgreSQL DB]
```

*   **`frontend/src/pages/Dashboard.tsx`**
    *   Halaman dashboard React yang awalnya menampilkan layar loading (*polling status*) mendeteksi bahwa status di Redis sudah `"completed"`.
    *   React mengirimkan request `GET /api/results/{job_id}` ke FastAPI Python.
*   **`backend-ml/app/main.py` & `backend-ml/app/crud/crud.py` (Fungsi `get_analysis_result`)**
    *   FastAPI membaca database PostgreSQL berdasarkan Job ID tersebut, lalu mengembalikan data laporan dalam bentuk objek JSON ke Frontend.
*   **Dashboard Visual**
    *   Setelah data JSON diterima, React merender angka-angka tersebut ke dalam komponen visual:
        *   **`frontend/src/components/SentimentDistribution.tsx`**: Menampilkan persentase sentimen positif, negatif, dan netral menggunakan grafik lingkaran (*Pie Chart*).
        *   **`frontend/src/components/SentimentTimeline.tsx`**: Menampilkan grafik garis (*Line Chart*) untuk melihat kapan penonton menulis komentar positif/negatif.
        *   **`frontend/src/components/KeywordCloud.tsx`**: Menampilkan awan kata kunci populer (*Word Cloud*).
        *   **`frontend/src/components/CommentList.tsx`**: Menampilkan daftar tabel komentar dengan filter pencarian dan skor sentimen detail.
