import React, { useState, useEffect, useCallback } from 'react';
import {
  connectWallet,
  isMetaMaskInstalled,
  isMobileDevice,
  getMetaMaskDeepLink,
  isOnSepolia,
  getBalance,
  truncateAddress,
  registerWalletListeners
} from '../lib/wallet.js';
import StatusIndicator from './StatusIndicator.jsx';
import './WalletConnect.css';

/**
 * WalletConnect — Komponen global untuk koneksi MetaMask.
 * Menampilkan status koneksi, address, saldo, dan jaringan.
 */
export default function WalletConnect({ onWalletChange }) {
  const [walletState, setWalletState] = useState({
    connected: false,
    address: null,
    balance: null,
    provider: null,
    signer: null,
    isSepoliaNetwork: false
  });
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [isConnecting, setIsConnecting] = useState(false);

  // Notify parent of wallet changes
  useEffect(() => {
    if (onWalletChange) {
      onWalletChange(walletState);
    }
  }, [walletState, onWalletChange]);

  // Register MetaMask listeners
  useEffect(() => {
    const cleanup = registerWalletListeners(
      async (newAddress) => {
        if (newAddress) {
          try {
            const result = await connectWallet();
            const bal = await getBalance(result.provider, result.address);
            const onSepolia = await isOnSepolia();
            setWalletState({
              connected: true,
              address: result.address,
              balance: bal,
              provider: result.provider,
              signer: result.signer,
              isSepoliaNetwork: onSepolia
            });
          } catch (err) {
            console.error('[Wallet] Account change error:', err);
          }
        } else {
          setWalletState({
            connected: false,
            address: null,
            balance: null,
            provider: null,
            signer: null,
            isSepoliaNetwork: false
          });
          setStatus({ type: 'idle', message: '' });
        }
      },
      (isSepolia) => {
        setWalletState(prev => ({ ...prev, isSepoliaNetwork: isSepolia }));
        if (!isSepolia) {
          setStatus({ type: 'warning', message: 'Jaringan bukan Sepolia!' });
        } else {
          setStatus({ type: 'success', message: 'Terhubung ke Sepolia' });
        }
      }
    );
    return cleanup;
  }, []);

  const handleConnect = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      setStatus({ type: 'error', message: 'MetaMask tidak terdeteksi. Install MetaMask!' });
      return;
    }

    setIsConnecting(true);
    setStatus({ type: 'loading', message: 'Menghubungkan ke MetaMask...' });

    try {
      const result = await connectWallet();
      const bal = await getBalance(result.provider, result.address);
      const onSepolia = await isOnSepolia();

      setWalletState({
        connected: true,
        address: result.address,
        balance: bal,
        provider: result.provider,
        signer: result.signer,
        isSepoliaNetwork: onSepolia
      });

      setStatus({
        type: onSepolia ? 'success' : 'warning',
        message: onSepolia ? 'Terhubung ke Sepolia' : 'Jaringan bukan Sepolia!'
      });
    } catch (error) {
      console.error('[Wallet] Connect error:', error);
      setStatus({ type: 'error', message: error.message || 'Gagal terhubung' });
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setWalletState({
      connected: false,
      address: null,
      balance: null,
      provider: null,
      signer: null,
      isSepoliaNetwork: false
    });
    setStatus({ type: 'idle', message: 'Dompet terputus' });
  }, []);

  return (
    <div className="wallet-connect">
      {walletState.connected ? (
        <div className="wallet-info">
          <div className="wallet-details">
            <div className="wallet-address-row">
              <span className={`network-dot ${walletState.isSepoliaNetwork ? 'online' : 'offline'}`} />
              <span className="wallet-network-label">
                {walletState.isSepoliaNetwork ? 'Sepolia' : 'Wrong Network'}
              </span>
            </div>
            <div className="wallet-address-balance">
              <span className="wallet-address mono">{truncateAddress(walletState.address)}</span>
              {walletState.balance && (
                <span className="wallet-balance mono">
                  {parseFloat(walletState.balance).toFixed(4)} ETH
                </span>
              )}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDisconnect}
            id="btn-disconnect-wallet"
          >
            ✕
          </button>
        </div>
      ) : isMobileDevice() && !isMetaMaskInstalled() ? (
        /* Mobile: MetaMask tidak terdeteksi → redirect ke MetaMask Mobile in-app browser */
        <div className="wallet-mobile-cta">
          <a
            href={getMetaMaskDeepLink()}
            className="btn btn-primary"
            id="btn-open-metamask"
          >
            <span className="wallet-icon">🦊</span>
            Buka di MetaMask
          </a>
          <p className="mobile-hint">
            Halaman ini akan terbuka di browser bawaan MetaMask
          </p>
        </div>
      ) : (
        <button
          className="btn btn-primary"
          onClick={handleConnect}
          disabled={isConnecting}
          id="btn-connect-wallet"
        >
          <span className="wallet-icon">🔗</span>
          {isConnecting ? 'Menghubungkan...' : 'Hubungkan Dompet'}
        </button>
      )}

      {status.type !== 'idle' && (
        <div className="wallet-status-row">
          <StatusIndicator status={status.type} message={status.message} size="sm" />
        </div>
      )}
    </div>
  );
}
