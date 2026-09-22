import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle2, X, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import PhotoUploader from './PhotoUploader';

export default function CompleteDialog({
  isOpen = true,
  maintenance,
  onClose,
  onSubmit,
  loading = false,
}) {
  const [remarks, setRemarks] = useState('');
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !maintenance) return null;

  const isBusy = loading || isSubmitting;

  const validate = () => {
    const errs = {};
    if (!remarks.trim()) {
      errs.remarks = 'Completion remarks are required.';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isBusy) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('New_Status', 'Completed');
    formData.append('Remarks', remarks.trim());
    formData.append('Maintenance_Cost', '0');

    // AfterPhotos parameter for completion photos
    photos.forEach((photo) => {
      formData.append('AfterPhotos', photo);
    });

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
          maxWidth: 540,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'modalIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#fff',
            flexShrink: 0,
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
              <CheckCircle2 size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 16 }}>
                Complete Maintenance Work
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '20px 24px' }}>
            {/* Remarks (Required) */}
            <div style={{ marginBottom: 16 }}>
              <label className="pg-field-label">
                Completion Remarks <span className="pg-field-label__required">*</span>
              </label>
              <div className={`pg-field-wrap ${errors.remarks ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                <textarea
                  className="pg-field-input"
                  placeholder="Describe work performed, materials replaced, resolution details…"
                  value={remarks}
                  onChange={(e) => {
                    setRemarks(e.target.value);
                    if (errors.remarks) setErrors((prev) => ({ ...prev, remarks: '' }));
                  }}
                  rows={3}
                  disabled={isBusy}
                  style={{ resize: 'vertical', minHeight: 70, paddingTop: 8 }}
                />
              </div>
              {errors.remarks && (
                <div className="pg-field-error">
                  <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{errors.remarks}</span>
                </div>
              )}
            </div>

            {/* After Repair Photos */}
            <div>
              <label className="pg-field-label">
                After-Repair Completion Photos <span className="pg-field-label__optional">(optional, max 10)</span>
              </label>
              <PhotoUploader
                files={photos}
                onChange={setPhotos}
                maxCount={10}
                disabled={isBusy}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #f0f0f8',
              background: '#fafafd',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              className="pg-btn-cancel"
              onClick={onClose}
              disabled={isBusy}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 800,
                fontSize: 13.5,
                cursor: isBusy ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              }}
            >
              {isBusy ? (
                <>
                  <Loader2 size={16} className="pg-spin" /> Completing…
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Mark as Completed
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
