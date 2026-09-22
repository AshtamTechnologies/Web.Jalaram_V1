import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { XCircle, X, MessageSquare, Loader2, AlertCircle } from 'lucide-react';

export default function CancelDialog({
  isOpen = true,
  maintenance,
  onClose,
  onSubmit,
  loading = false,
}) {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !maintenance) return null;

  const isBusy = loading || isSubmitting;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isBusy) return;
    if (!remarks.trim()) {
      setError('Cancellation reason/remarks are required.');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('New_Status', 'Cancelled');
    formData.append('Remarks', remarks.trim());
    formData.append('Maintenance_Cost', '0');

    onSubmit(formData);
  };

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
      onClick={() => { if (!isBusy) onClose(); }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          animation: 'modalIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.22)',
                border: '2px solid rgba(255, 255, 255, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <XCircle size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 16 }}>
                Cancel Maintenance Request
              </div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                Hoarding: <strong>{maintenance.hoardingCode}</strong> (#{maintenance.maintenanceID})
              </div>
            </div>
          </div>

          {!isBusy && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.85)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px' }}>
            <label className="pg-field-label">
              Reason for Cancellation <span className="pg-field-label__required">*</span>
            </label>
            <div className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
              <textarea
                className="pg-field-input"
                placeholder="State clearly why this maintenance request is being cancelled…"
                value={remarks}
                onChange={(e) => {
                  setRemarks(e.target.value);
                  if (error) setError('');
                }}
                rows={3}
                disabled={isBusy}
                style={{ resize: 'vertical', minHeight: 80, paddingTop: 8 }}
              />
            </div>
            {error && (
              <div className="pg-field-error">
                <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="pg-modal__foot"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              padding: '14px 24px 20px',
              borderTop: '1px solid #f0f0f8',
              background: '#fcfcfd',
            }}
          >
            <button
              type="button"
              className="pg-btn-cancel"
              onClick={onClose}
              disabled={isBusy}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isBusy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 20px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff',
                border: 'none',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 800,
                fontSize: 13,
                cursor: isBusy ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.32)',
                opacity: isBusy ? 0.75 : 1,
              }}
            >
              {isBusy ? (
                <>
                  <Loader2 size={14} className="pg-spin" /> Cancelling…
                </>
              ) : (
                <>
                  <XCircle size={14} /> Cancel Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
