import * as React from "react"

import { cn } from "@/lib/utils"

// -----------------------------------------------------------------------------
// KOMPONEN UI BAWAAN SHADCN: Input
// Berfungsi untuk menampilkan kolom input teks/form (Text Box) dengan gaya minimalis modern.
// -----------------------------------------------------------------------------

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  // Menerima properti bawaan HTML input seperti 'type', 'className', 'placeholder', dll.
  // Juga mengaitkan referensi asli (ref) agar input bisa dikontrol dari luar komponen.
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Kelas CSS Tailwind dasar yang membentuk rupa input form ini:
          // flex, tinggi 9, lebar penuh, sudut melengkung, border, background transparan
          // Selain itu, ini juga menangani gaya saat sedang diklik (focus-visible) atau dimatikan (disabled)
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          // Menimpa/menggabungkan gaya tambahan jika ada `className` yang dipasok dari luar
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
