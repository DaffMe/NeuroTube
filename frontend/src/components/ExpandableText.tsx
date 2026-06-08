import { useState, useRef, useEffect } from "react"; // Pustaka penanganan data sementara (state), Referensi langsung ke tag HTML, dan pemantau efek siklus halaman (useEffect)

interface ExpandableTextProps {
  text: string;
  limit?: number; // Batas potong berdasarkan jumlah karakter
  lineLimit?: number; // Batas potong berdasarkan jumlah baris (line-clamp)
  className?: string; // Gaya CSS tambahan untuk blok teks
  buttonClassName?: string; // Gaya CSS tambahan untuk tombol "Read more"
}

// -----------------------------------------------------------------------------
// KOMPONEN: ExpandableText
// Berfungsi untuk merender teks paragraf yang sangat panjang dengan mekanisme potong otomatis 
// dan penambahan tombol "Baca Selengkapnya" (Read More) / "Tampilkan Lebih Sedikit" (Show Less)
// -----------------------------------------------------------------------------
export function ExpandableText({ 
  text, 
  limit, 
  lineLimit,
  className = "", 
  buttonClassName = "" 
}: ExpandableTextProps) {
  // Mengecek apakah pemotongan teks diminta berdasarkan jumlah baris (CSS line-clamp)
  const isLineBased = typeof lineLimit === "number";

  // State (Status) untuk melacak apakah teks asli benar-benar melebihi batas potong yang ditentukan.
  // Jika iya, maka tombol "Baca Selengkapnya" perlu dimunculkan.
  // Inisialisasi awal (initial state) dilakukan secara deterministik agar antarmuka tidak "melompat" (layout shifts) saat dimuat.
  const [hasOverflow, setHasOverflow] = useState(() => {
    if (isLineBased) {
      // Jika berbasis baris, hitung estimasi kasar baris sebelum Browser benar-benar merender tampilannya
      const lines = text.split("\n");
      let estimatedLines = 0;
      const charsPerLine = 75; // rata-rata karakter per satu baris untuk ukuran huruf text-xs di dalam kontainer komentar
      for (const line of lines) {
        estimatedLines += Math.max(1, Math.ceil(line.length / charsPerLine));
      }
      // Anggap teks terlalu panjang (overflow) jika estimasi baris lebih dari batas ATAU karakternya kelewat panjang (> 300)
      return estimatedLines > lineLimit || text.length > 300;
    }
    // Jika pemotongan berbasis murni karakter numerik (default: 200 karakter)
    return text.length > (limit ?? 200);
  });

  // Melacak apakah pengguna sedang menekan tombol "Baca Selengkapnya" (sehingga teks tampil penuh)
  const [isExpanded, setIsExpanded] = useState(false);
  // Referensi akses langsung ke elemen HTML Paragraf <p> di DOM
  const textRef = useRef<HTMLParagraphElement>(null);

  // Efek Samping (Side Effect) untuk menghitung ulang "Apakah teks benar-benar terpotong/overflow?"
  // setelah Browser selesai menggambar elemennya di layar.
  useEffect(() => {
    // Perhitungan presisi DOM ini hanya diperlukan jika metode potong menggunakan batasan baris (line-clamp)
    if (!isLineBased) return;

    const el = textRef.current;
    if (!el) return;

    const checkOverflow = () => {
      if (!isExpanded) {
        // Tunda pemeriksaan ukuran hingga jeda bingkai animasi (animation frame) berikutnya
        // agar efek animasi transisi Framer Motion / font selesai di-render secara penuh
        requestAnimationFrame(() => {
          if (el) {
            // Membandingkan ukuran elemen scroll penuhnya dengan batas ketinggian yang dijepit oleh CSS
            setHasOverflow(el.scrollHeight > el.clientHeight);
          }
        });
      }
    };

    // Jalankan pemeriksaan saat pertama kali komponen dirender
    checkOverflow();

    // Pantau secara terus-menerus jika pengguna mengubah ukuran layar/jendela Browser
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, isExpanded, isLineBased]);

  const charLimit = limit ?? 200;
  const shouldTruncateChar = !isLineBased && text.length > charLimit;
  
  // Tentukan teks yang siap tayang di layar:
  // - Jika expanded (terbuka), berbasis baris, ATAU teks aslinya memang sudah pendek -> Tampilkan apa adanya.
  // - Selain itu (terlipat & menggunakan batas karakter) -> Potong di huruf tertentu dan tambahkan akhiran "..."
  const displayedText = isExpanded || isLineBased || !shouldTruncateChar 
    ? text 
    : text.slice(0, charLimit) + "...";

  // Apakah tombol "Read More" perlu dimunculkan?
  const showButton = isLineBased ? hasOverflow : shouldTruncateChar;

  // Gaya Spesial CSS Khusus (WebKit Line Clamp)
  // Ini adalah trik CSS kuno namun ampuh untuk memotong teks secara halus di batas baris tertentu
  // tanpa memotong patah di tengah-tengah kata. (Menambahkan ... otomatis secara CSS)
  const lineClampStyle = isLineBased && !isExpanded
    ? {
        display: "-webkit-box",
        WebkitLineClamp: lineLimit, // Batas baris (contoh: 4 baris)
        WebkitBoxOrient: "vertical" as const,
        overflow: "hidden", // Sembunyikan tumpahan sisa teksnya
      }
    : undefined;

  return (
    <div className="space-y-1">
      <p 
        ref={textRef}
        style={lineClampStyle}
        // whitespace-pre-wrap berguna untuk menjaga spasi kosong "Enter" dari pengguna YouTube agar tidak diabaikan
        className={`${className} whitespace-pre-wrap text-wrap`}
      >
        {displayedText}
      </p>
      {/* Tampilkan tombol aksi perluasan teks hanya jika kondisinya membutuhkan (teks kelewat panjang) */}
      {showButton && (
        <button
          onClick={(e) => {
            // Cegah event "click" ini merembes ke elemen induk di atasnya (misal: tombol expand balasan komentar)
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className={`text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors cursor-pointer ${buttonClassName}`}
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
