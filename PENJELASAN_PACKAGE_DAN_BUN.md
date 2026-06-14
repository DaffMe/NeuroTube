# PENJELASAN FILE KONFIGURASI PAKET (PACKAGE.JSON & BUN.LOCK)

Halo! Karena batasan bahasa pemrograman komputer, file seperti `package.json` dan `bun.lock` menggunakan format **JSON murni** dan **Binary Hash**. Sistem di dalam komputer (seperti Node.js) akan langsung **CRASH / ERROR / RUSAK** jika ada tanda baca aneh di dalamnya, termasuk tanda komentar seperti `//`.

Oleh karena itu, komentar penjelasan untuk kedua file tersebut tidak boleh ditaruh secara fisik ke dalam kodenya, melainkan harus dijelaskan di sini secara tertata rapi.

## 1. Penjelasan `frontend/package.json`

File ini ibarat **"KTP" sekaligus "Daftar Belanjaan"** dari aplikasi Frontend.
Berfungsi untuk memberitahu server tentang identitas aplikasi dan bahan-bahan apa saja yang harus didownload sebelum aplikasi bisa berjalan.

Berikut adalah penjelasan tiap blok kodenya seolah-olah ditambahkan tanda `//`:

```json
{
  // -----------------------------------------------------------------------------
  // IDENTITAS APLIKASI
  // -----------------------------------------------------------------------------
  "name": "frontend", // Nama aplikasi ini di dalam sistem
  "private": true, // Menandakan aplikasi ini hanya untuk pribadi, tidak boleh di-upload publik ke web npm
  "version": "0.0.0", // Versi aplikasi
  "type": "module", // Memberitahu Node.js bahwa kita pakai cara impor modern (import x from y), bukan gaya lama (require)

  // -----------------------------------------------------------------------------
  // JALUR PINTAS PERINTAH (SCRIPTS)
  // Ibarat tombol remote control untuk menjalankan perintah panjang hanya dengan 1 kata pendek
  // -----------------------------------------------------------------------------
  "scripts": {
    "dev": "vite", // Jika kamu ketik "npm run dev", maka dia akan memutar mesin server Vite agar bisa koding secara langsung
    "build": "tsc -b && vite build", // Perintah mengepak aplikasi jadi bentuk ringkas saat mau ditaruh di server asli (production)
    "lint": "eslint .", // Menjalankan Polisi Kode untuk mengecek apakah ada ketikan yang salah
    "preview": "vite preview" // Menyimulasikan aplikasi yang sudah diekspor (build) di komputer lokal
  },

  // -----------------------------------------------------------------------------
  // DAFTAR PUSTAKA UTAMA (DEPENDENCIES)
  // Ini adalah daftar "bahan pokok" yang wajib ada agar aplikasinya BISA HIDUP & JALAN.
  // -----------------------------------------------------------------------------
  "dependencies": {
    "@radix-ui/react-slot": "^1.2.4", // Komponen dasar yang fleksibel untuk membuat UI (dipakai Shadcn UI)
    "@tanstack/react-router": "^1.169.2", // Perpustakaan canggih pembuat URL Halaman (Pindah-pindah page tanpa loading)
    "class-variance-authority": "^0.7.1", // Alat untuk membuat variasi class CSS Tailwind lebih rapi (dipakai bawaan Shadcn UI)
    "clsx": "^2.1.1", // Alat untuk menggabungkan class CSS dinamis (jika kondisinya True/False)
    "framer-motion": "^12.38.0", // Mesin animasi super mulus untuk komponen React (transisi, hover effects, dll)
    "lucide-react": "^1.14.0", // Kumpulan gambar ikon-ikon cantik yang siap pakai (Search, Edit, Trash, Send, dll)
    "react": "^19.2.5", // Inti utama dari aplikasi antarmuka pengguna (React versi 19)
    "react-dom": "^19.2.5", // Jembatan yang menempelkan kode React ke layar Browser (HTML DOM)
    "react-is": "^19.2.6", // Utilitas internal React untuk pemeriksaan tipe komponen
    "recharts": "^3.8.1", // Alat utama untuk menggambar visualisasi Grafik Data (Pie Chart, Bar Chart, Timeline)
    "tailwind-merge": "^3.6.0" // Alat yang mencegah perkelahian tabrakan gaya CSS Tailwind
  },

  // -----------------------------------------------------------------------------
  // DAFTAR PUSTAKA ALAT BANTU (DEV DEPENDENCIES)
  // Ini adalah "peralatan tukang" yang HANYA butuh saat kamu lagi ngoding/modifikasi.
  // Tidak akan dibawa dan tidak dipakai saat aplikasinya sudah rilis di publik.
  // -----------------------------------------------------------------------------
  "devDependencies": {
    "@eslint/js": "^10.0.1", // Konfigurasi dasar aturan ESLint untuk JavaScript
    "@tailwindcss/vite": "^4.3.0", // Jembatan agar Vite paham bahasa Tailwind versi terbaru
    "@types/node": "^25.6.2", // Kamus kata agar TypeScript paham aturan Node.js
    "@types/react": "^19.2.14", // Kamus kata agar TypeScript paham aturan React
    "@types/react-dom": "^19.2.3", // Kamus kata agar TypeScript paham aturan React DOM
    "@vitejs/plugin-react": "^6.0.1", // Plugin agar Vite bisa membaca dan kompilasi React (JSX/TSX)
    "autoprefixer": "^10.5.0", // Alat otomatis menambahkan prefix CSS untuk kompatibilitas browser lama
    "eslint": "^10.2.1", // Polisi pemeriksa kode JavaScript/TypeScript
    "eslint-plugin-react-hooks": "^7.1.1", // Plugin ESLint khusus memeriksa aturan React Hooks
    "eslint-plugin-react-refresh": "^0.5.2", // Plugin ESLint untuk memastikan React Hot Reload berjalan benar
    "globals": "^17.5.0", // Daftar variabel global JavaScript yang dikenal (window, document, dll)
    "postcss": "^8.5.14", // Mesin perubah bahasa CSS modern menjadi CSS jadul agar kompatibel
    "tailwindcss": "^4.3.0", // Mesin kerangka gaya desain antarmuka (utility-first CSS framework)
    "typescript": "~6.0.2", // Kompiler bahasa TypeScript ke JavaScript biasa
    "typescript-eslint": "^8.58.2", // Plugin ESLint untuk memeriksa aturan TypeScript
    "vite": "^8.0.10" // Mesin server lokal & pengepak utama aplikasinya (sangat cepat)
  }
}
```

## 2. Penjelasan `frontend/bun.lock` (atau `package-lock.json`)

**Fungsi Utama:** Ini ibaratnya **"Buku Resep Super Spesifik & Resi Pembelian"**.

Ketika kamu menggunakan `package.json`, kamu hanya menyuruh komputer *"Tolong belikan saya telur nomor 3"*. Komputer akan otomatis memilihkan telur yang mirip-mirip spesifikasinya di pasar terbuka.

Supaya tim developer lain (misal di PC B, PC C, atau di Server Cloud) **mendapatkan telur yang SAMA PERSIS 100% sampai ke atom-atomnya** seperti di laptopmu saat ini, maka sistem pencatat bernama **lock file** (seperti `bun.lock`) otomatis dibuat oleh sistem.

**Kenapa tidak bisa diberi komentar?**
Karena isinya adalah kode rahasia enkripsi *hash* miliaran baris tentang setiap atom komponen yang terpasang. Tujuannya bukan untuk dibaca atau diedit manusia, melainkan agar komputer bisa menyamakan lingkungan instalasi secara persis (identik). Jadi, kamu hanya perlu **mengabaikan file lock ini** (jangan pernah memodifikasi file ini secara manual). Sistem (Bun / NPM) yang akan membacanya untukmu.
