import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Image as ImageIcon, X, Upload, Loader2, AlertCircle } from 'lucide-react';
import PhotoUploader from './PhotoUploader';
import { PHOTO_TYPES } from '../../constants/maintenanceConstants';

export default function AddPhotosDialog({
  isOpen = true,
  maintenance,
  onClose,
  onSubmit,
  loading = false,
}) {
  const [photoType, setPhotoType] = useState(PHOTO_TYPES.BEFORE);
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !maintenance) return null;

  const isBusy = loading || isSubmitting;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isBusy) return;
    if (!photos || photos.length === 0) {
      setError('Please select at least one photo to upload.');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('photoType', photoType);
    formData.append('PhotoType', photoType);
    formData.append('photo_Type', photoType);
    formData.append('Photo_Type', photoType);
    formData.append('photo_type', photoType);
    formData.append('type', photoType);
    photos.forEach((photo) => {
      formData.append('photos', photo);
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
          maxWidth: 520,
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
            background: 'linear-gradient(135deg, #049edf, #6c63ff)',
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
              <ImageIcon size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 16 }}>
                Add Maintenance Photos
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
            {/* Photo Type Selector */}
            <div style={{ marginBottom: 16 }}>
              <label className="pg-field-label">
                Photo Category / Stage <span className="pg-field-label__required">*</span>
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setPhotoType(PHOTO_TYPES.BEFORE)}
                  disabled={isBusy}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: photoType === PHOTO_TYPES.BEFORE ? '2px solid #0284c7' : '1.5px solid #e2e8f0',
                    background: photoType === PHOTO_TYPES.BEFORE ? '#f0f9ff' : '#fff',
                    color: photoType === PHOTO_TYPES.BEFORE ? '#0284c7' : '#64748b',
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Before Photos (Damage/Issue)
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoType(PHOTO_TYPES.AFTER)}
                  disabled={isBusy}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: photoType === PHOTO_TYPES.AFTER ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
                    background: photoType === PHOTO_TYPES.AFTER ? '#f0fdf4' : '#fff',
                    color: photoType === PHOTO_TYPES.AFTER ? '#16a34a' : '#64748b',
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  After Photos (Repaired/Resolved)
                </button>
              </div>
            </div>

            {/* Photo Uploader */}
            <div>
              <label className="pg-field-label">
                Select Photos <span className="pg-field-label__required">*</span>
              </label>
              <PhotoUploader
                files={photos}
                onChange={(f) => {
                  setPhotos(f);
                  if (error) setError('');
                }}
                disabled={isBusy}
                hint={`Upload ${photoType} photos to attach to this maintenance request`}
              />
              {error && (
                <div className="pg-field-error" style={{ marginTop: 8 }}>
                  <AlertCircle size={11} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            className="pg-modal__foot"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              padding: '14px 24px',
              borderTop: '1px solid #f0f0f8',
              background: '#fcfcfd',
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
                gap: 6,
                padding: '9px 20px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #049edf, #6c63ff)',
                color: '#fff',
                border: 'none',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 800,
                fontSize: 13,
                cursor: isBusy ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(4, 158, 223, 0.32)',
                opacity: isBusy ? 0.75 : 1,
              }}
            >
              {isBusy ? (
                <>
                  <Loader2 size={14} className="pg-spin" /> Uploading…
                </>
              ) : (
                <>
                  <Upload size={14} /> Upload Photos ({photos.length})
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
