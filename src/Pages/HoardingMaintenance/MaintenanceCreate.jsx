import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Wrench,
  Layers,
  HelpCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Loader2,
  Plus,
  AlertCircle,
  X,
  Upload,
  Trash2,
  Image as ImageIcon,
  MapPin,
} from 'lucide-react';
import { apiService } from '../../api/api';
import ConfirmDialog from '../../components/hoardingMaintenance/ConfirmDialog';
import SearchableSelect from '../../components/hoardingMaintenance/SearchableSelect';
import {
  MAINTENANCE_PRIORITIES,
  PRIORITY_OPTIONS,
  PRIORITY_CONFIG,
  MAX_FILE_SIZE_MB,
  MAX_PHOTOS_COUNT,
  ALLOWED_IMAGE_TYPES,
} from '../../constants/maintenanceConstants';
import '../Common1.css';

/* ─────────────────────────────────────────
   HELPER COMPONENTS
 ───────────────────────────────────────── */
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
    <div
      className={`pg-field-wrap ${
        error
          ? 'pg-field-wrap--error'
          : readOnly
          ? 'pg-field-wrap--readonly'
          : 'pg-field-wrap--normal'
      }`}
    >
      {Icon && (
        <Icon
          size={14}
          color={error ? '#ef4444' : readOnly ? '#049edf' : '#c0c0d8'}
          style={{ flexShrink: 0 }}
        />
      )}
      {children}
    </div>
  );
}

function FieldError({ msg }) {
  return msg ? (
    <div className="pg-field-error">
      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{msg}</span>
    </div>
  ) : null;
}

/* ─────────────────────────────────────────
   PHOTO SECTION (Opportunity style)
 ───────────────────────────────────────── */
function PhotoUploadSection({ photos = [], onAddPhotos, onDeletePhoto, disabled, error }) {
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef(null);

  const validateFiles = (files) => {
    if (photos.length + files.length > MAX_PHOTOS_COUNT) {
      setPhotoError(`Maximum ${MAX_PHOTOS_COUNT} photos allowed.`);
      return false;
    }

    for (const f of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
        setPhotoError(`Unsupported file type: ${f.name}. Only JPG, PNG, WEBP are allowed.`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setPhotoError(`File "${f.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
        return false;
      }
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

  const hasError = Boolean(error || photoError);

  return (
    <div
      style={{
        marginTop: 16,
        padding: '16px 20px',
        background: hasError ? '#fffbfa' : '#f8f8fc',
        borderRadius: 12,
        border: hasError ? '1.5px dashed #ef4444' : '1px dashed #d0d0e8',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 800,
              fontSize: 13,
              color: '#1a1a2e',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ImageIcon size={15} color={hasError ? '#ef4444' : '#049edf'} />
            <span>Before Repair Photos ({photos.length}/{MAX_PHOTOS_COUNT})</span>
            <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 14 }}>*</span>
          </div>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: 11,
              color: hasError ? '#dc2626' : '#9090a8',
              fontFamily: 'Nunito, sans-serif',
            }}
          >
            Attach initial inspection/damage photos before repair starts (At least 1 photo required, Max 5MB each)
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            disabled={disabled || photos.length >= MAX_PHOTOS_COUNT}
          />
          <button
            type="button"
            className="pg-btn-add"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || photos.length >= MAX_PHOTOS_COUNT}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg,#049edf,#6c63ff)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: disabled || photos.length >= MAX_PHOTOS_COUNT ? 'not-allowed' : 'pointer',
              fontWeight: 700,
            }}
          >
            <Upload size={12} /> Add Photos
          </button>
        </div>
      </div>

      {(error || photoError) && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            padding: '6px 10px',
            background: '#fef2f2',
            borderRadius: 6,
            color: '#dc2626',
            fontSize: 11,
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          <AlertCircle size={12} /> {error || photoError}
        </div>
      )}

      {photos.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '16px 0',
            color: hasError ? '#dc2626' : '#9090a8',
            fontSize: 12,
            fontFamily: 'Nunito, sans-serif',
            fontWeight: hasError ? 700 : 500,
          }}
        >
          {error ? 'Please upload at least one Before Repair photo.' : 'No Before photos uploaded yet. (Compulsory)'}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
            gap: 10,
          }}
        >
          {photos.map((p, idx) => (
            <div
              key={p.id || idx}
              style={{
                position: 'relative',
                width: 80,
                height: 80,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #ececf8',
                background: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              <img
                src={p.previewUrl}
                alt="Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() => onDeletePhoto(p.id)}
                disabled={disabled}
                title="Remove Photo"
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
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT: MaintenanceCreate (Modal)
 ═══════════════════════════════════════════ */
export default function MaintenanceCreate({
  onCancel,
  onCreated,
  showToast,
}) {
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  // Dropdown options
  const [hoardings, setHoardings] = useState([]);
  const [reasons, setReasons] = useState([]);

  // Form State
  const [form, setForm] = useState({
    hoardingId: '',
    maintenanceReasonId: '',
    priority: MAINTENANCE_PRIORITIES.NORMAL,
    targetDate: '',
    description: '',
  });
  const [photos, setPhotos] = useState([]); // [{ id, file, previewUrl }]
  const [errors, setErrors] = useState({});

  // Confirmation Modals State
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, [photos]);

  // Fetch Lookups
  useEffect(() => {
    let active = true;
    const loadLookups = async () => {
      setLoadingLookups(true);
      try {
        const [addressData, rRes] = await Promise.all([
          apiService.getHoardingAddressMap(),
          apiService.getMaintenanceReasons().catch(() => []),
        ]);

        if (active) {
          setHoardings(addressData?.uniqueHoardings || []);
          setReasons((rRes || []).filter((r) => r.isActive));
        }
      } catch (err) {
        console.error('Failed to load maintenance form options:', err);
      } finally {
        if (active) setLoadingLookups(false);
      }
    };

    loadLookups();
    return () => {
      active = false;
    };
  }, []);

  // ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCancelClick();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [form, photos]);

  // Selected hoarding object
  const selectedHoarding = hoardings.find((h) => String(h.hoardingID) === String(form.hoardingId));

  // Options for Dropdowns
  const hoardingOptions = hoardings.map((h) => ({
    value: h.hoardingID,
    label: h.hoardingCode,
    badge: h.width && h.height ? `${h.width} × ${h.height} ft` : null,
    subtext: h.fullAddress || (h.city ? `${h.city}, ${h.addressLine1 || 'Main'}` : (h.addressLine1 || 'No address specified')),
    subIcon: MapPin,
  }));

  const reasonOptions = reasons.map((r) => ({
    value: r.maintenanceReasonID || r.maintenanceReasonId,
    label: r.reasonName,
    subtext: r.description || '',
  }));

  const priorityDropdownOptions = PRIORITY_OPTIONS.map((p) => {
    const conf = PRIORITY_CONFIG[p] || {};
    return {
      value: p,
      label: p,
      icon: AlertTriangle,
      iconColor: conf.color,
    };
  });

  // Handle Photo add & remove
  const handleAddPhotos = (newFiles) => {
    const wrapped = newFiles.map((f) => ({
      id: 'photo_' + Math.random().toString(36).substr(2, 9),
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setPhotos((prev) => [...prev, ...wrapped]);
    if (errors.photos) {
      setErrors((prev) => ({ ...prev, photos: '' }));
    }
  };

  const handleDeletePhoto = (id) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  // Form Change
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Validation
  const validate = () => {
    const errs = {};
    if (!form.hoardingId) {
      errs.hoardingId = 'Please select a hoarding.';
    }
    if (!form.maintenanceReasonId) {
      errs.maintenanceReasonId = 'Please select a maintenance reason.';
    }
    if (!form.priority) {
      errs.priority = 'Please select a priority.';
    }
    if (!photos || photos.length === 0) {
      errs.photos = 'Please upload at least one Before Repair photo.';
    }
    return errs;
  };

  // Submit Handler
  const handlePreSubmit = (e) => {
    if (e) e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setShowConfirmSubmit(true);
  };

  const handleConfirmedSubmit = async () => {
    setShowConfirmSubmit(false);
    setSubmitting(true);
    setApiError('');

    try {
      const formData = new FormData();
      const hoardingIdVal = String(form.hoardingId || '');
      const reasonIdVal = String(form.maintenanceReasonId || '');

      // Send hoarding ID in all casing formats to ensure 100% backend compatibility
      formData.append('HoardingID', hoardingIdVal);
      formData.append('hoarding_Id', hoardingIdVal);
      formData.append('Hoarding_ID', hoardingIdVal);
      formData.append('HoardingId', hoardingIdVal);
      formData.append('hoardingId', hoardingIdVal);
      formData.append('hoarding_id', hoardingIdVal);
      formData.append('hoardin_Id', hoardingIdVal);
      formData.append('Hoardin_Id', hoardingIdVal);

      // Send reason ID in all casing formats
      formData.append('MaintenanceReasonID', reasonIdVal);
      formData.append('maintenance_Reason_Id', reasonIdVal);
      formData.append('Maintenance_Reason_ID', reasonIdVal);
      formData.append('MaintenanceReasonId', reasonIdVal);
      formData.append('maintenanceReasonId', reasonIdVal);
      formData.append('maintenance_reason_id', reasonIdVal);

      formData.append('Priority', form.priority || 'Normal');
      formData.append('priority', form.priority || 'Normal');

      if (form.targetDate) {
        formData.append('TargetResolutionDate', form.targetDate);
        formData.append('targetResolutionDate', form.targetDate);
        formData.append('target_Resolution_Date', form.targetDate);
      }
      if (form.description && form.description.trim()) {
        formData.append('Description', form.description.trim());
        formData.append('description', form.description.trim());
      }

      photos.forEach((p) => {
        if (p.file) {
          formData.append('photos', p.file);
        }
      });

      const res = await apiService.createHoardingMaintenance(formData);
      const newId =
        res?.maintenance_ID ||
        res?.maintenanceID ||
        res?.hoardingMaintenanceID ||
        res?.hoardingMaintenanceId ||
        res?.id ||
        (res?.data && (res.data.maintenance_ID || res.data.maintenanceID || res.data.hoardingMaintenanceID || res.data.id));

      if (showToast) {
        showToast('Maintenance request created successfully!', 'success');
      }

      if (onCreated) {
        onCreated(newId);
      }
    } catch (err) {
      console.error('Failed to create maintenance request:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Failed to create maintenance request. Please try again.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Check Dirty State
  const isDirty =
    Boolean(form.hoardingId) ||
    Boolean(form.maintenanceReasonId) ||
    form.priority !== MAINTENANCE_PRIORITIES.NORMAL ||
    Boolean(form.targetDate) ||
    Boolean(form.description.trim()) ||
    photos.length > 0;

  const handleCancelClick = () => {
    if (isDirty) {
      setShowConfirmCancel(true);
    } else {
      onCancel();
    }
  };

  return ReactDOM.createPortal(
    <div className="pg-overlay" style={{ zIndex: 9999 }}>
      <div
        className="pg-modal"
        style={{
          maxHeight: '92vh',
          overflowY: 'auto',
          maxWidth: '720px',
          width: '100%',
        }}
      >
        {/* Modal Header */}
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap">
              <Wrench size={20} color="#049edf" />
            </div>
            <div>
              <h5 className="pg-modal__title">Add New Maintenance Request</h5>
              <p className="pg-modal__subtitle">
                Provide details for the hoarding repair or inspection task
              </p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={handleCancelClick}>
            <X size={15} />
          </button>
        </div>

        {/* API Error Alert */}
        {apiError && (
          <div
            style={{
              margin: '0 24px 12px',
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 11,
              color: '#dc2626',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}
          >
            <AlertCircle size={15} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>{apiError}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="pg-modal__body" style={{ padding: '16px 24px' }}>
          {loadingLookups ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '240px',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <Loader2 size={28} className="pg-spin" color="#049edf" />
              <span
                style={{
                  fontFamily: 'Nunito, sans-serif',
                  color: '#9090a8',
                  fontSize: 13,
                }}
              >
                Loading form data…
              </span>
            </div>
          ) : (
            <form onSubmit={handlePreSubmit}>
              <div className="row g-3">
                {/* 1. Custom Searchable Hoarding Selection */}
                <div className="col-12" style={{ position: 'relative', zIndex: 60 }}>
                  <FieldLabel label="Select Hoarding" required />
                  <SearchableSelect
                    value={form.hoardingId}
                    onChange={(val) => handleChange('hoardingId', val)}
                    options={hoardingOptions}
                    placeholder="Choose a hoarding from the list…"
                    searchPlaceholder="Search by code, city or address…"
                    icon={Layers}
                    error={Boolean(errors.hoardingId)}
                    disabled={submitting}
                  />
                  <FieldError msg={errors.hoardingId} />
                  {selectedHoarding && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '9px 13px',
                        background: '#f0f9ff',
                        borderRadius: 10,
                        border: '1.5px solid #bae6fd',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <MapPin size={14} color="#0284c7" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: '#0369a1' }}>
                        <span style={{ fontWeight: 800 }}>Site Address: </span>
                        <span style={{ fontWeight: 600 }}>{selectedHoarding.fullAddress || 'No address specified'}</span>
                      </div>
                      {selectedHoarding.width && selectedHoarding.height && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            color: '#0284c7',
                            background: '#e0f2fe',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {selectedHoarding.width} × {selectedHoarding.height} ft
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Custom Searchable Maintenance Reason */}
                <div className="col-12 col-md-6" style={{ position: 'relative', zIndex: 50 }}>
                  <FieldLabel label="Maintenance Reason" required />
                  <SearchableSelect
                    value={form.maintenanceReasonId}
                    onChange={(val) => handleChange('maintenanceReasonId', val)}
                    options={reasonOptions}
                    placeholder="Select Reason…"
                    searchPlaceholder="Search reason…"
                    icon={HelpCircle}
                    error={Boolean(errors.maintenanceReasonId)}
                    disabled={submitting}
                  />
                  <FieldError msg={errors.maintenanceReasonId} />
                </div>

                {/* 3. Custom Priority Selection */}
                <div className="col-12 col-md-6" style={{ position: 'relative', zIndex: 50 }}>
                  <FieldLabel label="Priority Level" required />
                  <SearchableSelect
                    value={form.priority}
                    onChange={(val) => handleChange('priority', val)}
                    options={priorityDropdownOptions}
                    placeholder="Select Priority…"
                    icon={AlertTriangle}
                    searchable={false}
                    error={Boolean(errors.priority)}
                    disabled={submitting}
                  />
                  <FieldError msg={errors.priority} />
                </div>

                {/* 4. Target Resolution Date */}
                <div className="col-12 col-md-6" style={{ position: 'relative', zIndex: 20 }}>
                  <FieldLabel label="Target Resolution Date" optional />
                  <InputWrap icon={Calendar}>
                    <input
                      type="date"
                      className="pg-field-input"
                      value={form.targetDate}
                      onChange={(e) => handleChange('targetDate', e.target.value)}
                      disabled={submitting}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        width: '100%',
                      }}
                    />
                  </InputWrap>
                </div>

                {/* 5. Issue Description */}
                <div className="col-12">
                  <FieldLabel label="Issue Description & Notes" optional />
                  <InputWrap icon={FileText}>
                    <textarea
                      className="pg-field-input"
                      placeholder="Provide details about the issue (e.g. vinyl torn on right corner, structure bent, lighting faulty)…"
                      value={form.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                      disabled={submitting}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        resize: 'vertical',
                        minHeight: 70,
                        paddingTop: 8,
                        paddingBottom: 8,
                        fontFamily: 'inherit',
                        fontSize: 13,
                        width: '100%',
                      }}
                    />
                  </InputWrap>
                </div>

                {/* 6. Photo Section */}
                <div className="col-12">
                  <PhotoUploadSection
                    photos={photos}
                    onAddPhotos={handleAddPhotos}
                    onDeletePhoto={handleDeletePhoto}
                    disabled={submitting}
                    error={errors.photos}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: '1.5px solid #f0f0f8',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={handleCancelClick}
                  disabled={submitting}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 11,
                    background: '#f5f5fb',
                    border: '1.5px solid #e8e8f0',
                    cursor: 'pointer',
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#7878a0',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '10px 24px',
                    borderRadius: 11,
                    background: 'linear-gradient(135deg,#049edf,#6c63ff)',
                    color: '#fff',
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: 800,
                    fontSize: 13,
                    boxShadow: '0 4px 14px rgba(4,158,223,0.35)',
                    opacity: submitting ? 0.75 : 1,
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="pg-spin" /> Submitting…
                    </>
                  ) : (
                    <>
                      <Plus size={15} /> Create Request
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      {showConfirmSubmit && (
        <ConfirmDialog
          isOpen={true}
          title="Create Maintenance Request"
          message={`Are you sure you want to create a maintenance request for hoarding "${
            selectedHoarding?.hoardingCode || form.hoardingId
          }" with priority "${form.priority}"?`}
          confirmText="Yes, Create"
          cancelText="Review"
          variant="primary"
          onConfirm={handleConfirmedSubmit}
          onCancel={() => setShowConfirmSubmit(false)}
        />
      )}

      {/* Discard Confirmation Dialog */}
      {showConfirmCancel && (
        <ConfirmDialog
          isOpen={true}
          title="Discard Changes"
          message="You have unsaved details in this form. Are you sure you want to leave without creating the maintenance request?"
          confirmText="Discard & Close"
          cancelText="Keep Editing"
          variant="warning"
          onConfirm={() => {
            setShowConfirmCancel(false);
            onCancel();
          }}
          onCancel={() => setShowConfirmCancel(false)}
        />
      )}
    </div>,
    document.body
  );
}
