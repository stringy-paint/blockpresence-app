import React from 'react';
import './StatusIndicator.css';

/**
 * StatusIndicator — Komponen reusable untuk menampilkan status operasi.
 * States: idle, loading, success, error, warning, info
 */
export default function StatusIndicator({ status = 'idle', message = '', size = 'md' }) {
  const icons = {
    idle: '◆',
    loading: '⟳',
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: '◈'
  };

  if (status === 'idle' && !message) return null;

  return (
    <div className={`status-indicator status-${status} status-size-${size}`}>
      <span className={`status-icon ${status === 'loading' ? 'animate-spin' : ''}`}>
        {icons[status] || icons.idle}
      </span>
      {message && <span className="status-message">{message}</span>}
    </div>
  );
}
