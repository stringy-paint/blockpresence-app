import React, { useState, useCallback } from 'react';
import WalletConnect from './components/WalletConnect.jsx';
import DosenPanel from './components/DosenPanel.jsx';
import MahasiswaPanel from './components/MahasiswaPanel.jsx';
import VerifikasiPanel from './components/VerifikasiPanel.jsx';
import './App.css';

/**
 * App — Root component.
 * Halaman gabungan dengan tab toggle antara Mode Dosen, Mode Mahasiswa, dan Verifikasi (Tahap 5).
 */
export default function App() {
  const [activeTab, setActiveTab] = useState('dosen');
  const [activeSessionId, setActiveSessionId] = useState('');
  const [wallet, setWallet] = useState({
    connected: false,
    address: null,
    signer: null,
    provider: null,
    isSepoliaNetwork: false
  });

  const handleWalletChange = useCallback((walletState) => {
    setWallet(walletState);
  }, []);

  const handleSessionCreated = useCallback((sessionId) => {
    setActiveSessionId(sessionId);
  }, []);

  return (
    <div className="app">
      {/* Background grid effect */}
      <div className="bg-grid" />

      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <div className="brand-logo">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="30" height="30" rx="8" stroke="url(#logo-grad)" strokeWidth="2"/>
                <path d="M16 7L16 11M16 21L16 25M7 16H11M21 16H25" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="16" cy="16" r="4" stroke="url(#logo-grad)" strokeWidth="2"/>
                <circle cx="16" cy="16" r="1.5" fill="#00ff88"/>
                <defs>
                  <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#00ff88"/>
                    <stop offset="1" stopColor="#00d4ff"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="brand-text">
              <h1>BlockPresence</h1>
              <span className="brand-tagline">Blockchain Attendance System</span>
            </div>
          </div>
          <WalletConnect onWalletChange={handleWalletChange} />
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Security Banner */}
        <div className="security-banner">
          <div className="banner-items">
            <span className="banner-item">
              <span className="banner-icon">🔐</span> AES-256 Encrypted
            </span>
            <span className="banner-divider">|</span>
            <span className="banner-item">
              <span className="banner-icon">⛓️</span> Sepolia Testnet
            </span>
            <span className="banner-divider">|</span>
            <span className="banner-item">
              <span className="banner-icon">🛡️</span> Tamper-Proof
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'dosen' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('dosen')}
            id="tab-dosen"
          >
            <span className="tab-icon">🎓</span>
            <span className="tab-label">Mode Dosen</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'mahasiswa' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('mahasiswa')}
            id="tab-mahasiswa"
          >
            <span className="tab-icon">📱</span>
            <span className="tab-label">Mode Mahasiswa</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'verifikasi' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('verifikasi')}
            id="tab-verifikasi"
          >
            <span className="tab-icon">🔍</span>
            <span className="tab-label">Verifikasi & Riwayat</span>
          </button>
          <div
            className="tab-indicator"
            style={{
              transform:
                activeTab === 'dosen'
                  ? 'translateX(0)'
                  : activeTab === 'mahasiswa'
                  ? 'translateX(100%)'
                  : 'translateX(200%)'
            }}
          />
        </div>

        {/* Panel Content (Keep Alive via CSS display to preserve state like QR Code) */}
        <div className="panel-container card">
          <div style={{ display: activeTab === 'dosen' ? 'block' : 'none' }}>
            <DosenPanel
              signer={wallet.signer}
              address={wallet.address}
              onSessionCreated={handleSessionCreated}
            />
          </div>
          <div style={{ display: activeTab === 'mahasiswa' ? 'block' : 'none' }}>
            <MahasiswaPanel
              signer={wallet.signer}
              address={wallet.address}
            />
          </div>
          <div style={{ display: activeTab === 'verifikasi' ? 'block' : 'none' }}>
            <VerifikasiPanel
              provider={wallet.provider}
              activeSessionId={activeSessionId}
            />
          </div>
        </div>

        {/* Footer Info */}
        <footer className="app-footer">
          <p>
            Contract: <a
              href="https://sepolia.etherscan.io/address/0x2739970cB72a93144790aEA356971AC125B3b7d4"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link mono"
            >
              0x2739...b7d4
            </a>
          </p>
          <p className="footer-note">
            MVP — Data NIM di-hash secara lokal, hanya hash yang tercatat on-chain
          </p>
        </footer>
      </main>
    </div>
  );
}
