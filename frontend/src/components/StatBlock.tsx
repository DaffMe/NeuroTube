import { motion } from "framer-motion"; // Memanggil pustaka penambah efek animasi saat kotak statistik bergeser naik
import { TrendingUp, TrendingDown, Minus } from "lucide-react"; // Memanggil ikon panah naik (Positif), turun (Negatif), dan datar (Netral)
import type { SentimentResult } from "@/types"; // Memanggil kerangka penampung angka total statistik

const spring = { type: "spring" as const, stiffness: 400, damping: 20 };

interface Props {
  label: string;
  value: number;
  total: number;
  type: "positive" | "negative" | "neutral";
  delay?: number;
}

// Konfigurasi skema warna desain tampilan untuk masing-masing tipe panel stat
const config = {
  positive: {
    icon: TrendingUp, // Ikon garis hijau naik
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    bar: "bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500",
    glow: "shadow-emerald-500/20",
  },
  negative: {
    icon: TrendingDown, // Ikon garis merah turun
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    bar: "bg-gradient-to-r from-rose-500 to-rose-600 dark:from-rose-400 dark:to-rose-500",
    glow: "shadow-rose-500/20",
  },
  neutral: {
    icon: Minus, // Ikon garis datar netral warna kuning/amber
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    bar: "bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500",
    glow: "shadow-amber-500/20",
  },
};

// -----------------------------------------------------------------------------
// KOMPONEN ANAK: StatBlock
// Merender sebuah kartu angka statistik sentimen tunggal (Satu kartu saja, entah itu Positif, Netral, atau Negatif).
// Ia menerima properti seperti label (judul), value (jumlah hitungan spesifik tersebut), dan total (seluruh populasi komentar).
// -----------------------------------------------------------------------------
export function StatBlock({ label, value, total, type, delay = 0 }: Props) {
  // Mengambil konfigurasi warna dan ikon berdasarkan jenis (Tipe Positif = Hijau, Tipe Netral = Kuning, Tipe Negatif = Merah)
  const { icon: Icon, color, bg, bar, glow } = config[type];
  
  // Hitung persentase metrik ini dibandingkan dengan total seluruh komentar.
  // Jika pembagian valid (total > 0), kembalikan perhitungan dengan pembulatan, selain itu otomatis dianggap 0%.
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    // motion.div menciptakan efek masuk berurutan (muncul belakangan sesuai 'delay') dari bawah ke atas secara elastis
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }} // Posisi mulanya menghilang dan mengecil
      animate={{ opacity: 1, y: 0, scale: 1 }}    // Posisi akhirnya terlihat 100% dan tepat pada tempatnya
      transition={{ ...spring, delay }}           // Pengaturan durasi dan kelambatan waktu masuk
      whileHover={{ scale: 1.04, y: -4 }}         // Efek melayang mengambang saat kursor diarahkan padanya
      className={`rounded-2xl border border-border/50 ${bg} p-4 shadow-lg ${glow} backdrop-blur-sm cursor-pointer`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Ikon Tren panah arah */}
          <Icon className={`h-4 w-4 ${color}`} />
          {/* Label Judul Sentimen (Positive / Neutral / Negative) */}
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
            {label}
          </span>
        </div>
        {/* Tampilkan persentase secara besar di pojok kanan atas kartu stat */}
        <span className={`text-xl font-black ${color} drop-shadow-sm`}>{percentage}%</span>
      </div>

      {/* Bagian balok persentase kemajuan horisontal */}
      <div className="h-2.5 overflow-hidden rounded-full bg-muted/50">
        <motion.div
          className={`h-full rounded-full ${bar}`}
          initial={{ width: 0 }}                    // Memulai pertumbuhan bar horizontal dari 0%
          animate={{ width: `${percentage}%` }}     // Balok berhenti pada panjang persentase yang sudah dihitung
          transition={{ duration: 1, ease: "easeOut", delay: delay + 0.3 }}
        />
      </div>

      {/* Label jumlah komentar mentahnya di bagian bawah sudut kanan */}
      <p className="mt-2 text-right text-xs font-bold text-foreground/70 uppercase tracking-tight">
        Count: {value}
      </p>
    </motion.div>
  );
}

// ── KOMPONEN INDUK: Ringkasan Panel Statistik Keseluruhan ────────────────────────────────────────────────────────────

export function SentimentSummary({ result }: { result: SentimentResult }) {
  const { positive, negative, neutral, totalComments, averageScore } = result;
  
  // Secara garis besar, sentimen lebih dominan ke mana?
  // 0.2 merepresentasikan batasan batas wajar bagi sebuah video (20% condong positif)
  const emoji = averageScore > 0.2 ? "😊" : averageScore < -0.2 ? "😟" : "😐";
  const label =
    averageScore > 0.2
      ? "Mostly Positive"
      : averageScore < -0.2
        ? "Mostly Negative"
        : "Mixed / Neutral";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.2 }}
      className="space-y-4"
    >
      {/* Kartu Persegi Panjang Lencana Skore Utama Keseluruhan  */}
      <motion.div
        className="flex items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 cursor-pointer"
        whileHover={{ scale: 1.02 }}
        transition={spring}
      >
        <motion.span
          className="text-3xl"
          animate={{ scale: [1, 1.2, 1] }} // Efek denyut jantung pada emoji raut wajah
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
        >
          {emoji}
        </motion.span>
        <div>
          <p className="text-lg font-bold">{label}</p>
          <p className="text-xs text-muted-foreground">
            Average score: {averageScore.toFixed(3)} · {totalComments} comments analyzed
          </p>
        </div>
      </motion.div>

      {/* Tiga Buah Tata Letak Kisi (Grid) untuk masing-masing blok stat (Memanggil komponen anak `StatBlock` sebanyak 3 kali) */}
      <div className="grid grid-cols-3 gap-3">
        <StatBlock label="Positive" value={positive} total={totalComments} type="positive" delay={0.3} />
        <StatBlock label="Neutral" value={neutral} total={totalComments} type="neutral" delay={0.4} />
        <StatBlock label="Negative" value={negative} total={totalComments} type="negative" delay={0.5} />
      </div>
    </motion.div>
  );
}
