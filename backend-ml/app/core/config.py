# -----------------------------------------------------------------------------
# FILE KONFIGURASI INTI (CORE CONFIG)
# Berfungsi sebagai pusat pengambilan variabel lingkungan (Environment Variables).
# Bertugas membaca file .env dan menyediakan pengaturan server ke seluruh bagian kode Python.
# -----------------------------------------------------------------------------
import os # Berinteraksi langsung dengan sistem operasi laptop (seperti membaca nilai variabel lingkungan)
from dotenv import load_dotenv # Pustaka eksternal untuk membaca kata sandi rahasia dari file teks .env

# Membaca isi file .env (jika ada) dan memasukkannya ke variabel sistem komputer
load_dotenv()

class Settings:
    # URL koneksi ke database PostgreSQL
    # Format: postgresql+asyncpg://[user]:[password]@[host]:[port]/[nama_db]
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://neurotube:neurotube_secret@localhost:5432/NeuroTube",
    )
    
    # URL koneksi ke Redis (Untuk antrean tugas/Celery/RQ)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Daftar domain asal (CORS) yang diizinkan untuk menembak API backend ini
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
    )
    
    # Port tempat server FastAPI berjalan
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Kunci API rahasia untuk mengakses model bahasa besar (LLM) Gemini dari Google
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

# Membuat 1 objek tunggal (Singleton) yang memegang semua konfigurasi
settings = Settings()
