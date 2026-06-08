import { motion } from "framer-motion"; // Pustaka eksternal untuk memperindah tampilan muncul/hilang komponen (animasi mengambang)
import { Eye, ThumbsUp, MessageCircle, Calendar, ExternalLink } from "lucide-react"; // Kumpulan ikon yang merepresentasikan tombol-tombol media sosial
import type { VideoInfo } from "@/types"; // Cetak biru pembatas format data spesifikasi video YouTube agar ketat
import { ExpandableText } from "./ExpandableText"; // Komponen tombol pemotong teks cerdas baca selengkapnya buatan sendiri

// Konfigurasi standar untuk animasi memantul
const spring = { type: "spring" as const, stiffness: 400, damping: 20 };

interface Props {
  video: VideoInfo; // Data video yang didapat dari YouTube API
}

// -----------------------------------------------------------------------------
// KOMPONEN: VideoDetails
// Merender kartu informasi profil video di bagian paling atas halaman hasil analisis (Thumbnail, Judul, Angka Views)
// -----------------------------------------------------------------------------
export function VideoDetails({ video }: Props) {
  // Array statistik umum YouTube untuk dirender (tampilkan) di dalam lencana berbentuk kapsul di bawah judul video
  const stats = [
    { icon: Eye, label: "Views", value: video.viewCount },
    { icon: ThumbsUp, label: "Likes", value: video.likeCount },
    { icon: MessageCircle, label: "Comments", value: video.commentCount },
    {
      icon: Calendar,
      label: "Published",
      // Konversi Format Waktu Publikasi standar komputer (ISO Date) menjadi teks waktu berformat internasional manusia ("Nov 15, 2026")
      value: new Date(video.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.1 }}
      className="overflow-hidden rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl"
    >
      {/* Kotak Sampul Gambar Video (Thumbnail) */}
      <div className="relative aspect-video w-full overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
        {/* Lapis gradien penggelap tipis di bagian paling bawah sampul gambar (Inset Fade) */}
        <div className="absolute inset-0 bg-linear-to-t from-card via-transparent to-transparent" />
      </div>

      {/* Bagian Deskripsi Teks */}
      <div className="space-y-4 p-5">
        <div>
          {/* Judul Besar Video */}
          <motion.h2
            className="text-lg font-bold leading-snug"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {video.title}
          </motion.h2>
          {/* Link Saluran Pembuat Video (Channel) */}
          <motion.a
            href={`https://youtube.com/watch?v=${video.id}`} // Tombol langsung me-link ke situs resmi YouTube
            target="_blank" // Buka link di Tab Baru browser pengguna
            rel="noopener noreferrer" // Praktik keamanan dasar (Security Best Practice) untuk setiap link Tab Baru
            className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
            whileHover={{ x: 3 }} // Animasi ikon panah terdorong ke arah luar kanan ketika hover
            transition={spring}
          >
            {video.channelTitle}
            <ExternalLink className="h-3 w-3" />
          </motion.a>
        </div>

        {/* Lencana Kapsul untuk Angka Statistik */}
        <div className="flex flex-wrap gap-2">
          {stats.map(({ icon: Icon, label, value }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring, delay: 0.25 + i * 0.07 }} // Kapsul muncul memantul bergiliran (Domino Effect/Staggering)
              whileHover={{ scale: 1.08, y: -2 }}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-semibold">{value}</span>
            </motion.div>
          ))}
        </div>

        {/* Kolom Teks Deskripsi Asli dari Video */}
        {video.description && (
          <div className="rounded-2xl bg-secondary/30 p-4">
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
              Description
            </h3>
            {/* Dipotong dan Diringkas menggunakan komponen pintar ExpandableText karena teks deskripsi YouTube biasanya sangat-sangat panjang */}
            <ExpandableText 
              text={video.description} 
              lineLimit={4}
              className="text-xs leading-relaxed text-muted-foreground/90 font-medium"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
