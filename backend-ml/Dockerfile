# -----------------------------------------------------------------------------
# DOCKERFILE: PYTHON ML BACKEND
# Berfungsi sebagai resep (blueprint) untuk membungkus seluruh aplikasi Python
# Machine Learning (FastAPI) menjadi sebuah kontainer terisolasi.
# -----------------------------------------------------------------------------

# Menggunakan sistem operasi Linux Debian berukuran langsing (slim) dengan Python versi 3.13
FROM python:3.13-slim

# Tetapkan lokasi folder kerja default di /app
WORKDIR /app

# Salin daftar perbekalan pustaka (requirements.txt) ke dalam wadah
COPY requirements.txt .

# Instal semua pustaka Machine Learning (seperti FastAPI, SQLAlchemy, Transformers)
# --no-cache-dir digunakan agar Docker tidak menyimpan file sampah unduhan sementara (menghemat ruang penyimpanan)
RUN pip install --no-cache-dir -r requirements.txt

# Setelah alatnya terpasang, barulah salin semua kode-kode asli buatan kita masuk
COPY . .

# Ekspos jaringan keluar di port 8000
EXPOSE 8000

# Perintah penutup: Jalankan server Uvicorn (FastAPI) secara terus menerus agar bisa menerima API Request
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
