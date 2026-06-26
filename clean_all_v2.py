import os
import glob
import re

indo_stopwords = [
    " yang ", " di ", " ke ", " dari ", " pada ", " dalam ", " untuk ", " dengan ", " ini", " itu", 
    " seperti ", " atau ", " dan ", " adalah ", " merupakan ", " juga ", " agar ", " kita ", " kami ", 
    " mereka ", " bisa ", " dapat ", " sudah ", " telah ", " akan ", " belum ", " tidak ", " bukan ", 
    " ada ", " contoh ", " misal", " berfungsi ", " komponen ", " bagian ", " aplikasi ", " bawaan ", 
    " kapsul ", " tombol ", " hanya ", " sebagai ", " sebuah ", " file ", " kartu ", " induk ", 
    " bungkus ", " tampilan ", " hari", " bulan", " tahun", " awal", " sejarah ", " kiri ", " kanan ", 
    " tukar ", " posisi ", " pencarian ", " pengurutan ", " karena ", " sehingga ", " jadi ", " maka ", " jika ",
    " baris ", " kode", " code", " eksekusi", " variabel", " data ", " utama ", " pembantu", " alat", 
    " utilitas ", " menyimpan ", " menampung", " menjalankan", " memanggil", " membuat", " mengatur", 
    " konfigurasi", " sistem ", " mengimpor ", " merujuk ", " fungsi ", " tipe ", " objek ", " nilai ",
    " hasil ", " tugas ", " antarmuka ", " publik", " rahasia ", " asli ", " ekstraksi ", " format ", 
    " mengembalikan ", " mengecek ", " tetangga ", " sebelah ", " logika ", " pemilihan ", " skala ",
    " waktu ", " penyeragaman ", " presisi ", " pembulatan ", " khusus ", " permesinan ", " murni ",
    " server ", " mesin ", " sekadar ", " lompat ", " pemeriksaan ", " wajibkan ", " kunci ", " mendukung",
    " sintaks ", " otomatis ", " ditugasi ", " cegah ", " rute ", " arahkan ", " lingkungan ", " versi",
    " paket ", " memuat ", " membaca ", " mengirim ", " metode ", " respons ", " jaringan "
]

def is_indonesian(text):
    t = " " + text.lower() + " "
    for kw in indo_stopwords:
        if kw in t:
            return True
    return False

def clean_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Remove JSX Comments: {/* ... */}
    def jsx_replacer(match):
        if is_indonesian(match.group(0)): return ""
        return match.group(0)
    content = re.sub(r'\{\s*/\*.*?\*/\s*\}', jsx_replacer, content, flags=re.DOTALL)

    # 2. Remove HTML Comments: <!-- ... -->
    def html_replacer(match):
        if is_indonesian(match.group(0)): return ""
        return match.group(0)
    content = re.sub(r'<!--.*?-->', html_replacer, content, flags=re.DOTALL)

    # 3. Remove Multi-line C-style Comments: /* ... */
    def c_multi_replacer(match):
        if is_indonesian(match.group(0)): return ""
        return match.group(0)
    content = re.sub(r'/\*.*?\*/', c_multi_replacer, content, flags=re.DOTALL)

    # 4. Line by line processing for // and #
    lines = content.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Strip // comments
        match_slash = re.search(r'(.*?)(//.*)', line)
        if match_slash:
            code_part = match_slash.group(1)
            comment_part = match_slash.group(2)
            
            # Skip if URL
            if "http://" in line or "https://" in line or "redis://" in line or "postgresql" in line:
                cleaned_lines.append(line)
                continue

            if re.match(r'^//\s*[-=]+$', comment_part.strip()) or is_indonesian(comment_part):
                if code_part.strip() == "":
                    continue
                else:
                    line = code_part.rstrip()

        # Strip # comments
        match_hash = re.search(r'(.*?)(#.*)', line)
        if match_hash:
            code_part = match_hash.group(1)
            comment_part = match_hash.group(2)
            
            if re.match(r'^#\s*[-=]+$', comment_part.strip()) or is_indonesian(comment_part):
                if code_part.strip() == "":
                    continue
                else:
                    line = code_part.rstrip()

        cleaned_lines.append(line)

    # Remove consecutive blank lines
    final_content = []
    prev_blank = False
    for line in cleaned_lines:
        if line.strip() == "":
            if not prev_blank:
                final_content.append(line)
            prev_blank = True
        else:
            final_content.append(line)
            prev_blank = False

    with open(filepath, "w", encoding="utf-8") as f:
        f.write('\n'.join(final_content).strip() + '\n')

exts = ["**/*.go", "**/*.py", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.cjs"]
files_to_clean = []
for ext in exts:
    for f in glob.glob(ext, recursive=True):
        if "node_modules" in f or "venv" in f or ".venv" in f or "clean_" in f or "dist" in f or ".git" in f or ".gemini" in f:
            continue
        files_to_clean.append(f)

for f in set(files_to_clean):
    clean_file(f)
    print(f"Cleaned {f}")
