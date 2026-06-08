import path from "path" // Pustaka bawaan Node.js untuk mengatur dan membaca jalur folder (direktori) lokal
import { defineConfig } from 'vite' // Pustaka untuk mendefinisikan objek pengaturan Vite secara aman (Type-safe)
import react from '@vitejs/plugin-react' // Pustaka plugin agar Vite mengerti cara menerjemahkan sintaks JSX/TSX milik React
import tailwindcss from '@tailwindcss/vite' // Pustaka plugin agar Tailwind CSS v4 dapat langsung disuntikkan ke dalam bundel Vite

// -----------------------------------------------------------------------------
// KONFIGURASI VITE (BUNDLER FRONTEND)
// File ini berfungsi sebagai pengatur utama alat pembangun (build tool) Vite.
// Vite bertugas menggabungkan semua kode React, TypeScript, dan CSS kita menjadi 
// satu kesatuan (bundle) yang ringan dan bisa dibaca oleh Browser (Chrome/Firefox/dll).
// -----------------------------------------------------------------------------

// https://vitejs.dev/config/
export default defineConfig({
  // Daftar Plugin yang digunakan:
  // 1. react(): Mengaktifkan dukungan framework React untuk Vite (Fast Refresh, JSX, dll)
  // 2. tailwindcss(): Mengintegrasikan mesin styling TailwindCSS versi 4 terbaru langsung ke dalam alur build
  plugins: [react(), tailwindcss()],
  
  resolve: {
    // Pengaturan Alias (Nama Samaran) untuk mempermudah impor file (Import)
    alias: {
      // Mengubah path impor yang awalnya panjang "../../components/ui/button" 
      // menjadi lebih bersih dan pendek "@/components/ui/button"
      // Karakter "@" otomatis akan dialihkan ke folder "./src" secara sistem.
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
