import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
