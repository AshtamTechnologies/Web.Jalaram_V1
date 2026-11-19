import React from 'react';
import ReactDOM from 'react-dom';
import { ArrowRight, X, ExternalLink, Trash2, AlertCircle } from 'lucide-react';

export default function ConfirmNavigateModal({
  isOpen,
  title = 'Navigate to Details',
  subtitle = '',
  message = 'Are you sure you want to navigate away from the dashboard?',
  confirmLabel = 'View Details',
  isDanger = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const defaultSubtitle = subtitle || (isDanger ? 'Confirm Removal' : 'Confirm Navigation');

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '460px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.22)',
          fontFamily: 'Nunito, sans-serif',
          animation: 'fadeUp 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: '1.5px solid #f1f5f9',
            background: isDanger ? '#fffbfa' : '#fafbfe',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: isDanger ? 'rgba(220, 38, 38, 0.12)' : 'rgba(4, 158, 223, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDanger ? '#dc2626' : '#049edf',
              }}
            >
              {isDanger ? <Trash2 size={20} /> : <ExternalLink size={20} />}
            </div>
            <div>
              <h4
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#1a1a2e',
                }}
              >
                {title}
              </h4>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '12px',
                  color: '#9090a8',
                  fontWeight: 600,
                }}
              >
                {defaultSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              border: 'none',
              background: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '22px',
            fontSize: '13.5px',
            color: '#475569',
            lineHeight: 1.6,
            fontWeight: 600,
          }}
        >
          {message}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '14px 22px',
            background: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '9px 20px',
              borderRadius: '10px',
              border: 'none',
              background: isDanger
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #049edf, #6c63ff)',
              color: '#ffffff',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isDanger
                ? '0 4px 14px rgba(220, 38, 38, 0.3)'
                : '0 4px 14px rgba(4, 158, 223, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            {confirmLabel} {!isDanger && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
