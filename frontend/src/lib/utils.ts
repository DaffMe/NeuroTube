import { clsx, type ClassValue } from "clsx" // Alat untuk membuat nama kelas (Class Name) bersyarat (Contoh: jika benar jadi merah, jika salah jadi abu-abu)
import { twMerge } from "tailwind-merge" // Mesin kecerdasan Tailwind pembatal gaya lama jika ada gaya baru (Penghapus duplikasi)

// -----------------------------------------------------------------------------
// FUNGSI UTILITAS: cn (Class Names)
// Berfungsi sebagai asisten pembantu untuk menggabungkan banyak class CSS Tailwind
// secara dinamis dan aman, menghindari bentrok gaya CSS yang bertabrakan.
// -----------------------------------------------------------------------------

export function cn(...inputs: ClassValue[]) {
  // 1. clsx: Menggabungkan class string/array/object bersyarat menjadi satu string panjang
  // 2. twMerge: Menyaring dan menimpa class Tailwind yang saling bertentangan (misal: "px-2" dan "p-4")
  return twMerge(clsx(inputs))
}
