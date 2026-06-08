import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/Header";
import App from "./App";
import "./index.css";

// -----------------------------------------------------------------------------
// TITIK MASUK UTAMA (ENTRY POINT) APLIKASI REACT
// File ini adalah file pertama yang akan dibaca dan dijalankan oleh Browser (Vite).
// Bertugas "menempelkan" seluruh kode React kita ke dalam file index.html kosong.
// -----------------------------------------------------------------------------

// Mencari elemen HTML dengan id="root" (biasanya ada di file public/index.html)
// lalu membangun (render) hierarki komponen React di dalamnya.
createRoot(document.getElementById("root")!).render(
  // StrictMode adalah fitur pengaman React khusus mode pengembangan (development).
  // Ia akan sengaja merender komponen 2 kali untuk membantu mendeteksi bug atau kode kotor tersembunyi.
  <StrictMode>
    {/* ThemeProvider membungkus seluruh aplikasi agar fitur Mode Gelap/Terang bisa diakses dari halaman mana saja */}
    <ThemeProvider defaultTheme="dark">
      {/* Pembungkus halaman dasar dengan tinggi minimal seukuran layar penuh (min-h-screen) */}
      <div className="min-h-screen">
        {/* Header/Navigasi atas selalu dirender secara global (ada di semua halaman) */}
        <Header />
        <main>
          {/* Komponen Inti Aplikasi yang menampung logika input link video dan hasil analisis */}
          <App />
        </main>
      </div>
    </ThemeProvider>
  </StrictMode>
);
