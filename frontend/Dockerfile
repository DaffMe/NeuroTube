# -----------------------------------------------------------------------------
# DOCKERFILE: REACT FRONTEND (Development)
# Berfungsi sebagai resep (blueprint) untuk menjalankan server pengembangan Vite React.
# -----------------------------------------------------------------------------

# Menggunakan lingkungan server Node.js versi 20 yang berbasis Linux Alpine ringan
FROM node:20-alpine

# Setel direktori aktifnya ke /app
WORKDIR /app

# Salin catatan daftar pustaka (package.json)
COPY package*.json ./

# Jalankan instalasi seluruh Node Modules (Library React, Tailwind, dsb)
# --legacy-peer-deps digunakan sebagai jaring pengaman agar tidak error jika ada pustaka lawas yang kurang kompatibel
RUN npm install --legacy-peer-deps

# Salin sisa file lainnya ke dalam wadah /app
COPY . .

# Ekspos/buka port 5173 khas milik Vite Server
EXPOSE 5173

# Nyalakan server dev Vite ("npm run dev") dengan akses IP 0.0.0.0 (Bisa diakses dari jaringan luar, bukan sekadar localhost komputer)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
