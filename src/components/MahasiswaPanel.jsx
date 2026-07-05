import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getContract } from '../lib/contract.js';
import { decryptSessionData, generateDataHash, encryptAttendanceProof } from '../lib/crypto.js';
import StatusIndicator from './StatusIndicator.jsx';
import './MahasiswaPanel.css';

/**
 * MahasiswaPanel — Panel untuk mahasiswa scan QR dan kirim presensi.
 *
 * Alur:
 * 1. Scan QR Code dosen → ciphertext
 * 2. Dekripsi AES → {sessionId, courseId, courseName, timestamp}
 * 3. Input NIM
 * 4. Hash: keccak256(NIM + sessionId + timestamp) → encryptedDataHash
 * 5. Panggil checkIn(sessionId, encryptedDataHash)
 * 6. console.log bukti presensi
 */
export default function MahasiswaPanel({ signer, address }) {
  const [scanResult, setScanResult] = useState(null);
  const [nim, setNim] = useState('');
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [scanning, setScanning] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [checkedIn, setCheckedIn] = useState(false);
  const scannerInstanceRef = useRef(null);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    if (scannerInstanceRef.current) {
      await stopScanner();
    }

    setScanning(true);
    setScanResult(null);
    setStatus({ type: 'loading', message: 'Mengaktifkan kamera...' });

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerInstanceRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 20,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.85);
            return { width: size, height: size };
          }
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
          stopScanner();
        },
        () => {
          // Scan in progress, not a QR yet — ignore
        }
      );

      setStatus({ type: 'info', message: 'Arahkan kamera ke QR Code dosen' });
    } catch (error) {
      console.error('[Scanner] Error:', error);
      setScanning(false);
      setStatus({
        type: 'error',
        message: 'Gagal mengakses kamera. Pastikan izin kamera diberikan.'
      });
    }
  };

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        const state = scannerInstanceRef.current.getState();
        // State 2 = SCANNING
        if (state === 2) {
          await scannerInstanceRef.current.stop();
        }
      } catch (e) {
        // Ignore stop errors
      }
      try {
        scannerInstanceRef.current.clear();
      } catch (e) {
        // Ignore clear errors
      }
      scannerInstanceRef.current = null;
    }
    setScanning(false);
  };

  const handleScanSuccess = (ciphertext) => {
    // Dekripsi data dari QR Code
    const decrypted = decryptSessionData(ciphertext);

    if (!decrypted) {
      setStatus({ type: 'error', message: 'QR Code tidak valid atau dekripsi gagal' });
      return;
    }

    if (!decrypted.sessionId) {
      setStatus({ type: 'error', message: 'Data QR tidak lengkap (sessionId missing)' });
      return;
    }

    setScanResult(decrypted);
    setStatus({ type: 'success', message: `QR berhasil dipindai: ${decrypted.courseName || 'Unknown'}` });

    console.log('[MahasiswaPanel] QR Decoded:', decrypted);
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();

    if (!signer) {
      setStatus({ type: 'error', message: 'Hubungkan dompet terlebih dahulu!' });
      return;
    }
    if (!scanResult) {
      setStatus({ type: 'error', message: 'Pindai QR Code dosen terlebih dahulu!' });
      return;
    }
    if (!nim.trim() || nim.trim().length < 8) {
      setStatus({ type: 'error', message: 'NIM minimal 8 karakter' });
      return;
    }

    setStatus({ type: 'loading', message: 'Mengirim presensi ke blockchain...' });

    try {
      const contract = getContract(signer);
      const { sessionId, timestamp } = scanResult;

      // Generate hash: keccak256(NIM + sessionId + timestamp)
      // Ini yang dikirim ke smart contract sebagai encryptedDataHash
      const dataHash = generateDataHash(nim.trim(), sessionId, timestamp);

      console.log('[MahasiswaPanel] DataHash generated:', {
        nim: nim.trim(),
        sessionId,
        timestamp,
        dataHash
      });

      // Kirim transaksi checkIn
      const tx = await contract.checkIn(sessionId, dataHash);
      setTxHash(tx.hash);
      setStatus({ type: 'loading', message: 'Menunggu konfirmasi blockchain...' });

      await tx.wait();

      // =========================================================
      // Bukti presensi lengkap
      // MVP: console.log sebagai pengganti pengiriman ke Supabase
      // Di produksi: kirim encryptedProof ke Supabase Edge Function
      // =========================================================
      const attendanceProof = encryptAttendanceProof(nim.trim(), sessionId, timestamp);
      console.log('═══════════════════════════════════════════════════════');
      console.log('  BUKTI PRESENSI (MVP: console.log pengganti Supabase)');
      console.log('═══════════════════════════════════════════════════════');
      console.log('  NIM            :', nim.trim());
      console.log('  Session ID     :', sessionId);
      console.log('  Course         :', scanResult.courseName);
      console.log('  Timestamp      :', timestamp);
      console.log('  Data Hash      :', dataHash);
      console.log('  TX Hash        :', tx.hash);
      console.log('  Wallet Address :', address);
      console.log('  Encrypted Proof:', attendanceProof);
      console.log('═══════════════════════════════════════════════════════');

      try {
        const existing = JSON.parse(localStorage.getItem('attendance_nims') || '{}');
        existing[address.toLowerCase()] = nim.trim();
        localStorage.setItem('attendance_nims', JSON.stringify(existing));
      } catch (e) {
        console.warn('Gagal menyimpan NIM ke localStorage:', e);
      }

      setCheckedIn(true);
      setStatus({ type: 'success', message: 'Presensi berhasil dicatat di blockchain!' });
    } catch (error) {
      console.error('[MahasiswaPanel] Error:', error);

      let errorMsg = 'Gagal mengirim presensi';
      if (error.reason) {
        errorMsg = error.reason;
      } else if (error.message) {
        if (error.message.includes('Sudah presensi')) {
          errorMsg = 'Anda sudah melakukan presensi untuk sesi ini';
        } else if (error.message.includes('Sesi tidak valid')) {
          errorMsg = 'Session ID tidak valid atau sesi tidak ditemukan';
        } else if (error.message.includes('Sesi sudah berakhir')) {
          errorMsg = 'Sesi presensi sudah berakhir';
        } else if (error.message.includes('user rejected')) {
          errorMsg = 'Transaksi dibatalkan oleh pengguna';
        } else if (error.message.includes('insufficient funds')) {
          errorMsg = 'Saldo ETH Sepolia tidak cukup untuk gas fee';
        } else {
          errorMsg = error.message.length > 120
            ? error.message.slice(0, 120) + '...'
            : error.message;
        }
      }
      setStatus({ type: 'error', message: errorMsg });
    }
  };

  const handleReset = () => {
    stopScanner();
    setScanResult(null);
    setNim('');
    setTxHash('');
    setCheckedIn(false);
    setStatus({ type: 'idle', message: '' });
  };

  return (
    <div className="mahasiswa-panel animate-fade-in">
      <div className="panel-header">
        <div className="panel-icon panel-icon-blue">📱</div>
        <div>
          <h2>Panel Mahasiswa</h2>
          <p className="panel-subtitle">Pindai QR Code & kirim bukti presensi ke blockchain</p>
        </div>
      </div>

      {checkedIn ? (
        /* ── Success State ── */
        <div className="checkin-success animate-slide-up">
          <div className="success-icon-large">✓</div>
          <h3>Presensi Berhasil!</h3>
          <p className="text-secondary">
            Kehadiran Anda telah tercatat secara permanen dan immutable di blockchain.
          </p>

          <div className="session-info-grid">
            <div className="info-item">
              <span className="info-label">Mata Kuliah</span>
              <span className="info-value">{scanResult?.courseName || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">NIM</span>
              <span className="info-value mono">{nim}</span>
            </div>
          </div>

          {txHash && (
            <div className="tx-info">
              <span className="tx-label">📋 TX:</span>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link mono"
              >
                {txHash.slice(0, 14)}...{txHash.slice(-8)}
              </a>
            </div>
          )}

          <button className="btn btn-ghost btn-full" onClick={handleReset} id="btn-reset-checkin">
            ← Kembali
          </button>
        </div>
      ) : (
        <>
          {/* ── Step 1: QR Scanner ── */}
          <div className="scan-section">
            <h3 className="step-title">
              <span className="step-number">1</span>
              Pindai QR Code Dosen
            </h3>

            <div className="scanner-viewport">
              <div id="qr-reader" className="qr-reader-container" />
              {!scanning && !scanResult && (
                <div className="scanner-placeholder">
                  <span className="scanner-icon">📷</span>
                  <p>Kamera belum aktif</p>
                </div>
              )}
              {scanning && (
                <div className="scan-overlay">
                  <div className="scan-line" />
                </div>
              )}
            </div>

            <div className="scanner-controls">
              {!scanning && !scanResult && (
                <button
                  className="btn btn-secondary btn-full"
                  onClick={startScanner}
                  id="btn-start-scanner"
                >
                  📷 Mulai Pindai
                </button>
              )}
              {scanning && (
                <button
                  className="btn btn-ghost btn-full"
                  onClick={stopScanner}
                  id="btn-stop-scanner"
                >
                  ✕ Hentikan Pemindaian
                </button>
              )}
              {scanResult && !scanning && (
                <button
                  className="btn btn-ghost btn-full"
                  onClick={() => { setScanResult(null); setStatus({ type: 'idle', message: '' }); }}
                  id="btn-rescan"
                >
                  🔄 Pindai Ulang
                </button>
              )}
            </div>

            {scanResult && (
              <div className="scan-result-card animate-fade-in">
                <div className="scan-result-badge">✓ QR Terverifikasi & Terdekripsi</div>
                <div className="scan-result-info">
                  <span className="info-label">Mata Kuliah</span>
                  <span className="info-value">{scanResult.courseName || '-'}</span>
                </div>
                <div className="scan-result-info">
                  <span className="info-label">Session ID</span>
                  <span className="info-value mono">
                    {scanResult.sessionId ? `${scanResult.sessionId.slice(0, 10)}...${scanResult.sessionId.slice(-6)}` : '-'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Step 2: NIM Input & Submit ── */}
          <div className={`nim-section ${!scanResult ? 'section-disabled' : ''}`}>
            <h3 className="step-title">
              <span className="step-number">2</span>
              Masukkan NIM & Kirim Presensi
            </h3>

            <form onSubmit={handleCheckIn}>
              <div className="form-group">
                <label htmlFor="input-nim">🆔 Nomor Induk Mahasiswa (NIM)</label>
                <input
                  type="text"
                  id="input-nim"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  placeholder="Contoh: 12345678"
                  disabled={!scanResult || status.type === 'loading'}
                  autoComplete="off"
                  minLength={8}
                />
                <span className="input-helper">
                  NIM tidak dikirim ke blockchain — hanya hash-nya yang tercatat on-chain
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={!scanResult || !signer || status.type === 'loading'}
                id="btn-submit-checkin"
              >
                {status.type === 'loading' ? (
                  <><span className="animate-spin">⟳</span> Memproses...</>
                ) : (
                  <><span>🛡️</span> Kirim Presensi</>
                )}
              </button>

              {!signer && (
                <p className="form-hint text-warning">
                  ⚠️ Hubungkan dompet MetaMask terlebih dahulu
                </p>
              )}
            </form>
          </div>
        </>
      )}

      <StatusIndicator status={status.type} message={status.message} />
    </div>
  );
}
