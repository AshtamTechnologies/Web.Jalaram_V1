import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Plus, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { apiService } from '../api/api';
import './Common1.css';

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const ROLE_OPTIONS = ['Admin', 'Supervisor', 'Worker'];

const INITIAL_FORM = {
  firstName:    '',
  lastName:     '',
  phone1:       '',
  phone2:       '',
  email:        '',
  addressLine1: '',
  addressLine2: '',
  addressLine3: '',
  city:         '',
  district:     '',
  country:      'India',
  role:         '',
};

const FIELDS = [
  { key: 'firstName',    label: 'First Name',     placeholder: 'e.g. Ramesh',              required: true,  type: 'text',    col: 6 },
  { key: 'lastName',     label: 'Last Name',      placeholder: 'e.g. Patel',               required: true,  type: 'text',    col: 6 },
  { key: 'phone1',       label: 'Phone 1',        placeholder: 'e.g. 9876543210',          required: true,  type: 'tel',     col: 6 },
  { key: 'phone2',       label: 'Phone 2',        placeholder: 'e.g. 9876543211',          required: false, type: 'tel',     col: 6 },
  { key: 'email',        label: 'Email',          placeholder: 'e.g. ramesh@example.com',  required: true,  type: 'email',   col: 12 },
  { key: 'addressLine1', label: 'Address Line 1', placeholder: 'Street / Building name',   required: true,  type: 'address', col: 12 },
  { key: 'addressLine2', label: 'Address Line 2', placeholder: 'Area / Locality',          required: false, type: 'address', col: 12 },
  { key: 'addressLine3', label: 'Address Line 3', placeholder: 'Landmark',                 required: false, type: 'address', col: 12 },
  { key: 'city',         label: 'City',           placeholder: 'e.g. Ahmedabad',           required: true,  type: 'text',    col: 6 },
  { key: 'district',     label: 'District',       placeholder: 'e.g. Ahmedabad',           required: true,  type: 'text',    col: 6 },
  { key: 'country',      label: 'Country',        placeholder: 'India',                    required: true,  type: 'text',    col: 6, readOnly: true },
  { key: 'role',         label: 'Role',           placeholder: 'Select role…',             required: true,  type: 'select',  col: 6, options: ROLE_OPTIONS },
];

/* ═══════════════════════════════════════════
   VALIDATION
═══════════════════════════════════════════ */
const ADDRESS_REGEX = /^[\w\s,.\-/'&#()]{1,200}$/;
const TEXT_REGEX    = /^[a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s.\-]{0,99}$/;
const EMAIL_REGEX   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX   = /^\d{10}$/;

function validateField(key, value) {
  const field = FIELDS.find(f => f.key === key);
  if (!field) return '';
  const { required, type } = field;
  const trimmed = (value || '').trim();

  if (required && !trimmed) return 'This field is required';
  if (!trimmed) return '';

  if (type === 'select')  return '';   // dropdown — required check above is enough
  if (type === 'address' && !ADDRESS_REGEX.test(trimmed))
    return "Only letters, digits, spaces and , . - / ' & # ( ) are allowed";
  if (type === 'text' && !TEXT_REGEX.test(trimmed))
    return 'Only letters, spaces, hyphens and dots are allowed';
  if (type === 'email' && !EMAIL_REGEX.test(trimmed))
    return 'Enter a valid email address';
  if (type === 'tel' && !PHONE_REGEX.test(trimmed))
    return 'Enter a valid 10-digit phone number';
  return '';
}

/* ═══════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════ */
export default function Registration() {
  const [form,       setForm]       = useState(INITIAL_FORM);
  const [errors,     setErrors]     = useState({});
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [apiError,   setApiError]   = useState('');

  /* ── Field change / blur ── */
  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    setApiError('');
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: validateField(key, value) }));
  };

  const handleBlur = (key) => {
    setErrors(prev => ({ ...prev, [key]: validateField(key, form[key]) }));
  };

  /* ── Run all validations ── */
  const runValidate = (data) => {
    const errs = {};
    FIELDS.forEach(({ key }) => {
      const e = validateField(key, data[key]);
      if (e) errs[key] = e;
    });
    return errs;
  };

  /* ── Submit — calls real API ── */
  const handleSubmit = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    const validationErrors = runValidate(form);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setSubmitting(true);
    setApiError('');
    try {
      await apiService.registerUser(form);
      setSaved(true);
      resetForm(false); // keep modal open to show success
    } catch (err) {
      setApiError(
        err?.response?.data?.message ||
        err?.response?.data?.title   ||
        err?.message                 ||
        'Registration failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Reset ── */
  const resetForm = (clearSaved = true) => {
    setForm(INITIAL_FORM);
    setErrors({});
    if (clearSaved) setSaved(false);
    setApiError('');
  };

  /* ── Close modal ── */
  const closeModal = () => {
    setShowModal(false);
    setSaved(false);
    setApiError('');
    resetForm();
  };

  /* ════════════════ RENDER ════════════════ */
  return (
    <div className="pg-page registration-page">
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Registration</h1>
          <p className="pg-header__subtitle">Register new users for the system.</p>
        </div>
        <button type="button" className="pg-btn-add" onClick={() => setShowModal(true)}>
          <Plus size={14}/> Add Registration
        </button>
      </div>

      {showModal && ReactDOM.createPortal(
        <div className="pg-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="pg-modal">

            {/* Header */}
            <div className="pg-modal__head">
              <div className="pg-modal__head-left">
                <div className="pg-modal__icon-wrap"><Plus size={20} color="#049edf"/></div>
                <div>
                  <h5 className="pg-modal__title">Add Registration</h5>
                  <p className="pg-modal__subtitle">Fill in the details and save.</p>
                </div>
              </div>
              <button className="pg-modal__close" onClick={closeModal}><X size={15}/></button>
            </div>

            {/* Body */}
            <div className="pg-modal__body">

              {/* Success banner */}
              {saved && (
                <div style={{ display:'flex',alignItems:'center',gap:9,padding:'12px 14px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,marginBottom:16,fontFamily:'Nunito,sans-serif',fontSize:13,fontWeight:700,color:'#16a34a' }}>
                  <CheckCircle2 size={16}/>
                  User registered successfully!
                </div>
              )}

              {/* API error banner */}
              {apiError && (
                <div style={{ display:'flex',alignItems:'center',gap:9,padding:'12px 14px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,marginBottom:16,fontFamily:'Nunito,sans-serif',fontSize:13,fontWeight:700,color:'#dc2626' }}>
                  <AlertCircle size={16}/>
                  {apiError}
                </div>
              )}

              <form className="registration-form" onSubmit={handleSubmit} noValidate>
                <div className="row g-3">
                  {FIELDS.map(({ key, label, placeholder, required, type, col, readOnly, options }) => {
                    const hasErr = !!errors[key];
                    return (
                      <div key={key} className={`col-12 col-sm-${col}`}>
                        <label className="pg-field-label">
                          {label}{' '}
                          {required
                            ? <span className="pg-field-label__required">*</span>
                            : <span className="pg-field-label__optional">(optional)</span>}
                        </label>

                        {type === 'select' ? (
                          /* ── Role dropdown ── */
                          <>
                            <div className={`pg-field-wrap ${hasErr ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                              <select
                                className="pg-field-input"
                                value={form[key]}
                                onChange={e => handleChange(key, e.target.value)}
                                onBlur={() => handleBlur(key)}
                                style={{
                                  cursor: 'pointer',
                                  appearance: 'none',
                                  WebkitAppearance: 'none',
                                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239090a8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'right 12px center',
                                  paddingRight: 32,
                                  color: form[key] ? '#1a1a2e' : '#b0b0c8',
                                }}
                              >
                                <option value="">{placeholder}</option>
                                {options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                            {hasErr && (
                              <div className="pg-field-error">
                                <AlertCircle size={11} style={{ flexShrink:0, marginTop:1 }}/>
                                <span>{errors[key]}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          /* ── Regular input ── */
                          <>
                            <div className={`pg-field-wrap ${hasErr ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                              <input
                                type={type || 'text'}
                                placeholder={placeholder}
                                value={form[key]}
                                readOnly={readOnly}
                                className={`pg-field-input${readOnly ? ' pg-field-input--readonly' : ''}`}
                                onChange={e => handleChange(key, e.target.value)}
                                onBlur={() => handleBlur(key)}
                              />
                            </div>
                            {hasErr && (
                              <div className="pg-field-error">
                                <AlertCircle size={11} style={{ flexShrink:0, marginTop:1 }}/>
                                <span>{errors[key]}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="pg-form__note" style={{ marginTop:16 }}>
                  <span className="pg-field-label__required">*</span> Required fields &nbsp;·&nbsp; Optional fields may be left blank.
                </p>
              </form>
            </div>

            {/* Footer */}
            <div className="pg-modal__foot">
              <button type="button" className="pg-btn-cancel" onClick={() => resetForm()} disabled={submitting}>
                Reset
              </button>
              <button type="button" className="pg-btn-save" onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? <><Loader2 size={14} className="pg-spin"/> Saving…</>
                  : saved
                    ? <><CheckCircle2 size={14}/> Registered!</>
                    : 'Save Registration'}
              </button>
            </div>

          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}