import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// -----------------------------------------------------------------------------
// KOMPONEN UI BAWAAN SHADCN: Button
// Berfungsi untuk menampilkan elemen Tombol (Button) interaktif dengan berbagai variasi gaya desain.
// Menggunakan CVA (Class Variance Authority) untuk mengatur pergantian varian warna dan ukurannya dengan mudah.
// -----------------------------------------------------------------------------

// Konfigurasi dasar gaya komponen Tombol beserta semua kemungkinan variasinya
const buttonVariants = cva(
  // Gaya pondasi (Base Styles) yang selalu ada di setiap tombol apapun jenisnya
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      // Varian gaya warna (Theme/Color Scheme)
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90", // Biru/Utama solid
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90", // Merah peringatan bahaya
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground", // Bergaris pinggir (transparan)
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80", // Warna sekunder redup
        ghost: "hover:bg-accent hover:text-accent-foreground", // Transparan, baru menyala saat disorot kursor
        link: "text-primary underline-offset-4 hover:underline", // Tampak seperti teks tautan/link biasa
      },
      // Varian ukuran proporsional tombol
      size: {
        default: "h-9 px-4 py-2", // Ukuran standar Normal
        sm: "h-8 rounded-md px-3 text-xs", // Kecil (Small)
        lg: "h-10 rounded-md px-8", // Besar (Large)
        icon: "h-9 w-9", // Berbentuk kotak presisi untuk ikon tunggal
      },
    },
    // Menetapkan bahwa jika tidak disuruh spesifik, maka tombol akan menjadi default dan berukuran medium/default
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Antarmuka Properti Tombol
// Mewarisi semua properti bawaan elemen <button> HTML murni (seperti onClick, disabled, type)
// Ditambah mewarisi properti khusus CVA (variant="outline", size="sm", dll)
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean // asChild=true berarti komponen Button ini tak berwujud dan hanya akan menurunkan gaya CSS ke komponen HTML pertama di bawahnya (biasanya elemen <a> link anchor)
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // Jika asChild bernilai benar, gunakan komponen Slot transparan dari Radix UI, 
    // jika salah gunakan tag HTML <button> biasa.
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        // Menggabungkan gaya pondasi, varian CSS yang terpilih, dan className tambahan dari pemanggil
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
