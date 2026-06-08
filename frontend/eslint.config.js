import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// -----------------------------------------------------------------------------
// KONFIGURASI ESLINT
// Berfungsi sebagai "Polisi Kode" (Linter). 
// File ini mengatur aturan ketat mengenai cara penulisan kode JavaScript/TypeScript 
// yang baik dan benar, serta mendeteksi potensi error bahkan sebelum kode dijalankan.
// -----------------------------------------------------------------------------

export default defineConfig([
  // Abaikan folder 'dist' (folder hasil build) agar tidak ikut diperiksa karena isinya kode mesin
  globalIgnores(['dist']),
  {
    // Hanya periksa file-file dengan akhiran ekstensi TypeScript (.ts) dan React (.tsx)
    files: ['**/*.{ts,tsx}'],
    
    // Menerapkan bundel aturan-aturan standar (Recommended Rules) bawaan komunitas
    extends: [
      js.configs.recommended, // Aturan dasar JavaScript
      tseslint.configs.recommended, // Aturan khusus TypeScript
      reactHooks.configs.flat.recommended, // Aturan khusus pemakaian React Hooks (seperti useState, useEffect)
      reactRefresh.configs.vite, // Aturan dukungan Vite untuk reload cepat (Hot Module Replacement)
    ],
    
    languageOptions: {
      // Mengenali variabel-variabel bawaan web browser (seperti 'window', 'document', 'console')
      globals: globals.browser,
    },
    
    // Aturan Modifikasi Khusus
    rules: {
      // Memastikan bahwa di dalam file komponen React, yang diekspor hanyalah komponennya saja
      // agar fitur React Fast Refresh (reload layar tanpa reset state) bisa bekerja maksimal
      'react-refresh/only-export-components': [
        'warn', // Berikan peringatan (kuning) jika dilanggar, bukan error (merah)
        { allowConstantExport: true }, // Izinkan export variabel konstan (const) selain komponen
      ],
    },
  },
])
