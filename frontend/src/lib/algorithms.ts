import type { Comment } from "@/types";

// ── REQUIREMENT C: PENCARIAN (SEQUENTIAL & BINARY SEARCH) ──

/**
 * 1. Sequential Search
 * Mencari komentar secara berurutan satu per satu.
 * Digunakan jika kita ingin mencari substring kata kunci secara fleksibel tanpa harus mengurutkan data dulu.
 */
export function sequentialSearch(comments: Comment[], keyword: string): Comment[] {
  if (!keyword.trim()) return comments;
  
  const lowerKeyword = keyword.toLowerCase();
  const results: Comment[] = [];
  
  for (let i = 0; i < comments.length; i++) {
    const text = comments[i].textDisplay?.toLowerCase() || "";
    if (text.includes(lowerKeyword)) {
      results.push(comments[i]);
    }
  }
  
  return results;
}

/**
 * 2. Binary Search
 * Mencari komentar dengan membelah data menjadi dua bagian secara berulang.
 * SYARAT: Array harus dalam keadaan TERURUT secara abjad terlebih dahulu.
 * Karena Binary Search idealnya untuk pencocokan awalan (prefix/exact match) pada array terurut.
 */
export function binarySearch(comments: Comment[], keyword: string): Comment[] {
  if (!keyword.trim()) return comments;
  const lowerKeyword = keyword.toLowerCase();

  // Langkah 1: Urutkan array berdasarkan abjad teks (Wajib untuk Binary Search)
  const sortedComments = [...comments].sort((a, b) => {
    const textA = (a.textDisplay || "").toLowerCase();
    const textB = (b.textDisplay || "").toLowerCase();
    if (textA < textB) return -1;
    if (textA > textB) return 1;
    return 0;
  });

  const results: Comment[] = [];
  let left = 0;
  let right = sortedComments.length - 1;

  // Langkah 2: Lakukan pencarian biner (Mencari indeks salah satu kata yang cocok/mengandung prefix)
  let foundIndex = -1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const text = (sortedComments[mid].textDisplay || "").toLowerCase();

    // Untuk teks string, modifikasi Binary Search: kita cek apakah string ini dimulai dengan keyword, atau mengandung keyword
    if (text.includes(lowerKeyword)) {
      foundIndex = mid;
      break; // Ketemu salah satu!
    } else if (text < lowerKeyword) {
      left = mid + 1; // Cari di kanan
    } else {
      right = mid - 1; // Cari di kiri
    }
  }

  // Langkah 3: Karena bisa jadi ada lebih dari 1 hasil yang cocok berdekatan, kita melebar ke kiri dan ke kanan dari foundIndex
  if (foundIndex !== -1) {
    results.push(sortedComments[foundIndex]);
    
    // Cek tetangga sebelah kiri
    let i = foundIndex - 1;
    while (i >= 0 && (sortedComments[i].textDisplay || "").toLowerCase().includes(lowerKeyword)) {
      results.unshift(sortedComments[i]);
      i--;
    }
    
    // Cek tetangga sebelah kanan
    let j = foundIndex + 1;
    while (j < sortedComments.length && (sortedComments[j].textDisplay || "").toLowerCase().includes(lowerKeyword)) {
      results.push(sortedComments[j]);
      j++;
    }
  }

  return results;
}

// ── REQUIREMENT D: PENGURUTAN (SELECTION & INSERTION SORT) ──

/**
 * 3. Selection Sort (Berdasarkan Panjang Teks)
 * Algoritma pengurutan yang mencari nilai terkecil/terbesar dari sisa array, lalu menukarnya ke depan.
 * Mode: "asc" (terpendek ke terpanjang) atau "desc" (terpanjang ke terpendek)
 */
export function selectionSortByLength(comments: Comment[], mode: "asc" | "desc" = "desc"): Comment[] {
  const arr = [...comments]; // Clone array agar tidak mengubah referensi aslinya
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    let targetIdx = i;
    for (let j = i + 1; j < n; j++) {
      const lenA = (arr[j].textDisplay || "").length;
      const lenTarget = (arr[targetIdx].textDisplay || "").length;

      if (mode === "desc") {
        if (lenA > lenTarget) targetIdx = j;
      } else {
        if (lenA < lenTarget) targetIdx = j;
      }
    }
    // Lakukan Swap (Tukar posisi)
    if (targetIdx !== i) {
      const temp = arr[i];
      arr[i] = arr[targetIdx];
      arr[targetIdx] = temp;
    }
  }

  return arr;
}

/**
 * 4. Insertion Sort (Berdasarkan Tingkat Sentimen: Positif -> Netral -> Negatif)
 * Algoritma pengurutan yang mengambil satu elemen, lalu menyisipkannya ke posisi yang tepat pada bagian yang sudah terurut.
 */
export function insertionSortBySentiment(comments: Comment[]): Comment[] {
  const arr = [...comments];
  const n = arr.length;

  // Skor untuk penentuan urutan (Positive paling atas, Negative paling bawah)
  const sentimentScore = (sentiment: string) => {
    if (sentiment === "positive") return 3;
    if (sentiment === "neutral") return 2;
    if (sentiment === "negative") return 1;
    return 0;
  };

  for (let i = 1; i < n; i++) {
    const currentItem = arr[i];
    const currentScore = sentimentScore(currentItem.sentiment);
    let j = i - 1;

    // Geser elemen-elemen sebelumnya yang skornya lebih kecil (karena kita ingin descending 3 -> 2 -> 1)
    while (j >= 0 && sentimentScore(arr[j].sentiment) < currentScore) {
      arr[j + 1] = arr[j];
      j--;
    }
    // Sisipkan di posisi yang kosong
    arr[j + 1] = currentItem;
  }

  return arr;
}
