# Dokumentasi Arsitektur & Deskripsi File Sistem NeuroTube

Dokumen ini berisi penjelasan teknis mengenai arsitektur sistem dan fungsi spesifik dari setiap file pada proyek NeuroTube (Frontend dan Backend). Sistem ini menggunakan arsitektur **Microservices**, di mana komponen-komponen aplikasi dipisahkan menjadi layanan independen yang saling terintegrasi.

---

## 1. Konfigurasi Lingkungan (Root Directory)

File-file pada tingkat dasar (root) berfungsi untuk mengatur konfigurasi infrastruktur dan lingkungan eksekusi secara global.

- **`docker-compose.yml`**
  File konfigurasi untuk orkestrasi *container*. Berfungsi mendefinisikan dan menjalankan seluruh *microservices* (Frontend, Backend-Fetcher, Backend-ML, PostgreSQL, dan Redis) secara serentak dalam environment Docker yang saling terhubung.

- **`.env`**
  File konfigurasi variabel lingkungan (*Environment Variables*). Berfungsi untuk menyimpan data kredensial dan konfigurasi sistem (seperti parameter koneksi database, port layanan, API Key YouTube, dan API Key Gemini) secara aman di luar kode sumber.

---

## 2. Layanan `frontend/` (React & TypeScript)

Layanan ini merupakan antarmuka pengguna (*User Interface*) interaktif yang berjalan pada browser klien. Dikembangkan menggunakan pustaka React dengan bahasa pemrograman TypeScript dan bundler Vite. Fokus utamanya adalah visualisasi data hasil komputasi dari backend dan pengelolaan interaksi pengguna.

### Struktur Source Code (`src/`)

- **`src/main.tsx`**
  *Entry point* (titik masuk) eksekusi aplikasi web di sisi klien (*Client-Side*). Berfungsi untuk melakukan inisialisasi lingkungan React dan menyisipkan komponen utama (App) ke dalam *Document Object Model* (DOM) pada browser.

- **`src/App.tsx`**
  Komponen utama (*Root Component*) yang mendefinisikan struktur tata letak visual (*layout*) dan mengelola status (*state*) keseluruhan aplikasi, termasuk alur input URL YouTube dan proses reaktivitas (*reactivity*) saat menunggu hasil.

- **`src/components/`**
  Direktori ini berisi pustaka komponen visual modular (seperti *bar chart* sentimen, daftar komentar, dan notifikasi status) yang dapat dipanggil secara berulang (*reusable*) di dalam aplikasi.

- **`src/services/`**
  Modul komunikasi *Client-Server*. Berfungsi sebagai lapisan abstraksi jaringan (*Network Layer*) untuk melakukan eksekusi pemanggilan HTTP/REST API ke layanan *backend* (Golang dan Python).

- **`src/index.css` & `src/lib/`**
  Memuat lembar gaya (*Stylesheet*) global berbasis sistem *utility-first* (Tailwind CSS) dan fungsi utilitas pendukung pemrograman (*Helper Functions*) untuk menstandarisasi estetika desain UI.

### Konfigurasi Dependensi Frontend

- **`package.json`** & **`package-lock.json`**
  Manifest proyek yang mendeklarasikan pustaka JavaScript pihak ketiga (seperti React, library *Chart*, *Routing*) beserta versi pastinya.

- **`vite.config.ts`**
  Konfigurasi mesin *compiler/bundler* (Vite) untuk merakit dan mengoptimalkan kode mentah TypeScript menjadi aset statis yang ringan dan kompatibel untuk *browser*.

- **`Dockerfile`**
  File definisi instruksi untuk mem-build dan menyajikan (*serve*) file statis antarmuka melalui peladen web ringan di lingkungan Docker terisolasi.

---

## 3. Layanan `backend-fetcher/` (Golang)

Layanan ini fokus pada kinerja tinggi untuk menangani permintaan masuk dari frontend, melakukan penarikan data mentah dalam kuantitas masif (pengambilan ribuan komentar YouTube secara paralel), dan mengelola logika antrean data.

### `cmd/`

- **`cmd/main.go`**
  *Entry point* eksekusi layanan Golang. Berfungsi untuk melakukan inisialisasi server HTTP, mengonfigurasi rute jaringan (router), membangun koneksi dengan Redis, dan memulai *listening* pada port. (Penerapan Modul: Prosedur Utama).

### `internal/handler/`

- **`internal/handler/handler.go`**
  Berfungsi sebagai pengontrol HTTP (*HTTP Handler*). Menangani proses *routing* dari URL YouTube, mengekstrak parameter, serta mengelola alur komunikasi menggunakan *Server-Sent Events* (SSE) untuk mengirim pembaruan status progres secara instan (*real-time*) kembali ke klien (Frontend). (Penerapan Modul: Tipe Bentukan, Fungsi, dan Prosedur).

### `internal/youtube/`

- **`internal/youtube/youtube.go`**
  Modul integrasi API pihak ketiga. Berfungsi khusus untuk melakukan otentikasi dan transaksi data dengan *YouTube Data API v3* untuk memanen metadata video dan komentar yang kemudian direpresentasikan ke dalam struktur data (Struct).

- **`internal/youtube/metrics.go`**
  Modul komputasi metrik statis. File ini mengimplementasikan algoritma ilmu komputer dasar secara langsung di memori. **Penting:** Modul ini berisi penerapan materi mata kuliah (seperti *Array*, *Fungsi*, *Pointer*, *Rekursi*, *Sequential/Binary Search*, dan *Selection/Insertion Sort*).

### `internal/queue/`

- **`internal/queue/queue.go`**
  Modul manajemen pesan/antrean. Berfungsi memformat data array komentar menjadi *Job Payload* (format JSON) dan mendelegasikan (*push*) paket pesan tersebut ke dalam antrean pada *Redis Message Broker*.

### Konfigurasi Dependensi Golang

- **`go.mod`** & **`go.sum`**
  File manajemen dependensi standar pada Golang yang memvalidasi pustaka (library) eksternal (seperti modul Redis dan HTTP Router).

- **`Dockerfile`**
  Resep definisi kontainerisasi (*Containerization*) kode sumber Golang menjadi eksekusi *binary* terkompilasi (*compiled binary*).

---

## 4. Layanan `backend-ml/` (Python)

Layanan ini bertindak sebagai peladen komputasi kecerdasan buatan, mengkhususkan diri di ranah *Machine Learning* dan pemrosesan bahasa alami (*Natural Language Processing*/NLP) untuk klasifikasi dan peringkasan teks.

### `app/`

- **`app/main.py`**
  *Entry point* layanan Python (menggunakan FastAPI). File ini menginisialisasi server API, menyiapkan konektivitas database relasional, dan menginstruksikan peluncuran *Background Worker* secara asinkron.

- **`app/core/config.py`**
  Berfungsi sebagai kelas abstraksi utilitas untuk memuat, memvalidasi tipe data, dan menyediakan akses pada variabel lingkungan secara aman ke dalam ekosistem Python.

### `app/core/` (Logika Kecerdasan Buatan)

- **`app/core/sentiment.py`**
  Modul inferensi *Deep Learning*. File ini mengimpor arsitektur model NLP (berbasis *Transformer* seperti IndoBERT/RoBERTa) untuk mengalkulasi dan memprediksi sentimen probabilitas (positif, negatif, atau netral) dari setiap unit kalimat komentar.

- **`app/core/topics.py`**
  Modul peringkasan topik teks (*Document Summarization*). Secara hibrida beroperasi melalui dua sub-mekanisme: Pertama, inferensi linguistik melalui koneksi ke model generasi LLM Google Gemini (*Generative Summary*). Kedua, modul pereduksian statistik lokal berdasarkan algoritma frekuensi kata jika layanan API eksternal mengalami kendala jaringan (*Extractive Fallback*).

### `app/workers/`

- **`app/workers/worker.py`**
  Berfungsi sebagai proses pemantau laten (*Daemon Process*). Menggunakan interval *polling* untuk secara iteratif mengekstrak perintah komputasi dari antrean Redis. Apabila muatan data dideteksi, pekerja mengalirkannya ke *pipeline* NLP dan menyimpan hasil akhir tanpa memblokir server utama.

### `app/db/` & `app/api/` (Database & Endpoint)

- **`app/db/database.py`**
  Modul ORM (*Object-Relational Mapping*). Bertugas menciptakan lapisan koneksi dengan PostgreSQL dan mengonversi relasi objek Python (*Classes*) ke dalam skema tabel SQL untuk persistensi data komprehensif.

- **`app/api/endpoints.py`**
  Berfungsi menyediakan layanan antarmuka program aplikasi (*REST API Data Exposure*). Rute (*Endpoints*) ini mengakomodasi permintaan kueri tipe GET dari *frontend* untuk memuat (*fetch*) riwayat laporan statistik analitik.

### Konfigurasi Dependensi Python

- **`requirements.txt`**
  Berisi definisi paket pustaka spesifik (seperti `torch`, `transformers`) untuk *framework Machine Learning* dan utilitas *web server* di dalam lingkungan virtual Python.

- **`Dockerfile`**
  File definisi instruksi arsitektur sistem operasi (*Base OS*) untuk menyokong dependensi library Python dalam batasan lingkungan *image* Docker.

---

## 5. Alur Komunikasi Arsitektur Keseluruhan (System Flow)

1. **Frontend $\rightarrow$ Golang**: Klien mentransmisikan *Request HTTP POST* yang menyertakan payload berisi referensi URL YouTube.
2. **Golang $\rightarrow$ Redis**: Layanan API Golang memanen parameter metrik dan komentar YouTube, merakit data, kemudian mendistribusikan paket tersebut melalui mekanisme *Message Passing* ke dalam memori antrean Redis.
3. **Redis $\rightarrow$ Python**: Pekerja otonom (*Background Worker*) berbasis Python secara persisten mengeksekusi ekstraksi (*dequeue*) dari antrean Redis.
4. **Python $\rightarrow$ Database**: Kumpulan teks ditransformasi secara matematis melalui vektor inferensi NLP, dirangkum menggunakan algoritma hibrida AI, kemudian hasil matriks sentimennya disinkronisasi ke dalam penyimpanan relasional PostgreSQL.
5. **Frontend $\rightarrow$ Python**: Klien Frontend, atas tindakan interaksi pengguna, mengeksekusi pemanggilan *REST API GET* untuk mengunduh laporan matriks, dan melakukan *re-rendering* grafik UI di layar.
