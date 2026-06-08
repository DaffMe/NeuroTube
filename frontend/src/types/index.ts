// -----------------------------------------------------------------------------
// FILE TIPE DATA (TYPES/INTERFACES)
// Digunakan oleh TypeScript untuk menegakkan aturan disiplin ketat mengenai
// seperti apa bentuk data objek (API Response) yang diizinkan mengalir di seluruh aplikasi Frontend.
// Hal ini berguna untuk mencegah bug salah ketik nama variabel (Typo).
// -----------------------------------------------------------------------------

// Tipe Data untuk menampung Informasi Umum Meta-Data sebuah Video YouTube
export interface VideoInfo {
  id: string; // ID unik video YouTube (misal: dQw4w9WgXcQ)
  title: string; // Judul asli video
  channelTitle: string; // Nama pembuat saluran
  thumbnail: string; // Tautan URL ke gambar sampul video
  publishedAt: string; // Waktu rilis video di platform
  viewCount: string; // Total penayangan (Views)
  likeCount: string; // Total suka (Likes)
  commentCount: string; // Total komentar (Bisa berbeda dengan jumlah yang dianalisis oleh AI kita)
  description: string; // Deskripsi panjang video
}

// Tipe Data untuk menampung Satu Baris Komentar Spesifik beserta Hasil Anotasi Sentimennya
export interface Comment {
  id: string; // ID komentar asli YouTube
  authorDisplayName: string; // Nama akun pemberi komentar
  authorProfileImageUrl: string; // Foto profil pengguna
  textDisplay: string; // Isi teks komentar (Format HTML render)
  textOriginal: string; // Isi teks murni komentar (Format mentah)
  likeCount: number; // Jumlah orang lain yang menyukai komentar ini
  publishedAt: string; // Waktu komentar dikirimkan ke video
  sentiment: "positive" | "negative" | "neutral"; // Label sentimen hasil tebakan model Machine Learning Python
  sentimentScore: number; // Nilai keyakinan model AI (0.0 sampai 1.0)
  isReply: boolean; // Apakah komentar ini membalas komentar orang lain? (Ya/Tidak)
  parentId?: string; // Tanda opsional yang mereferensikan ID Komentar Induk utamanya (Jika ini adalah balasan)
}

// Tipe Data untuk menampung Hasil Rangkuman Pengelompokan Topik Pembicaraan oleh AI Besar (Gemini/Llama)
export interface TopicCluster {
  topic: string; // Judul ringkas topik pembicaraannya
  summary: string; // Penjelasan agak panjang tentang apa yang diobrolkan netizen mengenai topik ini
  keywords: string[]; // Daftar 3-5 kata kunci penting yang terkait erat
  quotes: string[]; // Cuplikan 2 kutipan komentar asli paling relevan sebagai bukti argumen
}

// Tipe Data untuk menampung Akumulasi Statistik Sentimen Total
export interface SentimentResult {
  positive: number; // Berapa total semua komentar yang dilabeli "Positif"
  negative: number; // Berapa total semua komentar yang dilabeli "Negatif"
  neutral: number; // Berapa total semua komentar yang dilabeli "Netral"
  totalComments: number; // Berapa banyak total sampel komentar yang berhasil ditarik dan dianalisis
  averageScore: number; // Rata-rata bobot hitungan sentimen (-1 untuk terburuk, +1 untuk paling positif)
  topicsPositive?: TopicCluster[]; // Opsional: Array hasil clustering topik khusus sentimen pujian/positif
  topicsNegative?: TopicCluster[]; // Opsional: Array hasil clustering topik khusus sentimen keluhan/negatif
}

// Tipe Data Gabungan khusus untuk Fitur Riwayat Tampilan (History)
export interface AnalyzedVideo {
  id: string; // ID unik internal database relasional (PostgreSQL)
  videoId: string; // ID Video asli milik YouTube
  title: string;
  thumbnail: string;
  channelTitle: string;
  analyzedAt: string; // Catatan kapan komputer server terakhir kali menjalankan analisis pada video ini
  sentimentResult: SentimentResult; // Menyimpan rekap keseluruhan hasil sentimennya
}

// Tipe Data untuk Format Respon Utama Utuh ketika Frontend meminta Server melakukan Analisis API secara Penuh
export interface AnalysisResponse {
  videoInfo: VideoInfo; // Objek informasi detail YouTube
  comments: Comment[]; // Array panjang berisi seribu lebih objek rentetan komentar satu per satu
  sentimentResult: SentimentResult; // Rangkuman statistika akhir
}
