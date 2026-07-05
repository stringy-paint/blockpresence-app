# 🛡️ BlockPresence — Sistem Presensi Anti-Pemalsuan Berbasis Blockchain & Kriptografi

[![Blockchain: Ethereum Sepolia](https://img.shields.io/badge/Blockchain-Ethereum%20Sepolia-3c3c3d?style=for-the-badge&logo=ethereum)](https://sepolia.etherscan.io/address/0x2739970cB72a93144790aEA356971AC125B3b7d4)
[![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-00d4ff?style=for-the-badge&logo=react&logoColor=black)](https://vitejs.dev/)
[![Security: AES--256 + Keccak256](https://img.shields.io/badge/Security-AES--256%20%2B%20Keccak--256-00ff88?style=for-the-badge)](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)

**BlockPresence** adalah aplikasi web terdesentralisasi (DApp) inovatif yang merancang ulang alur absensi perkuliahan dengan memadukan **Smart Contract Ethereum (Solidity)**, **Enkripsi AES-256**, dan **QR Code Dinamis** untuk menciptakan sistem absensi yang 100% transparan, immutable (tidak dapat diubah/dihapus), dan kebal terhadap kecurangan atau pemalsuan data.

---

## 🏛️ Arsitektur & Prinsip Keamanan

Sistem ini didesain berdasarkan dua prinsip keandalan tingkat tinggi:
1. **Smart Contract untuk Immutability & Transparansi:**
   Seluruh sesi perkuliahan dan bukti presensi mahasiswa dicatat sebagai transaksi resmi di jaringan **Ethereum Sepolia Testnet** melalui smart contract `AttendanceSystem.sol`. Data yang sudah masuk ke blockchain tidak dapat diubah, dimanipulasi, atau dihapus oleh pihak manapun (termasuk administrator sistem).
2. **Kriptografi AES-256 & Keccak-256 untuk Privasi Data (GDPR Compliance):**
   Sesuai standar privasi data global, **data mentah mahasiswa (seperti NIM, Nama, atau ID Kampus) TIDAK PERNAH disimpan di dalam blockchain**.
   - Dosen mengenkripsi data sesi menggunakan algoritma **AES-256** sebelum diubah menjadi QR Code dinamis.
   - Saat mahasiswa melakukan check-in, aplikasi menghitung kriptografi hash menggunakan **Keccak-256** (`solidityPackedKeccak256`) dari kombinasi `NIM + Session ID + Timestamp`. Hanya hash immutable inilah yang dikirim dan disimpan di blockchain!

---

## ✨ Fitur Utama

- 🎓 **Mode Dosen (Session Creator):**
  - Membuat sesi absensi on-chain dengan durasi waktu tertentu.
  - Menghasilkan **QR Code terenkripsi (Ciphertext)** secara real-time.
  - Dilengkapi timer hitung mundur dan sinkronisasi otomatis antar tab.
- 📱 **Mode Mahasiswa (Smart Scanner):**
  - Pemindai QR Code kamera terintegrasi (HTML5 WebRTC / ZXing).
  - Dekripsi otomatis ciphertext QR Code di browser lokal mahasiswa.
  - Validasi otomatis masa aktif sesi sebelum mengizinkan transaksi blockchain.
- 🔍 **Mode Verifikasi & Riwayat (Anti-Pemalsuan):**
  - **Pengecekan Kehadiran Gratis Gas:** Menggunakan *view function* smart contract untuk memverifikasi keabsahan bukti hadir mahasiswa di blockchain tanpa biaya gas fee.
  - **Pencocokan Integritas (Zero-Knowledge Hash Matching):** Dosen dapat memasukkan NIM mahasiswa untuk dicocokkan dengan hash on-chain secara matematis untuk mendeteksi indikasi pemalsuan.
  - **Tabel Riwayat Live Log:** Menyedot langsung log event `AttendanceMarked` dari jaringan Sepolia secara real-time lengkap dengan tautan bukti struk Etherscan.
- ⚡ **Keep-Alive UI State:**
  - Antarmuka tabbed modern dengan preservasi memori. QR Code, sisa waktu, dan data input tidak akan hilang saat pengguna beralih antar tab!

---

## 🚀 Cara Deploy ke Hosting Gratis (Vercel / Netlify)

Aplikasi ini dibangun menggunakan **React + Vite**, sehingga sangat ringan dan dapat di-deploy secara **gratis dalam 2 menit** ke platform modern seperti Vercel atau Netlify. 

> [!IMPORTANT]
> **Kenapa harus di-deploy ke Vercel/Netlify?**
> Fitur kamera browser (HTML5 WebRTC) memiliki standar keamanan ketat yang **wajib menggunakan protokol HTTPS**. Dengan mendeploy ke Vercel/Netlify, aplikasi kamu akan otomatis mendapatkan domain gratis bersertifikat **HTTPS**, sehingga mahasiswa bisa langsung memindai QR Code lewat kamera HP mereka dari mana saja!

### Opsi A: Deploy via Vercel (Sangat Direkomendasikan 🔥)

1. **Siapkan Repositori GitHub:**
   - Buat repositori baru di GitHub pribadi kamu (misal: `blockpresence-app`).
   - Upload seluruh folder proyek ini (atau extract isi dari file `blockchain-presensi.zip` lalu push ke GitHub).
2. **Hubungkan ke Vercel:**
   - Buka [vercel.com](https://vercel.com/) dan login menggunakan akun GitHub kamu.
   - Klik tombol **"Add New..." ➔ "Project"**.
   - Pilih repositori `blockpresence-app` yang baru saja kamu upload, lalu klik **"Import"**.
3. **Konfigurasi Deploy:**
   - Vercel akan otomatis mendeteksi bahwa proyek ini menggunakan framework **Vite**.
   - Biarkan semua pengaturan (Build Command: `npm run build`, Output Directory: `dist`) di posisi default.
4. **Klik "Deploy":**
   - Tunggu sekitar 30–60 detik.
   - Selamat! Aplikasi kamu sudah online dengan alamat HTTPS (misal: `https://blockpresence-app.vercel.app`) dan siap diuji coba oleh mahasiswa!

---

### Opsi B: Deploy via Netlify

1. Login ke [netlify.com](https://www.netlify.com/) menggunakan akun GitHub.
2. Klik **"Add new site" ➔ "Import an existing project"** dan pilih repositori GitHub kamu.
3. Pada bagian *Build settings*, pastikan:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Klik **"Deploy site"**. Dalam beberapa detik, situsmu siap digunakan!

---

## 📱 Panduan Pengujian di Smartphone (Mahasiswa)

Ketika mahasiswa ingin mencoba melakukan scan QR dan absen melalui smartphone mereka:
1. Pastikan mahasiswa sudah menginstall aplikasi **MetaMask Mobile** di HP (tersedia di Play Store & App Store).
2. **JANGAN buka link Vercel di Google Chrome / Safari HP biasa!** Browser biasa di HP tidak memiliki ekstensi dompet Web3.
3. **Cara yang Benar:**
   - Buka aplikasi **MetaMask Mobile** di HP.
   - Klik menu **Browser (In-App Browser)** di dalam aplikasi MetaMask.
   - Ketikkan atau tempel link website Vercel kamu (misal: `https://blockpresence-app.vercel.app`).
   - Dompet MetaMask akan otomatis terdeteksi (`window.ethereum`), kamera HP siap digunakan untuk scan QR Code dosen, dan transaksi check-in berjalan mulus!

---

## 💻 Cara Menjalankan Secara Lokal (Local Development)

Jika ingin mengembangkan atau memodifikasi kode di komputer lokal:

```bash
# 1. Masuk ke direktori proyek
cd blockchain-presensi

# 2. Install dependensi
npm install

# 3. Jalankan server pengembangan
npm run dev
```

Buka browser di `http://localhost:5173/`. Pastikan kamu sudah memasang ekstensi MetaMask di browser komputermu dan terhubung ke jaringan **Sepolia Testnet**.

---

## 📋 Informasi Smart Contract (Sepolia Testnet)

- **Contract Name:** `AttendanceSystem.sol`
- **Deployed Address:** [`0x2739970cB72a93144790aEA356971AC125B3b7d4`](https://sepolia.etherscan.io/address/0x2739970cB72a93144790aEA356971AC125B3b7d4)
- **Network:** Ethereum Sepolia Testnet (Chain ID: `11155111` / Hex: `0xaa36a7`)
- **Key Functions:**
  - `createSession(bytes32 courseId, uint256 durationMinutes)` ➔ Membuat sesi baru.
  - `checkIn(bytes32 sessionId, bytes32 encryptedDataHash)` ➔ Mendaftarkan kehadiran mahasiswa.
  - `verifyAttendance(bytes32 sessionId, address student)` ➔ Memeriksa status dan hash kehadiran (View / Gratis Gas).

---
*Dikembangkan sebagai Inovasi Sistem Absensi Terdesentralisasi & Anti-Pemalsuan — 2024.*
