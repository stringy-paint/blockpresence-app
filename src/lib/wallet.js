/**
 * wallet.js
 * Utilitas koneksi MetaMask dan manajemen jaringan Sepolia.
 */

import { ethers } from 'ethers';

// Sepolia Testnet config
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111
const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;

const SEPOLIA_NETWORK = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: 'Sepolia Testnet',
  nativeCurrency: {
    name: 'SepoliaETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://rpc.sepolia.org'],
  blockExplorerUrls: ['https://sepolia.etherscan.io']
};

/**
 * Mengecek apakah perangkat adalah mobile.
 * @returns {boolean}
 */
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Mengecek apakah sedang di dalam MetaMask Mobile in-app browser.
 * MetaMask Mobile meng-inject window.ethereum.isMetaMask = true.
 * @returns {boolean}
 */
export function isInMetaMaskBrowser() {
  return (
    typeof window !== 'undefined' &&
    typeof window.ethereum !== 'undefined' &&
    window.ethereum.isMetaMask === true
  );
}

/**
 * Mengecek apakah MetaMask terinstal di browser.
 * Di desktop: cek extension. Di mobile: cek in-app browser.
 * @returns {boolean}
 */
export function isMetaMaskInstalled() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * Menghasilkan deep link untuk membuka URL saat ini di MetaMask Mobile.
 * Protokol: https://metamask.app.link/dapp/HOSTNAME+PATH
 * @returns {string} Deep link URL
 */
export function getMetaMaskDeepLink() {
  const currentUrl = window.location.href;
  // Hapus protokol (https:// atau http://) karena MetaMask deep link tidak membutuhkannya
  const urlWithoutProtocol = currentUrl.replace(/^https?:\/\//, '');
  return `https://metamask.app.link/dapp/${urlWithoutProtocol}`;
}

/**
 * Menghubungkan wallet MetaMask.
 * @returns {Promise<{provider: ethers.BrowserProvider, signer: ethers.Signer, address: string}>}
 */
export async function connectWallet() {
  if (!isMetaMaskInstalled()) {
    // Jika di mobile dan MetaMask tidak terdeteksi, redirect ke MetaMask deep link
    if (isMobileDevice()) {
      window.location.href = getMetaMaskDeepLink();
      throw new Error('Mengalihkan ke aplikasi MetaMask...');
    }
    throw new Error('MetaMask tidak terdeteksi. Silakan install MetaMask terlebih dahulu.');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  
  // Request akses akun
  await provider.send('eth_requestAccounts', []);
  
  // Verifikasi jaringan
  await ensureSepoliaNetwork();
  
  // Re-create provider setelah potential network switch
  const updatedProvider = new ethers.BrowserProvider(window.ethereum);
  const signer = await updatedProvider.getSigner();
  const address = await signer.getAddress();

  return { provider: updatedProvider, signer, address };
}

/**
 * Memastikan user berada di jaringan Sepolia.
 * Jika tidak, otomatis request switch.
 */
export async function ensureSepoliaNetwork() {
  if (!isMetaMaskInstalled()) return;

  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  
  if (chainId !== SEPOLIA_CHAIN_ID) {
    try {
      // Coba switch ke Sepolia
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }]
      });
    } catch (switchError) {
      // Jika Sepolia belum ada di MetaMask, tambahkan
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [SEPOLIA_NETWORK]
        });
      } else {
        throw new Error('Gagal berpindah ke jaringan Sepolia. Silakan switch manual di MetaMask.');
      }
    }
  }
}

/**
 * Mengecek apakah saat ini di jaringan Sepolia.
 * @returns {Promise<boolean>}
 */
export async function isOnSepolia() {
  if (!isMetaMaskInstalled()) return false;
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  return chainId === SEPOLIA_CHAIN_ID;
}

/**
 * Mendapatkan saldo ETH dari address tertentu.
 * @param {ethers.Provider} provider
 * @param {string} address
 * @returns {Promise<string>} Saldo dalam format ETH (string)
 */
export async function getBalance(provider, address) {
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

/**
 * Mempersingkat address wallet untuk tampilan.
 * @param {string} address
 * @returns {string} e.g., "0x1234...abcd"
 */
export function truncateAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Mendaftarkan listener untuk event perubahan akun dan jaringan.
 * @param {Function} onAccountChange - Callback saat akun berubah
 * @param {Function} onChainChange - Callback saat jaringan berubah
 * @returns {Function} Cleanup function untuk remove listeners
 */
export function registerWalletListeners(onAccountChange, onChainChange) {
  if (!isMetaMaskInstalled()) return () => {};

  const handleAccountsChanged = (accounts) => {
    onAccountChange(accounts.length > 0 ? accounts[0] : null);
  };

  const handleChainChanged = (chainId) => {
    onChainChange(chainId === SEPOLIA_CHAIN_ID);
  };

  window.ethereum.on('accountsChanged', handleAccountsChanged);
  window.ethereum.on('chainChanged', handleChainChanged);

  // Return cleanup function
  return () => {
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', handleChainChanged);
  };
}

export { SEPOLIA_CHAIN_ID_DECIMAL, SEPOLIA_CHAIN_ID };
