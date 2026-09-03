import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  UserCircle, Plus, Phone, Home, Search, RefreshCw,
  X, AlertCircle, Check, Edit2, Eye, ChevronDown,
  ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Loader2, ShieldCheck, FileText, IndianRupee, MapPin, Users,
  Upload, Trash2, Image, AlertTriangle, UserRoundPlus, ExternalLink
} from 'lucide-react';
import './Common1.css';
import { apiService, API_ROOT_URL } from '../api/api';
import { useResizableColumns } from '../hooks/useResizableColumns';

/* ─────────────────────────────────────────
   CONSTANTS & HELPERS
 ───────────────────────────────────────── */
const EMPTY_FORM = {
  opportunityID: 0,
  location: '',
  address: '',
  name: '',
  phoneNo1: '',
  phoneNo2: '',
  rentOffered: 0,
  rentExpected: 0,
  comments: '',
  isActive: true,
  ownerID: 0,
  ownerName: '',
};

const PHONE_REGEX = /^\+?[\d][\d\s\-]{4,18}$/;

const FIELDS = [
  { key: 'name', label: 'Owner Name', icon: UserCircle, placeholder: 'e.g. Parag Patel', col: 6, required: true, type: 'text' },
  { key: 'location', label: 'Location / Coordinates', icon: MapPin, placeholder: 'e.g. 22.5645, 72.9289 or Anand', col: 6, required: true, type: 'text' },
  { key: 'phoneNo1', label: 'Phone No 1', icon: Phone, placeholder: 'e.g. 9428151123', col: 6, required: true, type: 'phone' },
  { key: 'phoneNo2', label: 'Phone No 2', icon: Phone, placeholder: 'e.g. 9876543210 (optional)', col: 6, required: false, type: 'phone' },
  { key: 'rentOffered', label: 'Rent Offered (₹)', icon: IndianRupee, placeholder: 'e.g. 18000', col: 6, required: true, type: 'number' },
  { key: 'rentExpected', label: 'Rent Expected (₹)', icon: IndianRupee, placeholder: 'e.g. 22000', col: 6, required: true, type: 'number' },
  { key: 'address', label: 'Address', icon: Home, placeholder: 'e.g. 103/4/5/6, Drashti Arcade, Opp. Anand ITI...', col: 12, required: true, type: 'textarea' },
  { key: 'comments', label: 'Comments', icon: FileText, placeholder: 'Additional comments or notes...', col: 12, required: false, type: 'textarea' },
  { key: 'isActive', label: 'Status', icon: ShieldCheck, placeholder: '', col: 6, required: true, type: 'combo-status' },
];

export function extractCoordinates(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  const match = trimmed.match(/^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

export function getGoogleMapsUrl(locationStr) {
  if (!locationStr || typeof locationStr !== 'string') return null;
  const coords = extractCoordinates(locationStr);
  if (coords) {
    return `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(locationStr.trim())}`;
}

function validatePhone(value) {
  const stringVal = (value === undefined || value === null) ? '' : String(value);
  const v = stringVal.trim();
  if (!v) return '';
  if (!PHONE_REGEX.test(v))
    return 'Enter a valid phone number (digits, spaces, hyphens, optional + prefix)';
  const digits = v.replace(/\D/g, '');
  if (digits.length < 6) return `Too short — only ${digits.length} digits (minimum 6)`;
  if (digits.length > 15) return `Too long — ${digits.length} digits (maximum 15)`;
  return '';
}

function validateField(key, value, type, required) {
  const stringVal = (value === undefined || value === null) ? '' : String(value);
  const v = stringVal.trim();
  if (required && !v && typeof value !== 'boolean' && value !== 0) return 'This field is required';
  if (!v && typeof value !== 'boolean' && value !== 0) return '';

  if (type === 'phone') return validatePhone(v);
  if (type === 'number') {
    if (isNaN(Number(v)) || Number(v) < 0) return 'Must be a valid positive number';
  }
  return '';
}

function normalizeOpportunity(raw) {
  return {
    opportunityID: Number(raw.opportunity_ID ?? raw.opportunityID ?? 0),
    location: raw.location ?? '',
    address: raw.address ?? '',
    name: raw.name ?? '',
    phoneNo1: raw.phone_No1 ?? raw.phoneNo1 ?? '',
    phoneNo2: raw.phone_No2 ?? raw.phoneNo2 ?? '',
    rentOffered: Number(raw.rent_Offered ?? raw.rentOffered ?? 0),
    rentExpected: Number(raw.rent_Expected ?? raw.rentExpected ?? 0),
    comments: raw.comments ?? '',
    isActive: raw.is_Active !== undefined ? !!raw.is_Active : (raw.isActive !== undefined ? !!raw.isActive : true),
    ownerID: Number(raw.owner_ID ?? raw.ownerID ?? raw.ownerId ?? 0),
    ownerName: raw.owner_Name ?? raw.ownerName ?? '',
  };
}

function toPayload(form) {
  const isSupervisor = localStorage.getItem('userRole') === 'supervisor';
  return {
    opportunityID: Number(form.opportunityID ?? 0),
    location: String(form.location || '').trim(),
    address: String(form.address || '').trim(),
    name: String(form.name || '').trim(),
    phoneNo1: String(form.phoneNo1 || '').trim(),
    phoneNo2: String(form.phoneNo2 || '').trim(),
    rentOffered: Number(form.rentOffered ?? 0),
    rentExpected: Number(form.rentExpected ?? 0),
    comments: String(form.comments || '').trim(),
    isActive: isSupervisor ? (form.opportunityID === 0 ? true : !!form.isActive) : !!form.isActive,
    ownerID: Number(form.ownerID ?? 0),
    ownerName: String(form.ownerName || '').trim(),
  };
}

function normalizeOpportunityPhoto(raw) {
  return {
    opportunityPhotoID: raw.opportunity_Photo_ID ?? raw.opportunityPhotoID ?? 0,
    opportunityID: raw.opportunity_ID ?? raw.opportunityID ?? 0,
    photoPath: raw.photo_Path ?? raw.photoPath ?? '',
  };
}

const resolvePhotoSrc = (p) => {
  const raw = p.photoPath ?? p.photo_Path ?? p.photoUrl ?? '';
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('http')) return raw;
  const base = (API_ROOT_URL || '').replace(/\/+$/, '');
  const rel = '/' + raw.replace(/^\/+/, '');
  return `${base}${rel}`;
};

function PhotoSection({
  opportunityID,
  photos = [],
  onAddPhotos,
  onDeletePhoto,
  readOnly = false,
  uploading = false
}) {
  const [photoError, setPhotoError] = useState('');
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const fileInputRef = useRef(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const ALLOWED_LABEL = 'JPG, PNG, WEBP or GIF';

  const validateFiles = (files) => {
    const invalid = files.filter(f => !ALLOWED_TYPES.includes(f.type));
    if (invalid.length) {
      setPhotoError(`Unsupported file type: ${invalid.map(f => f.name).join(', ')}. Only ${ALLOWED_LABEL} are allowed.`);
      return false;
    }
    setPhotoError('');
    return true;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (!files.length) return;
    if (!validateFiles(files)) return;
    if (onAddPhotos) onAddPhotos(files);
  };

  return (
    <div style={{ marginTop: 24, padding: '16px 20px', background: '#f8f8fc', borderRadius: 12, border: '1px dashed #d0d0e8' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image size={15} color="#049edf" />
          <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 800, color: '#1a1a2e' }}>
            Opportunity Attachments ({photos.length})
          </span>
          {uploading && <Loader2 size={12} className="pg-spin" color="#049edf" />}
        </div>
        {!readOnly && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              multiple
              accept={ALLOWED_TYPES.join(',')}
            />
            <button
              type="button"
              className="pg-btn-add"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Upload size={12} /> Add Photos
            </button>
          </div>
        )}
      </div>

      {photoError && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 10px', background: '#fef2f2', borderRadius: 6, color: '#dc2626', fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
          <AlertCircle size={12} /> {photoError}
        </div>
      )}

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#9090a8', fontSize: 12, fontFamily: 'Nunito, sans-serif' }}>
          No images uploaded yet. {!opportunityID && <span style={{ color: '#ef4444' }}>(Photos will be saved when opportunity is saved)</span>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
          {photos.map((p, idx) => (
            <div key={p.opportunityPhotoID || idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid #ececf8', background: '#fff' }}>
              <img
                src={resolvePhotoSrc(p)}
                alt="Attachment"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setPhotoToDelete(p)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  title="Remove photo"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {photoToDelete && (
        <PhotoDeleteConfirmModal
          photo={photoToDelete}
          onConfirm={() => {
            if (onDeletePhoto) onDeletePhoto(photoToDelete);
            setPhotoToDelete(null);
          }}
          onClose={() => setPhotoToDelete(null)}
        />
      )}
    </div>
  );
}

function PhotoDeleteConfirmModal({ photo, onConfirm, onClose }) {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (cancelBtnRef.current) {
      cancelBtnRef.current.focus();
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!photo) return null;

  const photoName = photo.filename || (photo.photoPath ? photo.photoPath.split('/').pop() : 'Attachment');

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 22, width: '100%', maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', padding: '24px 24px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: '#fffbeb', border: '2px solid #fde68a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={20} color="#d97706" />
          </div>
          <div>
            <h3 style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 18, color: '#1a1a2e', margin: 0 }}>
              Delete Photo?
            </h3>
            <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600, color: '#7878a0', margin: '4px 0 0' }}>
              Confirm deleting this photo.
            </p>
          </div>
        </div>

        <div style={{
          fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 600,
          color: '#4a5568', lineHeight: 1.5, marginBottom: 24,
        }}>
          Are you sure you want to delete the photo <strong>{photoName}</strong>? This action cannot be undone.
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
        }}>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px', borderRadius: 10, border: '1.5px solid #fca5a5',
              background: '#fff', color: '#dc2626', cursor: 'pointer',
              fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 800,
              transition: 'all 0.2s',
            }}
          >
            Yes, Delete
          </button>

          <button
            ref={cancelBtnRef}
            onClick={onClose}
            style={{
              padding: '11px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#049edf,#6c63ff)',
              color: '#fff', cursor: 'pointer',
              fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 800,
              boxShadow: '0 4px 12px rgba(108,99,255,0.2)',
            }}
          >
            No, Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function FieldLabel({ label, required, optional }) {
  return (
    <label className="pg-field-label">
      {label}
      {required && <span className="pg-field-label__required"> *</span>}
      {optional && <span className="pg-field-label__optional"> (optional)</span>}
    </label>
  );
}

function InputWrap({ error, readOnly, icon: Icon, children }) {
  return (
    <div className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : readOnly ? 'pg-field-wrap--readonly' : 'pg-field-wrap--normal'}`}>
      {Icon && <Icon size={14} color={error ? '#ef4444' : readOnly ? '#049edf' : '#c0c0d8'} style={{ flexShrink: 0 }} />}
      {children}
    </div>
  );
}

function FieldError({ msg }) {
  return msg ? (
    <div className="pg-field-error">
      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} /><span>{msg}</span>
    </div>
  ) : null;
}

/* ─────────────────────────────────────────
   STATUS DROPDOWN
 ───────────────────────────────────────── */
function StatusDropdown({ value, onChange }) {
  return (
    <div className="pg-field-wrap pg-field-wrap--normal">
      <ShieldCheck size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
      <select
        className="pg-field-input"
        value={value ? 'Active' : 'Inactive'}
        onChange={e => onChange(e.target.value === 'Active')}
        style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}
      >
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>
    </div>
  );
}

/* ─────────────────────────────────────────
   STATUS BADGE
 ───────────────────────────────────────── */
function StatusBadge({ isActive, isConverted }) {
  if (isConverted) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
        borderRadius: 20, fontFamily: 'Nunito,sans-serif', fontSize: 11,
        fontWeight: 700, background: '#f5f3ff',
        color: '#7c3aed',
        border: '1px solid #ddd6fe', whiteSpace: 'nowrap',
      }}>
        Converted
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 20, fontFamily: 'Nunito,sans-serif', fontSize: 11,
      fontWeight: 700, background: isActive ? '#f0fdf4' : '#fef2f2',
      color: isActive ? '#16a34a' : '#dc2626',
      border: `1px solid ${isActive ? '#bbf7d0' : '#fecaca'}`, whiteSpace: 'nowrap',
    }}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

/* ─────────────────────────────────────────
   OPPORTUNITY CARD (For mobile view)
 ───────────────────────────────────────── */
function OpportunityCard({ opportunity, onViewDetail, onEdit, onConvert }) {
  const isConverted = !!opportunity.ownerID;

  return (
    <div className="pg-card">
      <div className="pg-card__header">
        <div className="pg-card__title-wrap">
          <div className="pg-card__title" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
            {opportunity.name}
          </div>
          <div style={{ marginTop: 4, fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: '#9090a8', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span>ID: #{opportunity.opportunityID}</span>
            <span>·</span>
            <span>{opportunity.location || '—'}</span>
            {opportunity.location && (
              <a
                href={getGoogleMapsUrl(opportunity.location)}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Maps"
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  color: '#049edf',
                  fontWeight: 800,
                  fontSize: 10.5,
                  textDecoration: 'none',
                }}
              >
                <MapPin size={10} /> Maps ↗
              </a>
            )}
          </div>
        </div>
        <div className="pg-card__actions">
          <button className="pg-btn-edit" onClick={() => onEdit(opportunity)} title="Edit">
            <Edit2 size={13} />
          </button>
          {/* Convert to Landlord Button (mobile) - only if not already converted and active */}
          {!isConverted && opportunity.isActive && (
            <button
              onClick={() => onConvert(opportunity)}
              title="Convert to Landlord"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                gap: 4, padding: '4px 9px', borderRadius: 7, border: '1.5px solid #049edf',
                background: '#f0f9ff', color: '#049edf', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Nunito, sans-serif',
              }}
            >
              <UserRoundPlus size={11} /> Convert
            </button>
          )}
          <button className="pg-btn-view" onClick={() => onViewDetail(opportunity)} title="View detail">
            <Eye size={13} />
          </button>
        </div>
      </div>

      <div className="pg-card__body">
        {opportunity.ownerName && (
          <div className="pg-card__row">
            <UserCircle size={12} className="pg-card__row-icon" color="#7c3aed" />
            <span className="pg-card__row-text" style={{ fontWeight: 700, color: '#7c3aed' }}>
              Owner: {opportunity.ownerName}
            </span>
          </div>
        )}

        <div className="pg-card__row">
          <Phone size={12} className="pg-card__row-icon" />
          <span className="pg-card__row-text">{opportunity.phoneNo1}</span>
        </div>

        <div className="pg-card__row">
          <IndianRupee size={12} className="pg-card__row-icon" />
          <span className="pg-card__row-text">
            Offered: ₹{opportunity.rentOffered?.toLocaleString()} · Expected: ₹{opportunity.rentExpected?.toLocaleString()}
          </span>
        </div>

        <div className="pg-card__row">
          <Home size={12} className="pg-card__row-icon" />
          <span className="pg-card__row-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {opportunity.address}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, paddingTop: 8, borderTop: '1px solid #eeeefc' }}>
          <StatusBadge isActive={opportunity.isActive} isConverted={isConverted} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   PHOTO THUMB (with hover effect)
 ───────────────────────────────────────── */
function PhotoThumb({ src, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        height: 90,
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1.5px solid ${hovered ? '#049edf' : '#ececf8'}`,
        background: '#fff',
        boxShadow: hovered ? '0 6px 18px rgba(4,158,223,0.18)' : '0 1px 4px rgba(0,0,0,0.05)',
        transform: hovered ? 'scale(1.04)' : 'scale(1)',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
      }}
    >
      <img
        src={src}
        alt="Opportunity"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: hovered ? 'brightness(1.08)' : 'brightness(1)',
          transition: 'filter 0.22s ease',
        }}
      />
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(4,158,223,0.15), rgba(108,99,255,0.1))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.92)',
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 10,
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 800,
            color: '#049edf',
            letterSpacing: 0.3,
          }}>View</div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   VIEW DETAILS MODAL
 ───────────────────────────────────────── */
function ViewModal({ opportunity, onClose, onEdit }) {
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      if (!opportunity?.opportunityID) return;
      setLoadingPhotos(true);
      try {
        const response = await apiService.getOpportunityPhotos(opportunity.opportunityID);
        const list = (Array.isArray(response) ? response : response?.$values ?? response?.data ?? []).map(normalizeOpportunityPhoto);
        setPhotos(list);
      } catch (err) {
        console.error('Failed to load photos for details view:', err);
      } finally {
        setLoadingPhotos(false);
      }
    };
    fetchPhotos();
  }, [opportunity?.opportunityID]);

  if (!opportunity) return null;

  const InfoRow = ({ icon: Icon, label, value, highlight }) =>
    value || value === 0 ? (
      <div className="pg-info-row">
        <div className={`pg-info-row__icon${highlight ? ' pg-info-row__icon--highlight' : ''}`}>
          <Icon size={14} color={highlight ? '#049edf' : '#a0a0c0'} />
        </div>
        <div className="pg-info-row__content">
          <div className="pg-info-row__label">{label}</div>
          <div className={`pg-info-row__value${highlight ? ' pg-info-row__value--highlight' : ''}`}>{value}</div>
        </div>
      </div>
    ) : null;

  return (
    <>
      {/* <div className="pg-overlay pg-overlay--view" onClick={e => e.target === e.currentTarget && onClose()}> */}
      <div className="pg-overlay pg-overlay--view">
        <div className="pg-modal pg-modal--view" style={{ maxWidth: 580 }}>
          <div className="pg-view__banner">
            <button className="pg-view__close" onClick={onClose}><X size={15} /></button>
            <div className="pg-view__banner-content">
              <div className="pg-view__avatar"><UserCircle size={30} color="#fff" /></div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h4 className="pg-view__name" style={{ wordBreak: 'break-word', margin: 0 }}>{opportunity.name}</h4>
                  <StatusBadge isActive={opportunity.isActive} />
                </div>
                <div className="pg-view__aka" style={{ marginTop: 4 }}>Opportunity ID: #{opportunity.opportunityID}</div>
              </div>
            </div>
            <div className="pg-view__pill">
              <MapPin size={11} color="rgba(255,255,255,0.85)" />
              {opportunity.location ? (
                <a
                  href={getGoogleMapsUrl(opportunity.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                  title="Open in Google Maps"
                >
                  <span className="pg-view__pill-text">{opportunity.location}</span>
                  <ExternalLink size={10} color="rgba(255,255,255,0.85)" />
                </a>
              ) : (
                <span className="pg-view__pill-text">—</span>
              )}
            </div>
          </div>

          <div className="pg-view__body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div className="pg-view__section-label">General Info & Contact</div>
            <InfoRow icon={Phone} label="Primary Phone Number" value={opportunity.phoneNo1} highlight />
            {opportunity.phoneNo2 && <InfoRow icon={Phone} label="Secondary Phone Number" value={opportunity.phoneNo2} />}
            <InfoRow icon={Home} label="Site Address" value={opportunity.address} />

            {opportunity.location && (
              <div className="pg-info-row">
                <div className="pg-info-row__icon pg-info-row__icon--highlight">
                  <MapPin size={14} color="#049edf" />
                </div>
                <div className="pg-info-row__content">
                  <div className="pg-info-row__label">Location / Coordinates</div>
                  <div className="pg-info-row__value pg-info-row__value--highlight" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>{opportunity.location}</span>
                    <a
                      href={getGoogleMapsUrl(opportunity.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: '#049edf',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 8px',
                        background: 'rgba(4,158,223,0.08)',
                        borderRadius: 6,
                        border: '1px solid rgba(4,158,223,0.2)'
                      }}
                    >
                      <ExternalLink size={11} /> Open in Google Maps
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="pg-view__section-label pg-view__section-label--mt">Rent Details</div>
            <InfoRow icon={IndianRupee} label="Rent Offered" value={`₹${opportunity.rentOffered?.toLocaleString()}`} highlight />
            <InfoRow icon={IndianRupee} label="Rent Expected" value={`₹${opportunity.rentExpected?.toLocaleString()}`} highlight />

            {opportunity.comments && (
              <>
                <div className="pg-view__section-label pg-view__section-label--mt">Comments / Negotiatons</div>
                <InfoRow icon={FileText} label="Special Comments" value={opportunity.comments} />
              </>
            )}

            {/* Opportunity Photos List */}
            {loadingPhotos ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#9090a8' }}>
                <Loader2 size={20} className="pg-spin" color="#049edf" />
              </div>
            ) : (
              photos.length > 0 && (
                <>
                  <div className="pg-view__section-label pg-view__section-label--mt">Attached Photos ({photos.length})</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12, marginTop: 10 }}>
                    {photos.map((p, idx) => (
                      <PhotoThumb
                        key={p.opportunityPhotoID || idx}
                        src={resolvePhotoSrc(p)}
                        onClick={() => setLightbox(resolvePhotoSrc(p))}
                      />
                    ))}
                  </div>
                </>
              )
            )}
          </div>

          <div className="pg-view__foot">
            <button className="pg-btn-cancel" onClick={onClose}>Close</button>
            <button className="pg-view__btn-edit" onClick={() => { onClose(); onEdit(opportunity); }}>
              <Edit2 size={13} /> Edit Opportunity
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox enlarge view */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 11000, cursor: 'zoom-out'
          }}
        >
          <img src={lightbox} alt="Enlarged" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: 8 }} />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────
   ADD / EDIT MODAL
 ───────────────────────────────────────── */
function OpportunityFormModal({ onClose, onSaved, editData }) {
  const isEdit = !!editData;
  const [form, setForm] = useState(() => {
    if (isEdit) return { ...editData };
    const saved = sessionStorage.getItem('unsaved_opportunity_form');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { ...EMPTY_FORM };
  });

  useEffect(() => {
    if (!isEdit) {
      sessionStorage.setItem('unsaved_opportunity_form', JSON.stringify(form));
    }
  }, [form, isEdit]);

  const handleCancel = () => {
    sessionStorage.removeItem('unsaved_opportunity_form');
    onClose();
  };
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  const isSupervisor = localStorage.getItem('userRole') === 'supervisor';
  const visibleFields = isSupervisor ? FIELDS.filter(f => f.key !== 'isActive') : FIELDS;

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocation(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        handleChange('location', formatted);
        setGettingLocation(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        let msg = 'Failed to get current location.';
        if (err.code === 1) msg = 'Location permission denied. Please allow location access in your browser.';
        else if (err.code === 2) msg = 'Location position unavailable. Please try again.';
        else if (err.code === 3) msg = 'Location request timed out. Please try again.';
        setLocationError(msg);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Photos State
  const [photos, setPhotos] = useState([]);
  const [stagedNewPhotos, setStagedNewPhotos] = useState([]);
  const [stagedDeletedPhotos, setStagedDeletedPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  const loadPhotos = useCallback(async () => {
    if (!form.opportunityID) return;
    setPhotosLoading(true);
    try {
      const response = await apiService.getOpportunityPhotos(form.opportunityID);
      const list = (Array.isArray(response) ? response : response?.$values ?? response?.data ?? []).map(normalizeOpportunityPhoto);
      setPhotos(list);
    } catch (err) {
      console.error('Failed to load photos:', err);
    } finally {
      setPhotosLoading(false);
    }
  }, [form.opportunityID]);

  useEffect(() => {
    if (isEdit) {
      loadPhotos();
    }
  }, [isEdit, loadPhotos]);

  const handleAddPhotos = (files) => {
    files.forEach(file => {
      const tempId = 'new_' + Math.random().toString(36).substr(2, 9);
      const newPhoto = {
        opportunityPhotoID: tempId,
        opportunityID: form.opportunityID,
        filename: file.name,
        _file: file,
        photoUrl: URL.createObjectURL(file),
      };
      setPhotos(prev => [...prev, newPhoto]);
      setStagedNewPhotos(prev => [...prev, newPhoto]);
    });
  };

  const handleDeletePhoto = (photoToDelete) => {
    if (!String(photoToDelete.opportunityPhotoID).startsWith('new_')) {
      setStagedDeletedPhotos(prev => [...prev, photoToDelete]);
    } else {
      setStagedNewPhotos(prev => prev.filter(p => p.opportunityPhotoID !== photoToDelete.opportunityPhotoID));
    }
    setPhotos(prev => prev.filter(p => p.opportunityPhotoID !== photoToDelete.opportunityPhotoID));
  };

  const runValidate = (f) => {
    const e = {};
    visibleFields.forEach(({ key, required, type }) => {
      const err = validateField(key, f[key], type, required);
      if (err) e[key] = err;
    });
    return e;
  };

  const handleChange = (key, val) => {
    const updated = { ...form, [key]: val };
    setForm(updated);
    if (touched[key]) {
      const field = FIELDS.find(f => f.key === key);
      const err = validateField(key, val, field.type, field.required);
      setErrors(p => ({ ...p, [key]: err }));
    }
  };

  const handleBlur = (key) => {
    setTouched(p => ({ ...p, [key]: true }));
    const field = FIELDS.find(f => f.key === key);
    const err = validateField(key, form[key], field.type, field.required);
    setErrors(p => ({ ...p, [key]: err }));
  };

  const handleSubmit = async () => {
    const allTouched = {};
    visibleFields.forEach(f => { allTouched[f.key] = true; });
    setTouched(allTouched);

    const e = runValidate(form);
    if (Object.keys(e).length) { setErrors(e); return; }

    setSubmitting(true);
    setApiError('');

    try {
      const payload = toPayload(form);
      let saved;

      if (isEdit) {
        const response = await apiService.updateOpportunity(payload);
        const raw = response?.data ?? response;
        saved = (raw && typeof raw === 'object' && (raw.opportunity_ID ?? raw.opportunityID))
          ? normalizeOpportunity(raw)
          : { ...editData, ...form };
      } else {
        const response = await apiService.createOpportunity(payload);
        const raw = response?.data ?? response;
        saved = normalizeOpportunity(raw);
      }

      const savedID = saved.opportunityID;

      // Handle photos deletion on server
      if (stagedDeletedPhotos.length > 0) {
        for (const dp of stagedDeletedPhotos) {
          await apiService.deleteOpportunityPhoto(dp.opportunityPhotoID);
        }
      }

      // Handle photos upload to server
      if (stagedNewPhotos.length > 0 && savedID) {
        for (const np of stagedNewPhotos) {
          const fd = new FormData();
          fd.append('OpportunityPhotoID', '0');
          fd.append('OpportunityID', String(savedID));
          fd.append('PhotoPath', np.filename);
          fd.append('Photos', np._file);
          await apiService.uploadOpportunityPhoto(fd);
        }
      }

      setSuccess(true);
      await new Promise(r => setTimeout(r, 600));
      // ── START: Clear unsaved draft on save success ──
      sessionStorage.removeItem('unsaved_opportunity_form');
      // ── END: Clear unsaved draft on save success ──
      onSaved(saved, isEdit);
      onClose();
    } catch (err) {
      console.error('Save opportunity error:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to save Opportunity details.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="pg-overlay">
      <div className="pg-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><UserCircle size={20} color="#049edf" /></div>
            <div>
              <h5 className="pg-modal__title">{isEdit ? 'Edit Opportunity' : 'Add New Opportunity'}</h5>
              <p className="pg-modal__subtitle">{isEdit ? `Editing ID: #${editData.opportunityID}` : 'Provide details for the land hoarding opportunity'}</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={handleCancel}><X size={15} /></button>
        </div>

        {/* API error banner */}
        {apiError && (
          <div style={{ margin: '0 24px 8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11, color: '#dc2626', fontSize: 13, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle size={15} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>{apiError}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="pg-modal__body" style={{ padding: '16px 24px' }}>
          <div className="row g-3">
            {visibleFields.map(f => {
              const isFieldTouched = touched[f.key];
              const fieldError = errors[f.key];

              return (
                <div key={f.key} className={`col-12 col-md-${f.col}`}>
                  {f.type === 'combo-status' ? (
                    <>
                      <FieldLabel label={f.label} required={f.required} optional={!f.required} />
                      <StatusDropdown
                        value={form.isActive}
                        onChange={val => handleChange('isActive', val)}
                      />
                    </>
                  ) : f.key === 'location' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <FieldLabel label={f.label} required={f.required} optional={!f.required} />
                        <button
                          type="button"
                          onClick={handleGetCurrentLocation}
                          disabled={gettingLocation}
                          title="Get User Current Location (GPS)"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 10px',
                            borderRadius: 8,
                            border: '1.5px solid #049edf',
                            background: gettingLocation ? '#f0f9ff' : 'rgba(4, 158, 223, 0.08)',
                            color: '#049edf',
                            fontFamily: 'Nunito, sans-serif',
                            fontSize: 11.5,
                            fontWeight: 800,
                            cursor: gettingLocation ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                            marginBottom: 4,
                          }}
                        >
                          {gettingLocation ? (
                            <>
                              <Loader2 size={12} className="pg-spin" />
                              <span>Fetching GPS…</span>
                            </>
                          ) : (
                            <>
                              <MapPin size={12} />
                              <span>Current Location</span>
                            </>
                          )}
                        </button>
                      </div>

                      <InputWrap error={isFieldTouched && !!fieldError} icon={f.icon}>
                        <input
                          className="pg-field-input"
                          type="text"
                          placeholder={f.placeholder}
                          value={form[f.key] ?? ''}
                          onChange={e => {
                            handleChange(f.key, e.target.value);
                            if (locationError) setLocationError('');
                          }}
                          onBlur={() => handleBlur(f.key)}
                          autoComplete="off"
                          style={{ width: '100%', fontSize: 13 }}
                        />
                      </InputWrap>

                      {locationError && (
                        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#dc2626', marginTop: 4, display: 'flex', gap: 4, alignItems: 'center' }}>
                          <AlertCircle size={11} /> {locationError}
                        </div>
                      )}
                      {/* {form.location && (
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <a
                            href={getGoogleMapsUrl(form.location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontFamily: 'Nunito, sans-serif',
                              fontSize: 11,
                              color: '#049edf',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <ExternalLink size={11} /> View in Google Maps ↗
                          </a>
                        </div>
                      )} */}
                    </div>
                  ) : (
                    <>
                      <FieldLabel label={f.label} required={f.required} optional={!f.required} />
                      <InputWrap error={isFieldTouched && !!fieldError} icon={f.icon}>
                      {f.type === 'textarea' ? (
                        <textarea
                          className="pg-field-input"
                          placeholder={f.placeholder}
                          value={form[f.key] ?? ''}
                          onChange={e => handleChange(f.key, e.target.value)}
                          onBlur={() => handleBlur(f.key)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            resize: 'vertical',
                            minHeight: '80px',
                            paddingTop: '8px',
                            paddingBottom: '8px',
                            fontFamily: 'inherit',
                            fontSize: '13px'
                          }}
                        />
                      ) : (
                        <input
                          className="pg-field-input"
                          type={f.type === 'number' ? 'number' : 'text'}
                          placeholder={f.placeholder}
                          value={form[f.key] ?? ''}
                          onChange={e => handleChange(f.key, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                          onBlur={() => handleBlur(f.key)}
                          autoComplete="off"
                        />
                      )}
                    </InputWrap>
                    </>
                  )}
                  {isFieldTouched && <FieldError msg={fieldError} />}
                </div>
              );
            })}
          </div>

          {/* Photo attachment list and upload */}
          {photosLoading ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9090a8' }}>
              <Loader2 size={20} className="pg-spin" color="#049edf" />
            </div>
          ) : (
            <PhotoSection
              opportunityID={form.opportunityID}
              photos={photos}
              onAddPhotos={handleAddPhotos}
              onDeletePhoto={handleDeletePhoto}
              uploading={submitting}
            />
          )}
        </div>

        {/* Footer */}
        <div className="pg-modal__foot" style={{ padding: '16px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="pg-btn-cancel" onClick={handleCancel} disabled={submitting}>Cancel</button>
          <button
            className="pg-btn-add"
            onClick={handleSubmit}
            disabled={submitting || success}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="pg-spin" /> Saving...
              </>
            ) : success ? (
              <>
                <Check size={14} /> Saved!
              </>
            ) : (
              <>
                <Check size={14} /> Save Opportunity
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── START: Convert to Land Lord Confirmation Modal ──
function ConvertConfirmModal({ opportunity, onConfirm, onCancel }) {
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          animation: 'modalIn 0.24s cubic-bezier(0.22,1,0.36,1) both',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Blue header strip */}
        <div style={{ background: 'linear-gradient(135deg,#049edf,#6c63ff)', padding: '22px 24px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.22)', border: '2px solid rgba(255,255,255,0.38)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <UserRoundPlus size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 18, color: '#fff', marginBottom: 2 }}>
                Convert to Land Lord?
              </div>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>
                This will transfer data to Owner creation
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 600, color: '#4a5568', lineHeight: 1.7, marginBottom: 14 }}>
            Are you sure you want to convert opportunity <strong style={{ color: '#049edf' }}>{opportunity.name}</strong> to a Land Lord?
          </div>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 9, padding: '11px 14px',
            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 11,
            fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 600, color: '#166534', lineHeight: 1.5,
          }}>
            <Check size={14} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>You will be redirected to the Land Lords page with pre-filled details.</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '0 24px 22px' }}>
          <button
            onClick={onCancel}
            style={{ padding: '10px 22px', borderRadius: 11, background: '#f5f5fb', border: '1.5px solid #e8e8f0', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: 13, color: '#7878a0' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 11,
              background: 'linear-gradient(135deg,#049edf,#6c63ff)', color: '#fff', border: 'none',
              cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13,
              boxShadow: '0 4px 14px rgba(4,158,223,0.35)',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
// ── END: Convert to Land Lord Confirmation Modal ──

// ── START: Pass changeTab and add convertTarget state ──
// export default function OpportunityPage() {
export default function OpportunityPage({ changeTab }) {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  /* -- Filter & Search -- */
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('opportunityID');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('All');

  /* -- Modals -- */
  const [detailOpportunity, setDetailOpportunity] = useState(null);
  const [formOpportunity, setFormOpportunity] = useState(() => {
    const saved = sessionStorage.getItem('unsaved_opportunity_form');
    if (saved) return EMPTY_FORM;
    return null;
  });
  const [modalLoading, setModalLoading] = useState(false);

  // ── Convert to Landlord State ──
  const [convertTarget, setConvertTarget] = useState(null);

  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => { if (!loading) setTableReady(true); }, [loading]);
  useResizableColumns(tableRef, tableReady, [60, 130, 130, 110, 110, 95, 95, 80, 90]);

  const loadOpportunities = useCallback(async (filterValue = statusFilter) => {
    setLoading(true);
    setApiError('');
    try {
      let data;
      if (filterValue === 'Converted') {
        data = await apiService.getConvertedOpportunities();
      } else if (filterValue === 'Active') {
        data = await apiService.getAllOpportunities(true);
      } else if (filterValue === 'Inactive') {
        data = await apiService.getAllOpportunities(false);
      } else {
        data = await apiService.getAllOpportunities();
      }
      const raw = data?.data ?? data;
      const list = (Array.isArray(raw) ? raw : raw?.$values ?? []).map(normalizeOpportunity);
      setOpportunities(list);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
      setApiError(err?.response?.data?.message || err?.message || 'Failed to fetch opportunities from the server.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadOpportunities(statusFilter);
  }, []);

  useEffect(() => {
    const successMsg = sessionStorage.getItem('opportunity_convert_success');
    if (successMsg) {
      sessionStorage.removeItem('opportunity_convert_success');
      setSuccessBanner(successMsg);
      const timer = setTimeout(() => setSuccessBanner(''), 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setOpportunities(prev => prev.map(o => o.opportunityID === saved.opportunityID ? saved : o));
    } else {
      setOpportunities(prev => [saved, ...prev]);
    }
  };

  const handleEditClick = async (opportunity) => {
    setModalLoading(true);
    try {
      const response = await apiService.getOpportunityById(opportunity.opportunityID);
      const raw = response?.data ?? response;
      const normalized = normalizeOpportunity(raw);
      setFormOpportunity(normalized);
    } catch (err) {
      console.error('Failed to fetch opportunity by ID, falling back to table data:', err);
      setFormOpportunity({ ...opportunity });
    } finally {
      setModalLoading(false);
    }
  };

  // ── Convert to Landlord Confirmation Handler ──
  const handleConvertConfirm = () => {
    if (!convertTarget) return;
    const dataToPass = {
      fromOpportunityId: convertTarget.opportunityID,
      ownerName: convertTarget.name || '',
      phone1: convertTarget.phoneNo1 || '',
      phone2: convertTarget.phoneNo2 || '',
      ownerAddress: convertTarget.address || '',
    };
    sessionStorage.setItem('pending_convert_opportunity', JSON.stringify(dataToPass));
    sessionStorage.setItem('dashTab', 'owners');
    if (typeof changeTab === 'function') {
      changeTab('owners');
    } else {
      window.location.reload();
    }
    setConvertTarget(null);
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  /* -- Filter / Sort -- */
  const filtered = opportunities.filter(o => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      String(o.opportunityID).includes(q) ||
      (o.name || '').toLowerCase().includes(q) ||
      (o.ownerName || '').toLowerCase().includes(q) ||
      (o.location || '').toLowerCase().includes(q) ||
      (o.phoneNo1 || '').toLowerCase().includes(q) ||
      (o.address || '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortKey];
    let bv = b[sortKey];

    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();

    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  if (loading && opportunities.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 14 }}>
      <Loader2 size={32} color="#049edf" className="pg-spin" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading opportunities...</span>
    </div>
  );

  return (
    <>
      {convertTarget && (
        <ConvertConfirmModal
          opportunity={convertTarget}
          onConfirm={handleConvertConfirm}
          onCancel={() => setConvertTarget(null)}
        />
      )}

      {detailOpportunity && (
        <ViewModal
          opportunity={detailOpportunity}
          onClose={() => setDetailOpportunity(null)}
          onEdit={handleEditClick}
        />
      )}

      {formOpportunity && (
        <OpportunityFormModal
          editData={formOpportunity.opportunityID ? formOpportunity : null}
          onClose={() => setFormOpportunity(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="pg-page">
        {/* Page Header */}
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Land Opportunities</h1>
            <p className="pg-header__subtitle">
              Manage hoarding site proposals and landlord details.
            </p>
          </div>
          <button className="pg-btn-add" onClick={() => setFormOpportunity(EMPTY_FORM)}>
            <Plus size={16} /> Add Opportunity
          </button>
        </div>

        {successBanner && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 11, marginBottom: 16, color: '#166534', fontSize: 13, fontWeight: 700, fontFamily: 'Nunito,sans-serif' }}>
            <Check size={16} color="#16a34a" /> {successBanner}
          </div>
        )}

        {apiError && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11, marginBottom: 16, color: '#dc2626', fontSize: 13, fontWeight: 600, fontFamily: 'Nunito,sans-serif' }}>
            <AlertCircle size={14} /> {apiError}
          </div>
        )}

        {/* Toolbar & Container */}
        <div className="pg-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #f0f0f8', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(4,158,223,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={15} color="#049edf" />
              </div>
              <div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>{sorted.length}</div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 600, color: '#9090a8', lineHeight: 1, marginTop: 2 }}>
                  Opportunit{sorted.length !== 1 ? 'ies' : 'y'}
                </div>
              </div>
            </div>

            {/* Search Box */}
            <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: '#f4f4fb', borderRadius: 10, border: '1.5px solid #ececf8' }}>
              <Search size={14} color="#9090a8" style={{ flexShrink: 0 }} />
              <input
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}
                placeholder="Search by ID, name, owner, location, phone, address..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && <X size={13} style={{ cursor: 'pointer', color: '#9090a8', flexShrink: 0 }} onClick={() => setSearch('')} />}
            </div>

            {/* Status Filter Dropdown */}
            <select
              className="hd-filter-select"
              value={statusFilter}
              onChange={e => {
                const val = e.target.value;
                setStatusFilter(val);
                setPage(1);
                loadOpportunities(val);
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Converted">Converted</option>
            </select>

            <button
              onClick={() => loadOpportunities(statusFilter)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1.5px solid #e8e8f4', background: '#fff', color: '#5a5a78', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="pg-desktop-table" style={{ overflowX: 'auto' }}>
            <table ref={tableRef} className="pg-table" style={{ minWidth: 900, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  {[
                    { key: 'opportunityID', label: 'ID', w: '6%' },
                    { key: 'name', label: 'Name', w: '18%' },
                    { key: 'ownerName', label: 'Owner Name', w: '16%' },
                    { key: 'location', label: 'Location', w: '14%' },
                    { key: 'phoneNo1', label: 'Phone No', w: '13%' },
                    { key: 'rentOffered', label: 'Rent Offered', w: '11%' },
                    { key: 'rentExpected', label: 'Rent Expected', w: '11%' },
                    { key: 'isActive', label: 'Status', w: '9%' },
                    { key: null, label: 'Actions', w: '12%' }
                  ].map((col, idx) => (
                    <th
                      key={idx} style={{ width: col.w }}
                      className={['pg-th', col.key ? 'pg-th--sort' : ''].filter(Boolean).join(' ')}
                      onClick={() => col.key && handleSort(col.key)}
                    >
                      <div className="pg-th__inner">
                        {col.label}
                        {col.key && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="pg-td pg-empty">
                      <div className="pg-empty__inner">
                        <Users size={36} color="#d0d0e8" />
                        <span className="pg-empty__label">No opportunities found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map(o => (
                    <tr key={o.opportunityID} className="pg-tr">
                      <td className="pg-td" style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 800, color: '#049edf' }}>
                        #{o.opportunityID}
                      </td>
                      <td className="pg-td pg-td--overflow" style={{ fontWeight: 800, color: '#1a1a2e' }}>
                        <span className="pg-td__ellipsis" title={o.name}>{o.name}</span>
                      </td>
                      <td className="pg-td pg-td--overflow">
                        {o.ownerName ? (
                          <span style={{ fontWeight: 700, color: '#7c3aed' }} title={o.ownerName}>
                            {o.ownerName}
                          </span>
                        ) : (
                          <span style={{ color: '#a0a0b8' }}>—</span>
                        )}
                      </td>
                      <td className="pg-td pg-td--overflow">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
                          <span className="pg-td__ellipsis" title={o.location} style={{ flex: 1 }}>
                            {o.location || '—'}
                          </span>
                          {o.location && (
                            <a
                              href={getGoogleMapsUrl(o.location)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Open "${o.location}" in Google Maps`}
                              onClick={e => e.stopPropagation()}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                background: 'rgba(4, 158, 223, 0.08)',
                                color: '#049edf',
                                border: '1px solid rgba(4, 158, 223, 0.25)',
                                flexShrink: 0,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <MapPin size={11} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="pg-td" style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700 }}>
                        {o.phoneNo1}
                      </td>
                      <td className="pg-td">
                        ₹{o.rentOffered?.toLocaleString()}
                      </td>
                      <td className="pg-td">
                        ₹{o.rentExpected?.toLocaleString()}
                      </td>
                      <td className="pg-td">
                        <StatusBadge isActive={o.isActive} isConverted={!!o.ownerID} />
                      </td>
                      <td className="pg-td">
                        <div className="pg-action-wrap">
                          <button className="pg-btn-edit" onClick={() => handleEditClick(o)} title="Edit" style={{ width: 28, height: 28 }}>
                            <Edit2 size={12} />
                          </button>
                          {/* Convert to Landlord Button (desktop) - only if not already converted and active */}
                          {!o.ownerID && o.isActive && (
                            <button
                              onClick={() => setConvertTarget(o)}
                              title="Convert to Landlord"
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 28, height: 28, borderRadius: 7, border: '1.5px solid #049edf',
                                background: '#f0f9ff', color: '#049edf', cursor: 'pointer',
                              }}
                            >
                              <UserRoundPlus size={12} />
                            </button>
                          )}
                          <button className="pg-btn-view" onClick={() => setDetailOpportunity(o)} title="View detail" style={{ width: 28, height: 28 }}>
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <Users size={36} color="#d0d0e8" />
                <span className="pg-empty__label">No opportunities found</span>
              </div>
            ) : (
              paginated.map(o => (
                <OpportunityCard
                  key={o.opportunityID}
                  opportunity={o}
                  onViewDetail={setDetailOpportunity}
                  onEdit={handleEditClick}
                  onConvert={setConvertTarget}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {sorted.length > pageSize && (
            <div className="pg-pagination">
              <div className="pg-pagination__left">
                <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
                <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
                {pageNums.map((p, i) => p === '…'
                  ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                  : <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                )}
                <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
                <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={13} /></button>
              </div>
              <div className="pg-pagination__right">
                <select className="pg-pagesize-select" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="pg-pagination__text">Items per page</span>
                <span className="pg-pagination__text">{page} of {totalPages} pages ({sorted.length} items)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── START: Render Convert to Land Lord Confirmation Modal ── */}
      {convertTarget && (
        <ConvertConfirmModal
          opportunity={convertTarget}
          onConfirm={handleConvertConfirm}
          onCancel={() => setConvertTarget(null)}
        />
      )}
      {/* ── END: Render Convert to Land Lord Confirmation Modal ── */}

      {/* Modal API loading backdrop */}
      {modalLoading && (
        <div className="pg-overlay" style={{ zIndex: 10000, background: 'rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={32} color="#049edf" className="pg-spin" />
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────
   PAGE-SPECIFIC HELPERS (SORT & SIZE OPTIONS)
 ───────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span className="pg-sort-icon">
      <ChevronUp size={10} color={active && sortDir === 'asc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up" style={{ display: 'block', marginBottom: -2 }} />
      <ChevronDown size={10} color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down" style={{ display: 'block' }} />
    </span>
  );
}
