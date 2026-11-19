import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, Trash2 } from 'lucide-react';
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_PHOTOS_COUNT,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_EXTENSIONS,
} from '../../constants/maintenanceConstants';

const EMPTY_FILES = [];

export default function PhotoUploader({
  files,
  photos,
  onChange,
  maxCount = MAX_PHOTOS_COUNT,
  disabled = false,
  label = 'Upload Photos',
  hint = `JPG, PNG, WEBP up to ${MAX_FILE_SIZE_MB}MB each (max ${MAX_PHOTOS_COUNT} photos)`,
}) {
  const currentFiles = files || photos || EMPTY_FILES;
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);

  // Synchronize previews whenever files change & manage object URLs
  useEffect(() => {
    const nextPreviews = currentFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2),
    }));

    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [currentFiles]);

  const validateAndAddFiles = useCallback((incomingFiles) => {
    setErrorMsg('');
    if (!incomingFiles || incomingFiles.length === 0) return;

    const fileList = Array.from(incomingFiles);
    const validFiles = [];
    const errors = [];

    const currentTotal = currentFiles.length;
    if (currentTotal + fileList.length > maxCount) {
      setErrorMsg(`You can upload a maximum of ${maxCount} photos in total.`);
      return;
    }

    fileList.forEach((file) => {
      // Check file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
        errors.push(`"${file.name}" is not a supported format (${ALLOWED_EXTENSIONS.join(', ')} only).`);
        return;
      }
      // Check file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      // Check duplicate in current selection
      const isDuplicate = currentFiles.some(
        (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      );
      if (!isDuplicate) {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setErrorMsg(errors.slice(0, 2).join(' '));
    }

    if (validFiles.length > 0) {
      onChange([...currentFiles, ...validFiles]);
    }
  }, [currentFiles, maxCount, onChange]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
      e.target.value = ''; // Reset input to allow selecting same file if desired
    }
  };

  const handleRemove = (indexToRemove) => {
    if (disabled) return;
    const updated = currentFiles.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
    setErrorMsg('');
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_EXTENSIONS.join(',')}
        onChange={handleFileInputChange}
        disabled={disabled || currentFiles.length >= maxCount}
        style={{ display: 'none' }}
      />

      {/* Drag & Drop Area */}
      {currentFiles.length < maxCount && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && files.length < maxCount) {
              fileInputRef.current?.click();
            }
          }}
          style={{
            border: dragOver ? '2px dashed #049edf' : '2px dashed #d0d0e8',
            borderRadius: 14,
            background: dragOver ? 'rgba(4, 158, 223, 0.05)' : '#fafafd',
            padding: '22px 16px',
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: dragOver ? 'rgba(4,158,223,0.15)' : 'rgba(4, 158, 223, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#049edf',
            }}
          >
            <Upload size={20} />
          </div>

          <div>
            <div
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 13.5,
                fontWeight: 700,
                color: '#1a1a2e',
              }}
            >
              <span style={{ color: '#049edf', textDecoration: 'underline' }}>Click to upload</span> or drag and drop
            </div>
            <div
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 11.5,
                color: '#9090a8',
                marginTop: 2,
              }}
            >
              {hint}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            color: '#dc2626',
            fontSize: 12,
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Thumbnails Grid */}
      {previews.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 12,
                fontWeight: 700,
                color: '#64748b',
              }}
            >
              Selected Photos ({previews.length}/{maxCount})
            </span>
            {previews.length > 1 && !disabled && (
              <button
                type="button"
                onClick={() => onChange([])}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                Clear all
              </button>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 10,
            }}
          >
            {previews.map((preview, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '1.5px solid #e2e8f0',
                  background: '#f8fafc',
                  aspectRatio: '1',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}
              >
                <img
                  src={preview.url}
                  alt={preview.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />

                {/* Remove button */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(index);
                    }}
                    title="Remove photo"
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'rgba(15, 23, 42, 0.75)',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(2px)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#dc2626')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)')}
                  >
                    <X size={12} />
                  </button>
                )}

                {/* Size badge */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    insetInline: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                    padding: '8px 4px 3px',
                    fontSize: 9.5,
                    fontFamily: 'Nunito, sans-serif',
                    color: '#fff',
                    textAlign: 'center',
                    fontWeight: 700,
                  }}
                >
                  {preview.size} MB
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
