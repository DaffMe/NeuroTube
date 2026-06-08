import { motion } from "framer-motion"; // Pustaka eksternal untuk animasi pergerakan elemen UI
import { Trash2, BarChart3, Clock } from "lucide-react"; // Pustaka koleksi ikon vektor yang indah
import type { AnalyzedVideo } from "@/types"; // Kerangka tipe data cetak biru daftar video hasil analisis
import { clearHistory } from "@/services/api"; // Fungsi pemanggil jaringan (API) untuk menghapus seluruh riwayat video
import { Button } from "@/components/ui/button"; // Komponen antarmuka tombol modular bawaan dari Shadcn UI

// Konfigurasi animasi efek pegas agar mulus saat muncul
const spring = { type: "spring" as const, stiffness: 400, damping: 20 };

// Konfigurasi wadah animasi (staggerChildren membuat anaknya muncul satu per satu bergantian secara efek domino)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

// Konfigurasi animasi untuk setiap satu kartu video di daftar riwayat
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: spring },
};

// Atribut parameter yang dibutuhkan (di-oper dari komponen bapak/App.tsx)
interface Props {
  history: AnalyzedVideo[];
  onSelect: (video: AnalyzedVideo) => void; // Fungsi saat video diklik
  onClear: () => void;                      // Fungsi saat tombol "Hapus Semua" diklik
  onDelete: (videoId: string) => void;      // Fungsi saat ikon tong sampah pada 1 video diklik
}

export function AnalyzedVideoList({ history, onSelect, onClear, onDelete }: Props) {
  // Jika riwayat kosong, jangan tampilkan kotak riwayat ini sama sekali
  if (history.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.3 }}
      className="mt-12 w-full max-w-2xl"
    >
      {/* Judul "Riwayat Analisis" dan Tombol Hapus Semua */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Analyses
          </h2>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} transition={spring}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearHistory(); // Menghapus localStorage lokal
              onClear();      // Memicu penghapusan di Server / Database
            }}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Clear All
          </Button>
        </motion.div>
      </div>

      {/* Wadah daftar yang membungkus pemetaan riwayat video */}
      <motion.div
        className="space-y-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {history.map((video) => (
          <motion.div
            key={video.id}
            variants={itemVariants}
            whileHover={{ scale: 1.01, x: 4 }}
            whileTap={{ scale: 0.99 }}
            transition={spring}
            onClick={() => onSelect(video)} // Tombol utama: Buka analisis video ini
            className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-3 text-left backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-card cursor-pointer group"
          >
            {/* Thumbnail Video dari YouTube */}
            <img
              src={video.thumbnail}
              alt={video.title}
              referrerPolicy="no-referrer"
              className="h-12 w-20 rounded-xl object-cover"
            />
            {/* Judul dan Nama Channel */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{video.title}</p>
              <p className="text-xs text-muted-foreground">{video.channelTitle}</p>
            </div>
            {/* Lencana (Badge) Jumlah Komentar yang teranalisis & Tombol Hapus Spesifik */}
            {/* event.stopPropagation() Mencegah agar saat klik ikon hapus, ia tidak ikut ter-klik membuka videonya */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                <BarChart3 className="h-3 w-3" />
                {video.sentimentResult.totalComments}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                onClick={() => onDelete(video.videoId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
