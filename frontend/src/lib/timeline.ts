import type { Comment } from "@/types";

// Antarmuka (Interface) Struktur Data untuk Ember Periode Waktu
export interface TimelineBucket {
  dateLabel: string; // Label waktu (Contoh: "2026-11-05" atau "2026-11")
  positive: number;  // Jumlah komentar positif di rentang waktu ini
  neutral: number;   // Jumlah komentar netral di rentang waktu ini
  negative: number;  // Jumlah komentar negatif di rentang waktu ini
  timestamp: number; // Angka waktu mentah (UNIX timestamp) untuk keperluan pengurutan
}

// -----------------------------------------------------------------------------
// FUNGSI UTAMA: getTimelineData
// Berfungsi untuk mengolah daftar ribuan komentar mentah menjadi kelompok-kelompok waktu (Ember/Bucket)
// agar bisa digambarkan sebagai grafik tren sentimen yang naik-turun seiring waktu.
// -----------------------------------------------------------------------------
export function getTimelineData(comments: Comment[], timeRange: string = "MAX") {
  // Jika tidak ada komentar sama sekali, kembalikan objek data kosong dengan aman
  if (!comments || comments.length === 0) return { data: [], bucketType: "day" as const, getBucketKey: () => "" };

  // Parse (Terjemahkan) string waktu publikasi menjadi angka murni UNIX Timestamp
  // Abaikan komentar yang format waktunya rusak atau tidak valid (isNaN)
  const times = comments
    .map((c) => new Date(c.publishedAt).getTime())
    .filter((t) => !isNaN(t));
  if (times.length === 0) return { data: [], bucketType: "day" as const, getBucketKey: () => "" };

  // Logika Pemilihan Tipe Skala Waktu (Jam, Hari, Bulan, Tahun)
  // Tergantung pada seberapa lebar rentang waktu yang diminta oleh pengguna di filter grafik
  let bucketType: "hour" | "day" | "month" | "year" = "day";
  switch (timeRange) {
    case "1D": // Tampilan 1 Hari terakhir -> Dipecah per Jam
      bucketType = "hour";
      break;
    case "5D": // Tampilan 5 Hari
    case "1M": // Tampilan 1 Bulan -> Dipecah per Hari
      bucketType = "day";
      break;
    case "6M": // Tampilan 6 Bulan
    case "YTD":// Tampilan Sejak Awal Tahun
    case "1Y": // Tampilan 1 Tahun -> Dipecah per Bulan
      bucketType = "month";
      break;
    case "MAX":// Tampilan Sejarah Penuh
    default:
      bucketType = "year"; // Dipecah per Tahun
      break;
  }

  // FUNGSI INTERNAL: Mengambil "Kunci Ember" (Bucket Key) untuk sebuah tanggal
  // Berfungsi menyeragamkan tanggal yang rumit menjadi label yang bisa dikelompokkan
  // Misal: "2026-11-05 14:32:00" diubah menjadi "2026-11" jika tipe embernya "bulan" (month)
  const getBucketKey = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Unknown";

    if (bucketType === "hour") {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0"); // Bulan dimulai dari 0 di JS, jadi ditambah 1. padStart memastikan format "09" bukan "9"
      const dy = String(d.getDate()).padStart(2, "0");
      const hr = String(d.getHours()).padStart(2, "0");
      return `${yr}-${mo}-${dy} ${hr}:00`;
    } else if (bucketType === "day") {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const dy = String(d.getDate()).padStart(2, "0");
      return `${yr}-${mo}-${dy}`;
    } else if (bucketType === "month") {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      return `${yr}-${mo}`;
    } else {
      return `${d.getFullYear()}`;
    }
  };

  // Kamus (Dictionary) Penyimpanan Sementara untuk Menghitung Kelompok Komentar
  // Format: { "2026-11": { positive: 5, neutral: 2, negative: 1, timestamp: ... } }
  const bucketMap: Record<string, { positive: number; neutral: number; negative: number; timestamp: number }> = {};

  // Mulai perulangan penghitungan dan pengelompokan untuk SETIAP komentar satu per satu
  comments.forEach((c) => {
    const key = getBucketKey(c.publishedAt);
    if (key === "Unknown") return; // Abaikan jika waktu tidak jelas

    // Jika "Ember" untuk waktu ini belum pernah dibuat sebelumnya, inisialisasi ember baru dengan angka nol
    if (!bucketMap[key]) {
      const bucketDate = new Date(c.publishedAt);
      // Pembulatan/Penyeragaman Waktu (Timestamp Normalization) agar pengurutan lebih presisi
      if (bucketType === "hour") {
        bucketDate.setMinutes(0, 0, 0); // Bulatkan ke jam utuh (misal 14:00:00)
      } else if (bucketType === "day") {
        bucketDate.setHours(0, 0, 0, 0); // Bulatkan ke jam 12 malam (00:00:00)
      } else if (bucketType === "month") {
        bucketDate.setDate(1); // Bulatkan ke tanggal 1 setiap bulannya
        bucketDate.setHours(0, 0, 0, 0);
      } else {
        bucketDate.setMonth(0, 1); // Bulatkan ke tanggal 1 Januari setiap tahunnya
        bucketDate.setHours(0, 0, 0, 0);
      }

      bucketMap[key] = {
        positive: 0,
        neutral: 0,
        negative: 0,
        timestamp: bucketDate.getTime(),
      };
    }
    
    // Tambah nilai penghitungan (+1) untuk kategori sentimen spesifik di dalam Ember yang tepat
    bucketMap[key][c.sentiment]++;
  });

  // Tahap Akhir: Konversi Kamus (Dictionary/Map) tadi menjadi Array biasa dan urutkan secara Kronologis
  // dari waktu terlama ke waktu terbaru (Kiri ke Kanan di grafik)
  const sortedData: TimelineBucket[] = Object.entries(bucketMap)
    .map(([dateLabel, counts]) => ({
      dateLabel,
      ...counts, // Sebar isi hitungannya menggunakan spread operator (positive, neutral, negative, timestamp)
    }))
    // Mengurutkan dari angka timestamp yang terkecil (masa lalu) ke terbesar (masa depan)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Kembalikan kumpulan data yang sudah rapi beserta informasi tipe embernya
  return { data: sortedData, bucketType, getBucketKey };
}
