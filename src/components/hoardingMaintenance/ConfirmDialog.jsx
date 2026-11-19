import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, AlertCircle, CheckCircle, Info, Loader2, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen = true,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary', // 'primary' | 'danger' | 'warning' | 'success'
  loading = false,
  onConfirm,
  onCancel,
}) {
  const [isConfirmed, setIsConfirmed] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setIsConfirmed(false);
    }
  }, [isOpen]);

  const isBusy = loading || isConfirmed;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isBusy) {
        onCancel?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isBusy, onCancel]);

  if (!isOpen) return null;

  const handleConfirmClick = () => {
    if (isBusy) return;
    setIsConfirmed(true);
    onConfirm?.();
  };

  const VARIANTS = {
    primary: {
      headerBg: 'linear-gradient(135deg, #049edf, #6c63ff)',
      icon: Info,
      btnBg: 'linear-gradient(135deg, #049edf, #6c63ff)',
      btnShadow: '0 4px 14px rgba(4, 158, 223, 0.32)',
    },
    danger: {
      headerBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
      icon: AlertTriangle,
      btnBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
      btnShadow: '0 4px 14px rgba(239, 68, 68, 0.32)',
    },
    warning: {
      headerBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
      icon: AlertCircle,
      btnBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
      btnShadow: '0 4px 14px rgba(245, 158, 11, 0.32)',
    },
    success: {
      headerBg: 'linear-gradient(135deg, #10b981, #059669)',
      icon: CheckCircle,
      btnBg: 'linear-gradient(135deg, #10b981, #059669)',
      btnShadow: '0 4px 14px rgba(16, 185, 129, 0.32)',
    },
  };

  const v = VARIANTS[variant] || VARIANTS.primary;
  const HeaderIcon = v.icon;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={() => { if (!isBusy) onCancel?.(); }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          animation: 'modalIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: v.headerBg, padding: '20px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.22)',
                border: '2px solid rgba(255, 255, 255, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <HeaderIcon size={22} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 900,
                  fontSize: 17,
                  color: '#fff',
                  margin: 0,
                }}
              >
                {title}
              </div>
            </div>
            {!isBusy && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.85)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px 16px' }}>
          <div
            style={{
              fontFamily: 'Nunito, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: '#475569',
              lineHeight: 1.6,
            }}
          >
            {message}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 24px 20px',
          }}
        >
          <button
            type="button"
            className="pg-btn-cancel"
            onClick={onCancel}
            disabled={isBusy}
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              fontFamily: 'Nunito, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              cursor: isBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isBusy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 20px',
              borderRadius: 10,
              background: v.btnBg,
              color: '#fff',
              border: 'none',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 800,
              fontSize: 13,
              boxShadow: v.btnShadow,
              opacity: isBusy ? 0.75 : 1,
            }}
          >
            {isBusy ? (
              <>
                <Loader2 size={14} className="pg-spin" /> Processing…
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
