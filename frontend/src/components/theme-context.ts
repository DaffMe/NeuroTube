import { createContext, useContext } from "react"; // Alat dasar dari React untuk membagikan data tema terang/gelap ke seluruh penjuru aplikasi (Context API)

// Tipe data yang mendefinisikan ragam variasi tema sistem yang didukung oleh desain
export type Theme = "dark" | "light" | "system";

// Tipe Kerangka Blueprint Struktur Data yang akan dilimpahkan dari Context
export interface ThemeProviderState {
  theme: Theme; // Tema yang saat ini sedang aktif secara konfigurasi pengguna (contoh: "system")
  setTheme: (theme: Theme) => void; // Fungsi pemicu mutasi pengubah tema
  resolvedTheme: "dark" | "light"; // Versi resolusi akhir temanya (contoh: bila "system" digunakan di Mac OS gelap, ini bernilai "dark")
}

// -----------------------------------------------------------------------------
// KONTEKS (CONTEXT) PENYIARAN STATE TEMA
// Fasilitas React bawaan yang membebaskan distribusi variabel menembus komponen lapis bawah
// tanpa harus melakukan estafet pengiriman data "props" komponen satu per satu.
// -----------------------------------------------------------------------------
export const ThemeContext = createContext<ThemeProviderState | undefined>(undefined);

// -----------------------------------------------------------------------------
// KAITAN KHUSUS (CUSTOM HOOK): useTheme
// Berfungsi sebagai jalan pintas alat hisap praktis bagi komponen kecil anak (Seperti Header) 
// untuk mendengarkan/mengambil data dari Stasiun Konteks `ThemeContext`.
// -----------------------------------------------------------------------------
export function useTheme() {
  // Panggil antarmuka saluran konteks
  const context = useContext(ThemeContext);
  // Mekanisme Pengaman Darurat: Jika kaitan ini tidak sengaja dipanggil dari komponen luar yang 
  // tidak dibungkus oleh selimut pelindung "ThemeProvider" yang berada di level tertingginya, lempar Error meledak.
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  
  return context; // Berikan alat state dan setting utamanya kembali ke penelepon
}
