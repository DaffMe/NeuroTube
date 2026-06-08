import * as React from "react"

import { cn } from "@/lib/utils"

// -----------------------------------------------------------------------------
// KOMPONEN UI BAWAAN SHADCN: Card (Kartu)
// Berfungsi sebagai kotak wadah penampung (container) berdesain panel yang berisi beberapa 
// sub-komponen standar seperti Header (Atas), Title (Judul Utama), Content (Isi Utama), dan Footer (Bawah).
// Semua sub-komponen ini dikemas satu per satu.
// -----------------------------------------------------------------------------

// 1. KOMPONEN KARTU INDUK (Bungkus Terluar)
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Memberikan batas melengkung, garis tepi tipis, warna dasar latar belakang kartu, dan bayangan
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

// 2. HEADER KARTU (Biasanya letaknya di paling atas, menampung Judul dan Deskripsi)
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // padding 6 di semua sisi (p-6)
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

// 3. JUDUL KARTU (Teks Utama yang besar dan tebal)
const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

// 4. DESKRIPSI KARTU (Teks tambahan abu-abu redup di bawah Judul)
const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

// 5. ISI KONTEN KARTU (Tubuh yang menampung form, gambar, tabel, dsb)
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  // Padding 6 sisi kiri-kanan-bawah, namun padding atasnya 0 (pt-0) karena nyambung ke header
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

// 6. FOOTER KARTU (Barisan bawah penutup, biasanya untuk menempatkan tombol Cancel/Submit)
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Mengekspor semua kepingan-kepingan komponen Kartu agar bisa dirakit oleh halaman lain
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
