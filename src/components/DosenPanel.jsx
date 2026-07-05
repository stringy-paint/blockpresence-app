import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getContract } from '../lib/contract.js';
import { encryptSessionData, courseNameToId } from '../lib/crypto.js';
import StatusIndicator from './StatusIndicator.jsx';
import './DosenPanel.css';

/**
 * DosenPanel — Panel untuk dosen membuat sesi presensi dan generate QR Code.
 *
 * Alur:
 * 1. Input nama mata kuliah + durasi
 * 2. Panggil createSession() di smart contract
 * 3. Ambil sessionId dari event SessionCreated
 * 4. Enkripsi data sesi dengan AES
 * 5. Generate QR Code dari ciphertext
 */
export default function DosenPanel({ signer, address, onSessionCreated }) {
  const [courseName, setCourseName] = useState('');
  const [duration, setDuration] = useState('');
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [sessionData, setSessionData] = useState(null);
  const [qrValue, setQrValue] = useState('');
  const [txHash, setTxHash] = useState('');
  const [remainingTime, setRemainingTime] = useState(null);
  const timerRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    if (remainingTime === null || remainingTime <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setStatus({ type: 'warning', message: 'Sesi telah berakhir' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [remainingTime]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();

    if (!signer) {
      setStatus({ type: 'error', message: 'Hubungkan dompet terlebih dahulu!' });
      return;
    }
    if (!courseName.trim()) {
      setStatus({ type: 'error', message: 'Nama mata kuliah wajib diisi' });
      return;
    }
    if (!duration || parseInt(duration) <= 0) {
      setStatus({ type: 'error', message: 'Durasi harus lebih dari 0 menit' });
      return;
    }

    setStatus({ type: 'loading', message: 'Mengirim transaksi ke blockchain...' });
    setSessionData(null);
    setQrValue('');
    setTxHash('');
    setRemainingTime(null);

    try {
      const contract = getContract(signer);
      const courseId = courseNameToId(courseName.trim());
      const durationMinutes = parseInt(duration);

      // Kirim transaksi createSession
      const tx = await contract.createSession(courseId, durationMinutes);
      setTxHash(tx.hash);
      setStatus({ type: 'loading', message: 'Menunggu konfirmasi blockchain...' });

      // Tunggu konfirmasi
      const receipt = await tx.wait();

      // Ambil sessionId dari event SessionCreated
      let sessionId = null;
      let endTime = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          if (parsed && parsed.name === 'SessionCreated') {
            // SessionCreated(bytes32 indexed sessionId, address indexed creator, uint256 endTime)
            // indexed args are in topics: topics[1] = sessionId, topics[2] = creator
            sessionId = log.topics[1];
            endTime = parsed.args.endTime;
            break;
          }
        } catch {
          // Skip logs from other contracts
          continue;
        }
      }

      if (!sessionId) {
        setStatus({ type: 'error', message: 'Gagal mengambil sessionId dari event' });
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);

      // Data sesi untuk dienkripsi dan ditanamkan di QR
      const dataToEncrypt = {
        sessionId: sessionId,
        courseId: courseId,
        courseName: courseName.trim(),
        timestamp: timestamp
      };

      // Enkripsi dengan AES
      const ciphertext = encryptSessionData(dataToEncrypt);

      // Simpan state
      setSessionData({
        sessionId,
        courseId,
        courseName: courseName.trim(),
        duration: durationMinutes,
        timestamp
      });
      setQrValue(ciphertext);
      setRemainingTime(durationMinutes * 60);
      setStatus({ type: 'success', message: 'Sesi berhasil dibuat! QR Code siap.' });
      if (onSessionCreated) {
        onSessionCreated(sessionId);
      }

      console.log('[DosenPanel] Session created:', {
        sessionId,
        courseId,
        courseName: courseName.trim(),
        duration: durationMinutes,
        txHash: tx.hash,
        ciphertext
      });
    } catch (error) {
      console.error('[DosenPanel] Error:', error);

      let errorMsg = 'Gagal membuat sesi';
      if (error.reason) {
        errorMsg = error.reason;
      } else if (error.message) {
        if (error.message.includes('Bukan dosen/admin')) {
          errorMsg = 'Akses ditolak: Hanya owner contract yang bisa membuat sesi';
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
    setCourseName('');
    setDuration('');
    setSessionData(null);
    setQrValue('');
    setTxHash('');
    setRemainingTime(null);
    setStatus({ type: 'idle', message: '' });
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="dosen-panel animate-fade-in">
      <div className="panel-header">
        <div className="panel-icon">🎓</div>
        <div>
          <h2>Panel Dosen</h2>
          <p className="panel-subtitle">Buat sesi presensi & generate QR Code terenkripsi</p>
        </div>
      </div>

      {!qrValue ? (
        <form className="session-form" onSubmit={handleCreateSession}>
          <div className="form-group">
            <label htmlFor="input-course-name">🔖 Nama Mata Kuliah</label>
            <input
              type="text"
              id="input-course-name"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="Contoh: Kriptografi Terapan"
              disabled={status.type === 'loading'}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="input-duration">⏱️ Durasi Sesi (menit)</label>
            <input
              type="number"
              id="input-duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Contoh: 15"
              min="1"
              max="180"
              disabled={status.type === 'loading'}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={status.type === 'loading' || !signer}
            id="btn-create-session"
          >
            {status.type === 'loading' ? (
              <><span className="animate-spin">⟳</span> Memproses...</>
            ) : (
              <><span>🛡️</span> Buat Sesi &amp; Generate QR</>
            )}
          </button>

          {!signer && (
            <p className="form-hint text-warning">
              ⚠️ Hubungkan dompet MetaMask terlebih dahulu
            </p>
          )}
        </form>
      ) : (
        <div className="session-result animate-slide-up">
          {/* QR Code Display */}
          <div className="qr-container">
            <div className="qr-frame">
              <QRCodeSVG
                value={qrValue}
                size={260}
                level="L"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#0a0e17"
              />
              <div className="qr-corner qr-corner-tl" />
              <div className="qr-corner qr-corner-tr" />
              <div className="qr-corner qr-corner-bl" />
              <div className="qr-corner qr-corner-br" />
            </div>
            <p className="qr-label">Tampilkan QR ini ke mahasiswa untuk dipindai</p>
          </div>

          {/* Session Info */}
          <div className="session-info-grid">
            <div className="info-item">
              <span className="info-label">Mata Kuliah</span>
              <span className="info-value">{sessionData?.courseName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Session ID</span>
              <span className="info-value mono" title={sessionData?.sessionId}>
                {sessionData?.sessionId
                  ? `${sessionData.sessionId.slice(0, 10)}...${sessionData.sessionId.slice(-6)}`
                  : '-'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Durasi</span>
              <span className="info-value">{sessionData?.duration} menit</span>
            </div>
            <div className="info-item">
              <span className="info-label">Sisa Waktu</span>
              <span className={`info-value timer-value ${
                remainingTime !== null && remainingTime <= 60 ? 'timer-critical' : ''
              }`}>
                {formatTime(remainingTime)}
              </span>
            </div>
          </div>

          {/* TX Hash */}
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

          <button
            className="btn btn-ghost btn-full"
            onClick={handleReset}
            id="btn-reset-session"
          >
            ✕ Buat Sesi Baru
          </button>
        </div>
      )}

      <StatusIndicator status={status.type} message={status.message} />
    </div>
  );
}
