import { useState } from "react"; // Alat untuk menyimpan ingatan status memori (seperti tab mana yang sedang dibuka: Positif/Negatif)
import { motion, AnimatePresence } from "framer-motion"; // Pustaka alat efek animasi untuk membuat efek memudar (fade) saat berganti tab
import { Sparkles, ThumbsUp, ThumbsDown, Quote, ChevronDown, ChevronUp, MessageSquare } from "lucide-react"; // Kumpulan ikon estetis (Bintang, Jempol, Tanda Kutip, dll)
import type { TopicCluster } from "@/types"; // Cetak biru pembatas format data yang mewakili hasil rangkuman topik dari AI Gemini

// Atribut yang diterima oleh komponen utama AiSummary
interface Props {
  topicsPositive?: TopicCluster[]; // Daftar kesimpulan AI untuk sentimen positif
  topicsNegative?: TopicCluster[]; // Daftar kesimpulan AI untuk sentimen negatif
}

// Konfigurasi animasi pegas (spring) untuk transisi memantul yang mulus
const spring = { type: "spring" as const, stiffness: 400, damping: 20 };

// -----------------------------------------------------------------------------
// KOMPONEN ANAK: TopicCard
// Merender (menampilkan) satu kartu kelompok topik yang bisa diklik untuk memperlihatkan kutipan.
// -----------------------------------------------------------------------------
function TopicCard({ topic, type }: { topic: TopicCluster; type: "positive" | "negative" }) {
  // State untuk melacak apakah kartu sedang diperluas (diklik) untuk mengungkap kutipan komentar
  const [expanded, setExpanded] = useState(false);

  // Menentukan skema warna berdasarkan jenis sentimen
  const isPositive = type === "positive";
  const accentClass = isPositive ? "text-emerald-500" : "text-rose-500";
  const bgAccentClass = isPositive ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20";

  // Mengakses array kutipan dengan aman dari objek topik (kalau kosong akan pakai array kosong)
  const quotes = topic.quotes ?? [];

  return (
    // Wadah kartu dengan animasi transisi warna saat kursor diarahkan (hover)
    <motion.div
      layout
      className={`rounded-2xl border bg-card/50 p-4 transition-colors hover:bg-card/75 backdrop-blur-sm ${
        isPositive ? "border-emerald-500/25" : "border-rose-500/25"
      }`}
    >
      {/* Bagian Atas Kartu: Judul, Ringkasan, dan Ikon Buka/Tutup */}
      <div
        className="flex items-start justify-between gap-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="space-y-2 flex-1">
          {/* Judul Kesimpulan AI */}
          <div className="flex items-center gap-2">
            <span className={`text-sm font-black tracking-tight ${accentClass}`}>
              {topic.topic}
            </span>
          </div>
          {/* Paragraf Narasi Ringkasan dari Gemini */}
          <p className="text-xs text-foreground/90 font-medium leading-relaxed">
            {topic.summary}
          </p>
        </div>

        {/* Ikon Panah (Arrow) Buka/Tutup */}
        <div className={`h-8 w-8 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
          isPositive ? "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" : "border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
        }`}>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Visualizer Kata Kunci Interaktif berbentuk kapsul (Flexbox Pills) untuk mencegah crash */}
      <div className="mt-4 w-full rounded-xl bg-background/50 border border-border/30 overflow-hidden shadow-inner p-4 flex flex-wrap gap-2 items-center justify-center">
        {topic.keywords.map((kw, idx) => (
          <span 
            key={idx}
            className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-colors cursor-default ${
              isPositive 
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" 
                : "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20"
            }`}
            style={{ 
              // Memberikan ukuran dan transparansi berbeda secara matematis agar terlihat seperti awan kata (Word Cloud)
              fontSize: `${Math.max(0.75, 1.2 - (idx * 0.1))}rem`,
              opacity: Math.max(0.6, 1 - (idx * 0.15))
            }}
          >
            {kw}
          </span>
        ))}
      </div>

      {/* Bagian Kutipan yang Bisa Diperluas: Terungkap saat kartu diklik */}
      <AnimatePresence initial={false}>
        {expanded && quotes.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-4 space-y-3 pt-3 border-t border-border/50"
          >
            <div className="flex items-center gap-1.5 opacity-80">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Representative Quotes
              </span>
            </div>
            {/* Tampilkan setiap kutipan asli pengguna (dari array quotes) */}
            {quotes.map((quote, i) => (
              <div
                key={i}
                className={`relative pl-7 pr-3 py-2.5 rounded-xl border text-xs leading-relaxed text-foreground/80 font-medium ${bgAccentClass}`}
              >
                {/* Indikator ikon tanda kutip di pinggir kotak */}
                <Quote className={`absolute left-2.5 top-3 h-3.5 w-3.5 opacity-40 ${accentClass}`} />
                <p className="italic">"{quote}"</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// KOMPONEN UTAMA: Kotak AiSummary & Clustering
// Menampilkan kelompok topik positif dan negatif secara berdampingan dalam sebuah grid.
// -----------------------------------------------------------------------------
export function AiSummary({ topicsPositive = [], topicsNegative = [] }: Props) {
  const hasPositive = topicsPositive.length > 0;
  const hasNegative = topicsNegative.length > 0;

  // Jangan tampilkan kotak AI sama sekali jika data topik kosong (misalnya error API/tidak ada komentar)
  if (!hasPositive && !hasNegative) return null;

  return (
    // Wadah utama bergaya kaca (glass-morphism) dengan animasi muncul bertahap (fade-in)
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.38 }}
      className="rounded-[2.5rem] border border-border/40 bg-card/40 p-6 backdrop-blur-md shadow-2xl shadow-primary/5 space-y-8"
    >
      {/* Bagian Judul Komponen */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/80">
          AI Summary & Topic Clustering
        </h3>
      </div>

      {/* Awan Kata (Keyword Cloud) Interaktif menggunakan Kapsul Flexbox */}
      <div className="rounded-2xl border border-border/40 bg-card/20 p-6 overflow-hidden relative min-h-[200px]">
        <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/50 absolute top-4 left-4 z-10">
          Keyword Cloud
        </h4>
        <div className="w-full h-full mt-6 flex flex-wrap gap-3 items-center justify-center opacity-90 hover:opacity-100 transition-opacity">
          {/* Menggabungkan (flatMap) kata kunci dari sisi positif maupun negatif menjadi satu kerumunan awan */}
          {[...topicsPositive, ...topicsNegative].flatMap((t, tIdx) => 
            (t.keywords || []).map((kw, kwIdx) => {
              const isPositiveTheme = tIdx < topicsPositive.length;
              return (
                <span 
                  key={`${tIdx}-${kwIdx}`}
                  className={`px-4 py-2 rounded-full font-black border transition-transform hover:scale-110 cursor-default shadow-sm ${
                    isPositiveTheme 
                      ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 shadow-emerald-500/5" 
                      : "bg-rose-500/15 text-rose-500 border-rose-500/30 shadow-rose-500/5"
                  }`}
                  style={{ 
                    // Rumus ukuran: Semakin sering diulang/muncul di awal, semakin besar hurufnya
                    fontSize: `${Math.max(0.8, 1.5 - (kwIdx * 0.15))}rem`,
                    opacity: Math.max(0.6, 1 - (kwIdx * 0.1))
                  }}
                >
                  {kw}
                </span>
              );
            })
          )}
        </div>
      </div>
      {/* Tata letak (Grid): Positif di sisi Kiri, Negatif di sisi Kanan (Di layar lebar) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Kolom Tema Positif */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-2">
            <ThumbsUp className="h-4 w-4 text-emerald-500" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">
              Positive Themes
            </h4>
          </div>
          {/* Render kartu-kartu topik jika datanya ada, kalau tidak tampilkan pesan kosong */}
          {hasPositive ? (
            <div className="space-y-3">
              {topicsPositive.map((topic, i) => (
                <TopicCard key={i} topic={topic} type="positive" />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic pl-1">
              No prominent positive themes extracted.
            </p>
          )}
        </div>

        {/* Kolom Tema Negatif */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-rose-500/10 pb-2">
            <ThumbsDown className="h-4 w-4 text-rose-500" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-rose-500 dark:text-rose-400">
              Negative Themes
            </h4>
          </div>
          {hasNegative ? (
            <div className="space-y-3">
              {topicsNegative.map((topic, i) => (
                <TopicCard key={i} topic={topic} type="negative" />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic pl-1">
              No prominent negative themes extracted.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
