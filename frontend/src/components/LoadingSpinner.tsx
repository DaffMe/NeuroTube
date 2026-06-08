import { motion } from "framer-motion";

const dots = [0, 1, 2, 3, 4];

interface LoadingSpinnerProps {
  message?: string;
  progress?: number;
}

// -----------------------------------------------------------------------------
// KOMPONEN: LoadingSpinner
// Berfungsi untuk merender tampilan pemuatan (Loading Screen) saat pengguna harus menunggu proses analisis dari server
// Menampilkan logo yang bergerak memantul, serta opsi bilah kemajuan (Progress Bar) atau titik animasi.
// -----------------------------------------------------------------------------
export function LoadingSpinner({ message = "Analyzing sentiments...", progress }: LoadingSpinnerProps) {
  // Mengecek apakah komponen ini menerima sebuah angka kemajuan (progress), 
  // karena terkadang proses hanya berupa titik-titik bergerak jika progress tidak diketahui (undefined)
  const hasProgress = typeof progress === "number";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-6 py-20 w-full max-w-md mx-auto"
    >
      {/* Ikon Otak Memantul (Bouncing Logo) */}
      <motion.div
        animate={{
          y: [0, -15, 0], // Bergerak naik turun sejauh 15 piksel secara kontinu
          rotate: [0, 5, -5, 0], // Bergoyang ke kanan dan kiri sebesar 5 derajat
        }}
        transition={{
          duration: 2.0, // Setiap 1 siklus gerakan butuh waktu 2 detik
          repeat: Infinity, // Ulangi gerakan tanpa henti
          ease: "easeInOut",
        }}
        className="rounded-full bg-primary/10 p-5 shadow-inner"
      >
        <div className="flex h-12 w-12 items-center justify-center">
          <img src="/favicon.png" alt="Loading Logo" className="h-full w-full object-contain" />
        </div>
      </motion.div>

      {/* Bagian Pilihan Tampilan Menunggu: Bilah Progres (Angka Persentase) ATAU Titik-Titik Memantul */}
      {hasProgress ? (
        // JIKA backend memberikan angka progres pengunduhan spesifik (misal: 45%)
        <div className="w-full space-y-2">
          {/* Latar Belakang Bilah Kemajuan Abu-Abu */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/80">
            {/* Garis Isi Berwarna Biru yang terus berjalan memanjang */}
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-primary via-accent to-primary"
              initial={{ width: 0 }} // Mulai dari 0 lebar
              // Nilai minimal progress dijamin tidak dibawah 0, dan dijamin maksimal tidak melebih 100 persen
              animate={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }} // Pergerakan memanjang memakan waktu 0.3 detik setiap pembaruan angka
              style={{
                boxShadow: "0 0 8px hsl(var(--primary))",
              }}
            />
          </div>
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      ) : (
        // JIKA tidak ada angka persentase, maka tampilkan titik-titik standar yang naik-turun memantul bergelombang
        <div className="flex gap-2">
          {dots.map((i) => (
            <motion.div
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-primary"
              animate={{
                y: [0, -10, 0],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.12, // Setiap titik diberikan waktu tunda yang berurutan agar efek "ombak" tercipta
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Teks pesan status saat ini ("Sedang mengunduh..." atau "Sedang memproses ML...") */}
      <motion.p
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }} // Efek teks bernafas (redup-terang) lambat
        className="text-sm font-semibold text-muted-foreground text-center"
      >
        {message}
      </motion.p>
    </motion.div>
  );
}
