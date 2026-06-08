import { motion } from "framer-motion"; // Pustaka eksternal untuk membuat animasi perpindahan yang mengalir
import { Moon, Sun } from "lucide-react"; // Pustaka ikon untuk tombol ubah tema terang/gelap
import { useTheme } from "@/components/theme-context"; // Memanggil fungsi pengubah tema (Theme Context) buatan sendiri
import { Button } from "@/components/ui/button"; // Memanggil komponen standar tombol bergaya Shadcn UI

// Pengaturan khusus untuk efek animasi pegas berayun secara global pada bilah navigasi (Header)
const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 15,
};

// -----------------------------------------------------------------------------
// KOMPONEN UTAMA: Header
// Merender Bilah Navigasi Atas (Navbar) statis/lengket yang memuat Logo dan Tombol Pengalih Mode Terang/Gelap
// -----------------------------------------------------------------------------
export function Header() {
  // Mengambil state tema warna dari React Context API
  const { resolvedTheme, setTheme } = useTheme();

  return (
    // Wadah animasi pembungkus utama Header (muncul menyelinap dari atas atap peramban)
    // Terdapat efek backdrop-blur untuk memberi ilusi kaca tembus pandang (Glassmorphism)
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...springTransition, delay: 0.1 }}
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* Kelompok Kiri: Area Gambar Logo & Teks Merek */}
        <motion.a
          href="/"
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight"
          whileHover={{ scale: 1.05 }} // Tombol logo membesar sedikit saat disorot mouse
          whileTap={{ scale: 0.95 }} // Efek tekanan klik ke dalam
          transition={springTransition}
        >
          {/* Efek Gerakan Geleng-Geleng pada Ikon Otak Logo Utama */}
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} // Animasi bergerak 2 detik, diam 3 detik, ulang terus menerus
            className="flex h-8 w-8 items-center justify-center"
          >
            <img src="/favicon.png" alt="Logo" className="h-full w-full object-contain" />
          </motion.div>
          {/* Penamaan Merek "NeuroTube" Berwarna Ganda */}
          <span className="flex items-center font-extrabold tracking-tight">
            <span className="text-primary">Neuro</span>
            <span className="text-logo-tube transition-colors duration-300">Tube</span>
          </span>
        </motion.a>

        {/* Kelompok Kanan: Tombol Sakelar Pengubah Mode Layar Gelap (Dark Mode) ke Terang (Light Mode) */}
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }} transition={springTransition}>
          <Button
            variant="ghost"
            size="icon"
            // Operasi Pembalikan (Toggle): Jika saat ini gelap, ubah ke terang. Begitu pula sebaliknya.
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            {/* Animasi Ikon Pertukaran Siang/Malam secara Instan */}
            {resolvedTheme === "dark" ? (
              // Mode Gelap aktif -> Tampilkan Ikon Matahari (untuk opsi pindah ke Terang)
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              // Mode Terang aktif -> Tampilkan Ikon Bulan (untuk opsi pindah ke Gelap)
              <Moon className="h-5 w-5 text-primary" />
            )}
          </Button>
        </motion.div>
      </div>
    </motion.header>
  );
}
