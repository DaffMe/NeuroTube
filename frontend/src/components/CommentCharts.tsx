import { motion } from "framer-motion"; // Pustaka alat efek animasi keluar/masuk komponen
import {
  PieChart, // Kerangka dasar diagram bentuk lingkaran (Pie)
  Pie, // Komponen irisan porsi di dalam diagram lingkaran
  Cell, // Bagian komponen untuk mewarnai masing-masing irisan diagram
  ResponsiveContainer, // Pembungkus agar grafik otomatis menyesuaikan ukuran lebar layar perangkat (Responsif)
  BarChart, // Kerangka dasar diagram bentuk balok/batang
  Bar, // Komponen balok pengisi diagram
  XAxis, // Sumbu garis mendatar (X) pada grafik
  YAxis, // Sumbu garis tegak vertikal (Y) pada grafik
  Tooltip, // Kotak informasi melayang (Pop-up) kecil yang muncul saat kursor menyorot grafik
} from "recharts"; // Pustaka eksternal terkenal khusus untuk menggambar diagram data di React
import type { SentimentResult } from "@/types"; // Format tipe data yang memuat rangkuman statistik sentimen (total skor, jumlah positif/negatif)

// Konfigurasi animasi pegas (spring) untuk membuat transisi memantul dan mulus
const spring = { type: "spring" as const, stiffness: 400, damping: 20 };

// Antarmuka data properti (props) yang diterima komponen dari halaman utama
interface Props {
  result: SentimentResult; // Objek hasil analisis sentimen (jumlah positif, negatif, netral)
}

// -----------------------------------------------------------------------------
// KOMPONEN: CommentCharts
// Berfungsi untuk merender grafik distribusi sentimen (Grafik Lingkaran & Grafik Batang)
// -----------------------------------------------------------------------------
export function CommentCharts({ result }: Props) {
  // Data untuk Grafik Lingkaran (Pie Chart) - Persentase Proporsi
  const pieData = [
    { name: "Positive", value: result.positive, fill: "var(--color-emerald-500)" },
    { name: "Neutral", value: result.neutral, fill: "var(--color-amber-500)" },
    { name: "Negative", value: result.negative, fill: "var(--color-rose-500)" },
  ];

  // Data untuk Grafik Batang (Bar Chart) - Jumlah Total (Count)
  const barData = [
    { name: "Positive", count: result.positive, fill: "var(--color-emerald-500)" },
    { name: "Neutral", count: result.neutral, fill: "var(--color-amber-500)" },
    { name: "Negative", count: result.negative, fill: "var(--color-rose-500)" },
  ];

  return (
    // Wadah animasi pembungkus utama yang muncul dari bawah (y: 30) ke atas (y: 0)
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.35 }}
      className="space-y-6"
    >
      <h3 className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
        Sentiment Distribution
      </h3>

      {/* Grid yang membagi tampilan menjadi 2 kolom pada layar besar (md:grid-cols-2) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Kotak Grafik Lingkaran (Pie Chart) */}
        <motion.div
          className="flex flex-col items-center rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm cursor-pointer"
          whileHover={{ scale: 1.02 }} // Efek membesar saat kursor diarahkan
          transition={spring}
        >
          <p className="mb-2 text-[10px] font-black text-foreground/60 uppercase tracking-widest">Proportion</p>
          {/* ResponsiveContainer memastikan grafik menyesuaikan lebar layar secara otomatis */}
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" // Posisi tengah horizontal
                cy="50%" // Posisi tengah vertikal
                innerRadius={50} // Membuat lingkaran memiliki lubang di tengah (Donut Chart)
                outerRadius={80} // Ukuran batas terluar lingkaran
                paddingAngle={4} // Jarak celah antar potongan kue
                dataKey="value" // Kunci objek yang dibaca nilainya
                animationBegin={400} // Jeda waktu animasi dimulai (ms)
                animationDuration={800} // Durasi animasi menggambar lingkaran
              >
                {/* Mewarnai setiap potongan kue sesuai data */}
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                ))}
              </Pie>
              {/* Tooltip yang muncul jika mengarahkan mouse ke bagian potongan grafik */}
              <Tooltip
                contentStyle={{
                  borderRadius: "16px",
                  border: "1px solid hsl(var(--chart-tooltip-border))",
                  background: "hsl(var(--chart-tooltip-bg) / 0.9)",
                  color: "hsl(var(--chart-tooltip-text))",
                  fontSize: "12px",
                  fontWeight: "700",
                  backdropFilter: "blur(8px)",
                }}
                itemStyle={{ color: "hsl(var(--chart-tooltip-text))" }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legenda (Penjelasan warna di bawah grafik lingkaran) */}
          <div className="mt-2 flex gap-4">
            {pieData.map(({ name, fill }) => (
              <div key={name} className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                {/* Lingkaran warna kecil */}
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fill }} />
                {name}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Kotak Grafik Batang (Bar Chart) */}
        <motion.div
          className="flex flex-col items-center rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm cursor-pointer"
          whileHover={{ scale: 1.02 }}
          transition={spring}
        >
          <p className="mb-2 text-[10px] font-black text-foreground/60 uppercase tracking-widest">Count</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              {/* Sumbu Mendatar X (Kategori: Positif, Netral, Negatif) */}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--chart-tick))" }}
                axisLine={false} // Sembunyikan garis pinggir utama sumbu
                tickLine={false} // Sembunyikan garis kecil penanda titik sumbu
              />
              {/* Sumbu Vertikal Y (Jumlah Angka Komentar) */}
              <YAxis
                tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--chart-tick))" }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "16px",
                  border: "1px solid hsl(var(--chart-tooltip-border))",
                  background: "hsl(var(--chart-tooltip-bg) / 0.9)",
                  color: "hsl(var(--chart-tooltip-text))",
                  fontSize: "12px",
                  fontWeight: "700",
                  backdropFilter: "blur(8px)",
                }}
                itemStyle={{ color: "hsl(var(--chart-tooltip-text))" }}
              />
              {/* Komponen Bar pembentuk balok batangnya */}
              <Bar
                dataKey="count"
                radius={[8, 8, 0, 0]} // Sudut bulat hanya di bagian atas batang (Top Left, Top Right)
                animationBegin={400}
                animationDuration={800}
              >
                {/* Pewarnaan per batang */}
                {barData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </motion.div>
  );
}
