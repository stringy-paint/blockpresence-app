/**
 * contract.js
 * Smart Contract ABI, address, dan helper untuk AttendanceSystem.
 * Contract deployed di Sepolia Testnet.
 */

import { ethers } from 'ethers';

// ============ CONTRACT ADDRESS (Sepolia Testnet) ============
export const CONTRACT_ADDRESS = '0x2739970cB72a93144790aEA356971AC125B3b7d4';

// ============ ABI ============
export const CONTRACT_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'sessionId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'student', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
    ],
    name: 'AttendanceMarked',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'sessionId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'endTime', type: 'uint256' }
    ],
    name: 'SessionCreated',
    type: 'event'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'sessionId', type: 'bytes32' },
      { internalType: 'bytes32', name: 'encryptedDataHash', type: 'bytes32' }
    ],
    name: 'checkIn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'courseId', type: 'bytes32' },
      { internalType: 'uint256', name: 'durationMinutes', type: 'uint256' }
    ],
    name: 'createSession',
    outputs: [
      { internalType: 'bytes32', name: 'sessionId', type: 'bytes32' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'sessionId', type: 'bytes32' }
    ],
    name: 'isSessionActive',
    outputs: [
      { internalType: 'bool', name: '', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      { internalType: 'address', name: '', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '', type: 'bytes32' }
    ],
    name: 'sessions',
    outputs: [
      { internalType: 'address', name: 'creator', type: 'address' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
      { internalType: 'bool', name: 'exists', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'sessionId', type: 'bytes32' },
      { internalType: 'address', name: 'student', type: 'address' }
    ],
    name: 'verifyAttendance',
    outputs: [
      { internalType: 'bool', name: 'checkedIn', type: 'bool' },
      { internalType: 'bytes32', name: 'dataHash', type: 'bytes32' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Mendapatkan instance contract yang terhubung ke signer.
 * @param {import('ethers').Signer} signer - Signer dari MetaMask
 * @returns {import('ethers').Contract} Contract instance
 */
export function getContract(signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

/**
 * Mendapatkan instance contract read-only (tanpa signer).
 * @param {import('ethers').Provider} provider - Provider
 * @returns {import('ethers').Contract} Contract instance (read-only)
 */
export function getReadOnlyContract(provider) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}
