import { useEffect, useState, type ReactNode } from "react";
import { ThemeContext, type Theme, type ThemeProviderState } from "./theme-context";

// -----------------------------------------------------------------------------
// FUNGSI PEMBANTU: getSystemTheme
// Bertugas membaca pengaturan preferensi tema dasar bawaan Sistem Operasi atau Browser pengguna.
// Membantu untuk memutuskan apakah sistem Windows/Mac OS pengguna saat ini sedang bernuansa Gelap (Dark) atau Terang (Light).
// -----------------------------------------------------------------------------
function getSystemTheme(): "dark" | "light" {
  // Mengecek antarmuka media query sistem '(prefers-color-scheme: dark)' 
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// -----------------------------------------------------------------------------
// KOMPONEN UTAMA PROVIDER: ThemeProvider
// Berfungsi membungkus aplikasi secara global pada level teratas (di `main.tsx`).
// Tugasnya adalah menyimpan, mendistribusikan (lewat Context), dan menerapkan secara fisik class CSS tema 
// ("dark" atau "light") ke badan dokumen HTML paling dasar (`<html>`).
// -----------------------------------------------------------------------------
export function ThemeProvider({
  children,
  defaultTheme = "dark", // Secara asali, situs web ini bertemakan Gelap (Dark Mode)
  storageKey = "NeuroTube-theme", // Nama kunci penyimpanan memori untuk peramban pengguna
}: {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  // State Pengelola Tema Utama. Saat pertama kali dimuat, peramban akan mengecek 
  // penyimpanan lokal pengguna (localStorage), jika tidak ada rekaman sebelumnya, gunakan tema Asali (Gelap).
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  // Tema yang "Pasti Terpecahkan/Terselesaikan".
  // Pengguna bisa memilih 3 hal: Terang, Gelap, Sistem. 
  // Jika mereka memilih "Sistem", kita harus konversikan maknanya secara real-time menjadi entah "Terang" atau "Gelap" (melalui fungsi getSystemTheme tadi).
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

  // Efek Samping: Menerapkan perubahaan ke elemen fisik HTML di luar ranah komponen React ini
  useEffect(() => {
    // Tangkap elemen `<html>` paling luar
    const root = window.document.documentElement;
    // Bersihkan semua kelas tema yang menempel dari rendering sebelumnya
    root.classList.remove("light", "dark");
    // Suntikkan kelas tema yang disetujui (CSS Tailwind akan bereaksi berdasarkan ada atau tidaknya class="dark" di elemen root HTML ini)
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]); // Jalankan ulang tiap kali 'resolvedTheme' berganti nilai

  // Objek Bundelan Data yang akan dilemparkan (broadcast) ke anak-anak (Children) komponen react yang membutuhkannya di bawah (contoh: Header.tsx)
  const value: ThemeProviderState = {
    theme,
    setTheme: (t: Theme) => {
      // Simpan pilihan tema terbaru pengguna ke ingatan abadi browser, agar besok jika buka web lagi tidak tersetting ulang
      localStorage.setItem(storageKey, t); 
      // Perbarui status reaktif state mesin
      setTheme(t);
    },
    resolvedTheme,
  };

  // Bungkus seluruh komponen anak dan alirkan state value-nya.
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

