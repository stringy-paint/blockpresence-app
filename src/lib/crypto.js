/**
 * crypto.js
 * Modul kriptografi untuk enkripsi AES dan hashing keccak256.
 *
 * Alur:
 * 1. Dosen: Data sesi (sessionId, courseId, timestamp) → AES encrypt → ciphertext → QR Code
 * 2. Mahasiswa: Scan QR → ciphertext → AES decrypt → data sesi
 * 3. Mahasiswa: keccak256(NIM + sessionId + timestamp) → encryptedDataHash → kirim ke contract
 */

import CryptoJS from 'crypto-js';
import { ethers } from 'ethers';

// ============ AES KEY ============
// ⚠️ PERINGATAN KEAMANAN: Kunci ini di-hardcode untuk MVP saja.
// Di produksi, kunci harus:
// - Disimpan di environment variable backend
// - Didistribusikan via secure channel (misalnya: Supabase Edge Function)
// - Dirotasi secara berkala
// - TIDAK PERNAH di-expose di frontend
const AES_SECRET_KEY = 'BlockPresence_MVP_SecretKey_2024_!@#$';

/**
 * Mengenkripsi data sesi untuk ditanamkan ke dalam QR Code.
 * @param {Object} sessionData - { sessionId, courseId, courseName, timestamp }
 * @returns {string} Ciphertext string
 */
export function encryptSessionData(sessionData) {
  const plaintext = JSON.stringify(sessionData);
  const encrypted = CryptoJS.AES.encrypt(plaintext, AES_SECRET_KEY).toString();
  return encrypted;
}

/**
 * Mendekripsi ciphertext dari QR Code kembali menjadi data sesi.
 * @param {string} ciphertext - String terenkripsi dari QR Code
 * @returns {Object|null} Data sesi yang didekripsi, atau null jika gagal
 */
export function decryptSessionData(ciphertext) {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, AES_SECRET_KEY);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) {
      console.error('[Crypto] Dekripsi gagal: hasil kosong');
      return null;
    }
    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error('[Crypto] Error dekripsi:', error);
    return null;
  }
}

/**
 * Menghasilkan hash keccak256 yang kompatibel dengan Solidity abi.encodePacked.
 * Hash ini yang dikirim ke smart contract sebagai encryptedDataHash.
 *
 * Solidity equivalent: keccak256(abi.encodePacked(nim, sessionId, timestamp))
 *
 * @param {string} nim - NIM mahasiswa (string)
 * @param {string} sessionId - bytes32 session ID dari blockchain
 * @param {number|string} timestamp - Unix timestamp
 * @returns {string} bytes32 hash
 */
export function generateDataHash(nim, sessionId, timestamp) {
  // Menggunakan solidityPackedKeccak256 agar identik dengan
  // keccak256(abi.encodePacked(...)) di Solidity
  const hash = ethers.solidityPackedKeccak256(
    ['string', 'bytes32', 'uint256'],
    [nim, sessionId, BigInt(timestamp)]
  );
  return hash;
}

/**
 * Mengkonversi nama mata kuliah menjadi bytes32 courseId.
 * Menggunakan keccak256 sama seperti di smart contract.
 * @param {string} courseName - Nama mata kuliah
 * @returns {string} bytes32 courseId
 */
export function courseNameToId(courseName) {
  return ethers.keccak256(ethers.toUtf8Bytes(courseName));
}

/**
 * Mengenkripsi bukti presensi lengkap untuk logging / future Supabase storage.
 * @param {string} nim - NIM mahasiswa
 * @param {string} sessionId - Session ID
 * @param {number} timestamp - Timestamp
 * @returns {string} Ciphertext bukti presensi
 */
export function encryptAttendanceProof(nim, sessionId, timestamp) {
  const proof = JSON.stringify({ nim, sessionId, timestamp });
  return CryptoJS.AES.encrypt(proof, AES_SECRET_KEY).toString();
}
