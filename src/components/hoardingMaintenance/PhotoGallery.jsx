import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Image as ImageIcon,
  Trash2,
  ZoomIn,
  X,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { resolveMaintenancePhotoSrc } from '../../api/api';
import ConfirmDialog from './ConfirmDialog';

export default function PhotoGallery({
  photos = [],
  onDeletePhoto,
  canDelete = false,
  deletingPhotoId = null,
}) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'Before' | 'After'
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState(null);

  const beforePhotos = photos.filter((p) => (p.photoType || '').toLowerCase() === 'before');
  const afterPhotos = photos.filter((p) => (p.photoType || '').toLowerCase() === 'after');

  const displayedPhotos =
    activeTab === 'Before'
      ? beforePhotos
      : activeTab === 'After'
      ? afterPhotos
      : photos;

  // Handle ESC key and arrow keys for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev + 1) % displayedPhotos.length);
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev - 1 + displayedPhotos.length) % displayedPhotos.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, displayedPhotos.length]);

  return (
    <div style={{ width: '100%' }}>
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1.5px solid #f0f0f8',
          paddingBottom: 10,
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 9,
            border: 'none',
            background: activeTab === 'ALL' ? 'rgba(4, 158, 223, 0.12)' : 'transparent',
            color: activeTab === 'ALL' ? '#049edf' : '#7878a0',
            fontFamily: 'Nunito, sans-serif',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span>All Photos</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 6,
              background: activeTab === 'ALL' ? '#049edf' : '#e8e8f4',
              color: activeTab === 'ALL' ? '#fff' : '#64748b',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {photos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('Before')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 9,
            border: 'none',
            background: activeTab === 'Before' ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
            color: activeTab === 'Before' ? '#0284c7' : '#7878a0',
            fontFamily: 'Nunito, sans-serif',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span>Before</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 6,
              background: activeTab === 'Before' ? '#0284c7' : '#e8e8f4',
              color: activeTab === 'Before' ? '#fff' : '#64748b',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {beforePhotos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('After')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 9,
            border: 'none',
            background: activeTab === 'After' ? 'rgba(22, 163, 74, 0.12)' : 'transparent',
            color: activeTab === 'After' ? '#16a34a' : '#7878a0',
            fontFamily: 'Nunito, sans-serif',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span>After</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 6,
              background: activeTab === 'After' ? '#16a34a' : '#e8e8f4',
              color: activeTab === 'After' ? '#fff' : '#64748b',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {afterPhotos.length}
          </span>
        </button>
      </div>

      {/* Photos Grid */}
      {displayedPhotos.length === 0 ? (
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            background: '#fafafd',
            borderRadius: 14,
            border: '1.5px dashed #e8e8f4',
          }}
        >
          <ImageIcon size={32} color="#c0c0d8" style={{ marginBottom: 6 }} />
          <div
            style={{
              fontFamily: 'Nunito, sans-serif',
              fontSize: 13.5,
              fontWeight: 700,
              color: '#7878a0',
            }}
          >
            No {activeTab !== 'ALL' ? `${activeTab} ` : ''}photos attached
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 14,
          }}
        >
          {displayedPhotos.map((photo, idx) => {
            const isBefore = (photo.photoType || '').toLowerCase() === 'before';
            const src = resolveMaintenancePhotoSrc(photo);
            const isDeleting = deletingPhotoId === photo.photoID;

            return (
              <div
                key={photo.photoID || idx}
                style={{
                  position: 'relative',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  cursor: 'pointer',
                  aspectRatio: '4/3',
                  opacity: isDeleting ? 0.45 : 1,
                }}
                onClick={() => setLightboxIndex(idx)}
              >
                <img
                  src={src}
                  alt={`Maintenance ${photo.photoType} photo #${photo.photoID}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  onError={(e) => {
                    e.currentTarget.src =
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23cbd5e1"><rect width="100" height="100" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%2394a3b8">No Image</text></svg>';
                  }}
                />

                {/* Badge Type */}
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    padding: '2px 7px',
                    borderRadius: 6,
                    fontSize: 10.5,
                    fontWeight: 800,
                    fontFamily: 'Nunito, sans-serif',
                    color: isBefore ? '#0284c7' : '#16a34a',
                    background: isBefore ? 'rgba(240, 249, 255, 0.92)' : 'rgba(240, 253, 244, 0.92)',
                    border: `1px solid ${isBefore ? '#bae6fd' : '#bbf7d0'}`,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {photo.photoType || 'Before'}
                </div>

                {/* Delete button */}
                {canDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeletePhoto(photo);
                    }}
                    title="Delete photo"
                    disabled={isDeleting}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: 'rgba(239, 68, 68, 0.9)',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                {/* Hover overlay hint */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    insetInline: 0,
                    padding: '12px 6px 4px',
                    background: 'linear-gradient(to top, rgba(15,23,42,0.7), transparent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    color: '#fff',
                    fontSize: 10.5,
                    fontWeight: 700,
                    fontFamily: 'Nunito, sans-serif',
                  }}
                >
                  <ZoomIn size={11} /> Click to view
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Deleting Photo */}
      {confirmDeletePhoto && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Photo"
          message={`Are you sure you want to delete this ${confirmDeletePhoto.photoType || ''} photo? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onCancel={() => setConfirmDeletePhoto(null)}
          onConfirm={() => {
            const photoId = confirmDeletePhoto.photoID;
            setConfirmDeletePhoto(null);
            onDeletePhoto?.(photoId);
          }}
        />
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && displayedPhotos[lightboxIndex] && (
        ReactDOM.createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100000,
              background: 'rgba(10, 15, 30, 0.92)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onClick={() => setLightboxIndex(null)}
          >
            {/* Top Toolbar */}
            <div
              style={{
                position: 'absolute',
                top: 16,
                insetInline: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#fff',
                zIndex: 2,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: 'Nunito, sans-serif',
                    background:
                      (displayedPhotos[lightboxIndex].photoType || '').toLowerCase() === 'before'
                        ? '#0284c7'
                        : '#16a34a',
                  }}
                >
                  {displayedPhotos[lightboxIndex].photoType || 'Photo'}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: 'Nunito, sans-serif',
                    color: '#cbd5e1',
                    fontWeight: 600,
                  }}
                >
                  {lightboxIndex + 1} of {displayedPhotos.length}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      const current = displayedPhotos[lightboxIndex];
                      setLightboxIndex(null);
                      setConfirmDeletePhoto(current);
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.85)',
                      border: 'none',
                      color: '#fff',
                      padding: '7px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    color: '#fff',
                    padding: 8,
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Left Nav */}
            {displayedPhotos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    (lightboxIndex - 1 + displayedPhotos.length) % displayedPhotos.length
                  );
                }}
                style={{
                  position: 'absolute',
                  left: 16,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Main Image */}
            <div
              style={{
                maxWidth: '90vw',
                maxHeight: '82vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={resolveMaintenancePhotoSrc(displayedPhotos[lightboxIndex])}
                alt="Enlarged"
                style={{
                  maxWidth: '100%',
                  maxHeight: '82vh',
                  objectFit: 'contain',
                  borderRadius: 12,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                }}
              />
            </div>

            {/* Right Nav */}
            {displayedPhotos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % displayedPhotos.length);
                }}
                style={{
                  position: 'absolute',
                  right: 16,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>,
          document.body
        )
      )}
    </div>
  );
}
