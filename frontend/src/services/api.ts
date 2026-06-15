import type { AnalysisResponse, AnalyzedVideo, Comment } from "@/types"; // Format pengaman tipe dari TypeScript yang mewakili respons paket data dari backend Golang/Python

// Nama kunci penyimpanan lokal (Local Storage) di browser pengguna
const STORAGE_KEY = "NeuroTube_history";

// Alamat URL Server Backend. Mengambil dari file .env (environment variables), atau jika tidak ada, gunakan localhost
const FETCHER_API = (import.meta.env.VITE_FETCHER_API_URL || "http://localhost:8080") + "/api";
const ML_API = (import.meta.env.VITE_ML_API_URL || "http://localhost:8000") + "/api";

// ── Antarmuka API Publik (Public API) ───────────────────────────────────────────────────────────────

// Fungsi untuk mengirim tautan YouTube ke server Golang untuk mulai dianalisis
export async function submitAnalysisJob(url: string, limit?: number, force = false): Promise<{ jobId: string; status: string; message: string }> {
  // Jika 'force' bernilai true, maka server akan dipaksa untuk menganalisis ulang meskipun videonya sudah pernah dianalisis
  const endpoint = force ? `${FETCHER_API}/analyze?force=true` : `${FETCHER_API}/analyze`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // Memberitahu server bahwa kita mengirim format data JSON
    body: JSON.stringify({ url, limit }), // Membungkus URL dan limit ke dalam format JSON
  });
  
  // Jika server mengembalikan status error (seperti 400 atau 500)
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to submit analysis job");
  }
  return response.json(); // Mengembalikan respons berupa Job ID dari server
}

// Fungsi untuk memeriksa status pekerjaan (Apakah sudah selesai atau belum?) secara manual (Polling)
export async function getJobStatus(jobId: string): Promise<{ status: string; message: string }> {
  const response = await fetch(`${FETCHER_API}/status/${jobId}`);
  if (!response.ok) {
    throw new Error("Failed to get job status");
  }
  return response.json();
}

// Fungsi untuk membuat alamat URL aliran data langsung (Live Streaming - Server Sent Events)
export function getJobStatusStreamUrl(jobId: string): string {
  return `${FETCHER_API}/status/${jobId}/stream`;
}

// Fungsi untuk mengambil hasil analisis lengkap (statistik + komentar) berdasarkan Job ID dari server Python
export async function getAnalysisResults(jobId: string): Promise<AnalysisResponse> {
  const response = await fetch(`${ML_API}/analysis/${jobId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to get analysis results");
  }
  const data = await response.json();
  
  // Pastikan datanya benar-benar sudah berstatus "completed" sebelum dikirim ke komponen UI
  if (data.status !== "completed") {
      throw new Error(`Analysis not completed. Status: ${data.status}`);
  }
  return data as AnalysisResponse;
}

// Fungsi untuk mengambil hasil analisis berdasarkan ID Video YouTube langsung (Bukan Job ID)
export async function getAnalysisByVideo(videoId: string): Promise<AnalysisResponse> {
    const response = await fetch(`${ML_API}/analysis/video/${videoId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || "Failed to get analysis results");
    }
    const data = await response.json();
    if (data.status !== "completed") {
        throw new Error(`Analysis not completed. Status: ${data.status}`);
    }
    return data as AnalysisResponse;
}

// Fungsi ekstraksi ID Video menggunakan Ekspresi Reguler (Regex)
export function extractVideoId(url: string): string | null {
  // Pola regex ini akan mencari kode acak 11 huruf yang merupakan format ID unik standar YouTube
  const patterns = [
    /(?:v=|\/v\/|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/, // Menangkap dari format link panjang
    /^([a-zA-Z0-9_-]{11})$/, // Menangkap jika pengguna hanya memasukkan 11 ID secara langsung
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1]; // Mengembalikan ID videonya saja
  }
  return null;
}

// Fungsi pembantu sederhana untuk mengecek apakah tautan yang dimasukkan itu valid (mengandung ID)
export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

// ── Manajemen Riwayat (Gabungan API Database + Cadangan Local Storage Browser) ───────────────────────────────────────────────────

// Fungsi untuk meminta daftar riwayat analisis dari database server
export async function fetchHistory(limit = 20): Promise<AnalyzedVideo[]> {
    try {
        const response = await fetch(`${ML_API}/history?limit=${limit}`);
        if (!response.ok) throw new Error("Failed to fetch history from server");
        const data = await response.json();
        
        // Simpan cadangannya ke memori browser lokal (Local Storage) untuk berjaga-jaga jika server mati
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        return data;
    } catch (err) {
        console.warn("Failed to fetch history from server, falling back to local storage", err);
        // Jika server bermasalah, baca dan kembalikan data yang tersimpan di dalam memori lokal browser
        return getLocalHistory();
    }
}

// Fungsi untuk membaca daftar riwayat dari memori lokal browser tanpa menghubungi server
export function getLocalHistory(): AnalyzedVideo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Fungsi untuk menambahkan riwayat baru ke daftar lokal secara manual (Jarang dipakai, lebih sering pakai 'fetchHistory')
export function saveToHistory(video: AnalyzedVideo): void {
  const history = getLocalHistory();
  const exists = history.findIndex((v) => v.videoId === video.videoId);
  
  // Jika videonya sudah ada di riwayat, hapus yang lama, lalu dorong versi terbaru ke urutan paling atas
  if (exists !== -1) {
    history.splice(exists, 1);
  }
  history.unshift(video);
  // Batasi hanya menyimpan 20 video terakhir agar memori browser tidak penuh
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
}

// Fungsi untuk menghapus riwayat dari memori lokal browser
export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Fungsi untuk menghapus seluruh riwayat yang ada di server database (Hard Delete/Clear All)
export async function deleteHistoryFromServer(): Promise<void> {
  const response = await fetch(`${ML_API}/history`, {
    method: "DELETE", // Menggunakan metode HTTP DELETE
  });
  if (!response.ok) {
    throw new Error("Failed to clear history on server");
  }
  clearHistory(); // Setelah sukses dihapus di server, hapus juga cadangan lokalnya
}

// Fungsi untuk menghapus 1 video spesifik dari riwayat di server database
export async function deleteVideoFromServer(videoId: string): Promise<void> {
  const response = await fetch(`${ML_API}/history/${videoId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete video from server");
  }
  
  // Sinkronisasikan secara manual penghapusan ini ke memori lokal browser
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const history: AnalyzedVideo[] = JSON.parse(raw);
      // Buang item yang videoId-nya sama dengan yang baru saja dihapus
      const updated = history.filter((v) => v.videoId !== videoId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.error("Failed to update local storage after deletion", err);
  }
}

// ── CRUD Comments (Assignment Requirement A) ─────────────────────────────────────────────────────────────

export async function addComment(videoId: string, authorName: string, text: string): Promise<Comment> {
  const res = await fetch(`${ML_API}/comments/${videoId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ authorName, text }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to add comment");
  }
  return res.json();
}

export async function updateComment(commentId: string, text: string): Promise<Comment> {
  const res = await fetch(`${ML_API}/comments/${commentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to update comment");
  }
  return res.json();
}

export async function deleteComment(commentId: string): Promise<void> {
  const res = await fetch(`${ML_API}/comments/${commentId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to delete comment");
  }
}

