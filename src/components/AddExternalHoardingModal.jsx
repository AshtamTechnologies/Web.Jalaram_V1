import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Plus, Loader2, AlertCircle, Check, Building2, MapPin,
  Layers, Maximize2, ShieldCheck, IndianRupee, Calendar, Hash,
  Search, ChevronDown, CheckCircle
} from 'lucide-react';
import { apiService } from '../api/api';
import '../Pages/Common1.css';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const MATERIAL_OPTIONS = ['Terrace Structure', 'Pillar Structure', 'Channel Set', 'Wooden Set'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function parseArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object' && Array.isArray(val.$values)) return val.$values;
  return [];
}

function FieldLabel({ label, required }) {
  return (
    <label className="pg-field-label">
      {label}
      {required && <span className="pg-field-label__required"> *</span>}
    </label>
  );
}

function InputWrap({ error, icon: Icon, children }) {
  return (
    <div className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
      {Icon && <Icon size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />}
      {children}
    </div>
  );
}

function FieldError({ msg }) {
  return msg ? (
    <div className="pg-field-error">
      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: '1px' }} />
      <span>{msg}</span>
    </div>
  ) : null;
}

/* ─────────────────────────────────────────
   PORTAL COMBO DROPDOWN
───────────────────────────────────────── */
function PortalDropdown({
  value,
  onChange,
  onBlur,
  hasError,
  placeholder,
  icon: Icon,
  options = [],
  searchable = false,
  emptyText = 'No options',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelStyle, setPanelStyle] = useState({ position: 'fixed', top: 0, left: 0, width: 0, zIndex: 999999 });

  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  const filtered = searchable
    ? options.filter(o =>
        (o.label || '').toLowerCase().includes(query.toLowerCase()) ||
        (o.sub && (o.sub || '').toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const reposition = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const panelH = panelRef.current?.offsetHeight || 240;
      const flipUp = (window.innerHeight - r.bottom) < panelH + 8 && r.top > panelH + 8;
      setPanelStyle({
        position: 'fixed',
        top: flipUp ? Math.max(8, r.top - panelH - 4) : r.bottom + 4,
        left: r.left,
        width: r.width,
        zIndex: 999999,
      });
    };

    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const inWrap = wrapRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inWrap && !inPanel) {
        setOpen(false);
        setQuery('');
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onBlur]);

  const openDropdown = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => {
      if (searchable) inputRef.current?.focus();
    }, 0);
  };

  const select = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
    onBlur?.();
  };

  const panel = open ? ReactDOM.createPortal(
    <div ref={panelRef} style={panelStyle}>
      <div className="pg-combo-panel" style={{ position: 'static', maxHeight: 240, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {searchable && (
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
        )}
        <div className="pg-combo-list" style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="pg-combo-empty">{emptyText}</div>
          ) : filtered.map(opt => (
            <div
              key={opt.value}
              className={`pg-combo-option${String(opt.value) === String(value) ? ' pg-combo-option--active' : ''}`}
              onClick={() => select(opt)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="pg-combo-option__name">{opt.label}</span>
                {opt.sub && <div className="pg-combo-option__id" style={{ fontSize: 11, color: '#9090a8', marginTop: 1 }}>{opt.sub}</div>}
              </div>
              {String(opt.value) === String(value) && (
                <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={openDropdown}
      >
        {Icon && <Icon size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />}
        <span className={`pg-combo-display${!selected ? ' pg-combo-display--placeholder' : ''}`}>
          {selected ? (
            <>
              {selected.label}
              {selected.sub && (
                <span className="pg-combo-option__id" style={{ marginLeft: 6 }}>{selected.sub}</span>
              )}
            </>
          ) : placeholder}
        </span>
        {selected ? (
          <X size={13} className="pg-combo-clear" onClick={clear} />
        ) : (
          <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
        )}
      </div>
      {panel}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT: AddExternalHoardingModal
───────────────────────────────────────── */
export default function AddExternalHoardingModal({
  onClose,
  onSuccess,
  showToast,
  allHoardings = [],
}) {
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  // Dropdown options
  const [vendors, setVendors] = useState([]);
  const [sites, setSites] = useState([]);
  const [hoardingTypes, setHoardingTypes] = useState([]);
  const [existingHoardings, setExistingHoardings] = useState(allHoardings || []);

  // Form state
  const [vendorID, setVendorID] = useState('');
  const [form, setForm] = useState({
    hoardingCode: '',
    effdt: new Date().toISOString().split('T')[0],
    siteID: '',
    material: '',
    hoardingType: '',
    status: 'Active',
    monthlyRent: '',
    width: '',
    height: '',
  });
  const [errors, setErrors] = useState({});

  // Fetch lookups: Vendors, Sites, Hoarding Types, and Existing Hoardings
  useEffect(() => {
    let active = true;
    const fetchLookups = async () => {
      setLoadingLookups(true);
      try {
        const [vRes, sRes, tRes, hRes, extRes] = await Promise.all([
          apiService.getAllVendors().catch(err => {
            console.error('Failed to load vendors:', err);
            return [];
          }),
          apiService.getAllSites().catch(err => {
            console.error('Failed to load sites:', err);
            return [];
          }),
          apiService.getAllHoardingTypes().catch(err => {
            console.error('Failed to load types:', err);
            return [];
          }),
          apiService.getAllHoardings().catch(() => []),
          apiService.getAllExternalHoardings().catch(() => []),
        ]);

        if (active) {
          const vList = parseArray(vRes?.data ?? vRes);
          const sList = parseArray(sRes?.data ?? sRes);
          const tList = parseArray(tRes?.data ?? tRes);
          const hList = parseArray(hRes?.data ?? hRes);
          const extList = parseArray(extRes?.data ?? extRes);

          setVendors(vList.filter(v => (v.isActive ?? v.is_Active ?? true)));
          setSites(sList);
          setHoardingTypes(tList);

          const combinedHoardings = [
            ...(allHoardings || []),
            ...hList,
            ...extList,
          ];
          setExistingHoardings(combinedHoardings);
        }
      } catch (err) {
        if (active) {
          setApiError('Failed to load form dropdown options. Please refresh.');
        }
      } finally {
        if (active) setLoadingLookups(false);
      }
    };

    fetchLookups();
    return () => { active = false; };
  }, [allHoardings]);

  const handleHoardingCodeChange = (val) => {
    setForm(prev => ({ ...prev, hoardingCode: val }));
    if (!val.trim()) {
      setErrors(prev => ({ ...prev, hoardingCode: 'Hoarding code is required' }));
      return;
    }
    const duplicate = existingHoardings.some(
      h => (h.hoardingCode || '').trim().toLowerCase() === val.trim().toLowerCase()
    );
    setErrors(prev => ({
      ...prev,
      hoardingCode: duplicate
        ? 'This hoarding code is already registered. Please choose a different name.'
        : ''
    }));
  };

  const handleChange = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleVendorChange = (val) => {
    setVendorID(val ? Number(val) : '');
    if (errors.vendorID) {
      setErrors(prev => ({ ...prev, vendorID: '' }));
    }
  };

  const validate = () => {
    const e = {};
    if (!vendorID) e.vendorID = 'Vendor is required';
    if (!form.hoardingCode.trim()) {
      e.hoardingCode = 'Hoarding code is required';
    } else {
      const duplicate = existingHoardings.some(
        h => (h.hoardingCode || '').trim().toLowerCase() === form.hoardingCode.trim().toLowerCase()
      );
      if (duplicate) {
        e.hoardingCode = 'This hoarding code is already registered. Please choose a different name.';
      }
    }
    if (!form.effdt) e.effdt = 'Effective date is required';
    if (!form.siteID) e.siteID = 'Site is required';
    if (!form.material) e.material = 'Material is required';
    if (!form.hoardingType) e.hoardingType = 'Hoarding type is required';
    if (!form.status) e.status = 'Status is required';
    if (form.monthlyRent === '' || form.monthlyRent == null) e.monthlyRent = 'Monthly rent is required';
    if (form.width === '' || form.width == null) e.width = 'Width is required';
    else if (Number(form.width) <= 0) e.width = 'Must be greater than 0';
    if (form.height === '' || form.height == null) e.height = 'Height is required';
    else if (Number(form.height) <= 0) e.height = 'Must be greater than 0';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    setApiError('');

    let newHoardingID = null;
    let createdHoardingResponse = null;

    try {
      // Step a: Create the new hoarding
      createdHoardingResponse = await apiService.createHoarding({
        hoardingCode: form.hoardingCode.trim(),
        effdt: form.effdt,
        material: form.material,
        hoardingType: Number(form.hoardingType),
        status: form.status,
        monthlyRent: Number(form.monthlyRent),
        width: Math.floor(Number(form.width)),
        height: Math.floor(Number(form.height)),
        siteID: Number(form.siteID),
        isExternal: true,
      });

      newHoardingID = createdHoardingResponse?.hoardingID ?? createdHoardingResponse?.id ?? createdHoardingResponse?.data?.hoardingID ?? createdHoardingResponse?.data?.id ?? null;

      if (!newHoardingID) {
        throw new Error('Hoarding was created but no Hoarding ID was returned by the server.');
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to create external hoarding.';
      setApiError(`Hoarding Creation Failed: ${errMsg}`);
      if (showToast) showToast(errMsg, 'error');
      setSaving(false);
      return;
    }

    // Step b: Fetch selected vendor's current full record
    let vendorRecord = null;
    try {
      const vRes = await apiService.getVendorById(vendorID);
      vendorRecord = vRes?.data ?? vRes;
      if (!vendorRecord) {
        throw new Error('Vendor record not found.');
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to fetch vendor record.';
      setApiError(`Hoarding created successfully (ID: ${newHoardingID}), but fetching vendor to map hoarding failed: ${errMsg}`);
      if (showToast) {
        showToast(`Hoarding "${form.hoardingCode}" created, but vendor lookup failed. Please map manually in Vendor page.`, 'error');
      }
      setSaving(false);
      return;
    }

    // Step c & d: Update hoardingId array and send PUT request with full object
    try {
      const rawIds = vendorRecord.hoardingId ?? vendorRecord.HoardingId ?? vendorRecord.hoardingID ?? vendorRecord.hoarding_Id ?? [];
      const currentIds = parseArray(rawIds).map(Number);
      const updatedIds = currentIds.includes(Number(newHoardingID))
        ? currentIds
        : [...currentIds, Number(newHoardingID)];

      const updatedVendorPayload = {
        ...vendorRecord,
        hoardingId: updatedIds,
      };

      await apiService.updateVendor(updatedVendorPayload);

      // Step e: All succeeded!
      if (showToast) {
        showToast(`External Hoarding "${form.hoardingCode}" created and mapped to vendor successfully!`, 'success');
      }

      if (onSuccess) {
        onSuccess({
          hoardingID: Number(newHoardingID),
          hoardingCode: form.hoardingCode.trim(),
          effdt: form.effdt,
          material: form.material,
          hoardingType: Number(form.hoardingType),
          status: form.status,
          monthlyRent: Number(form.monthlyRent),
          width: Number(form.width),
          height: Number(form.height),
          siteID: Number(form.siteID),
          isExternal: true,
        }, vendorID);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to update vendor mapping.';
      setApiError(`Hoarding created (ID: ${newHoardingID}), but mapping to vendor failed: ${errMsg}. Please map this hoarding on the Vendor page.`);
      if (showToast) {
        showToast(`Hoarding "${form.hoardingCode}" created, but vendor mapping failed: ${errMsg}`, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const vendorOptions = vendors.map(v => ({
    value: v.vendorID ?? v.vendor_ID,
    label: v.vendorName ?? v.vendor_Name,
    sub: [v.city, v.mobileNo ?? v.mobile_No].filter(Boolean).join(' · '),
  }));

  const siteOptions = sites.map(s => ({
    value: s.siteID,
    label: s.addressLine1 || s.siteCode || `Site #${s.siteID}`,
    sub: [s.city, s.district, s.state].filter(Boolean).join(', '),
  }));

  const materialOptions = MATERIAL_OPTIONS.map(m => ({ value: m, label: m }));

  const typeOptions = hoardingTypes.map(t => ({
    value: t.hoardingType,
    label: t.typeName || `Type #${t.hoardingType}`,
  }));

  const statusOptions = STATUS_OPTIONS.map(s => ({ value: s, label: s }));

  return ReactDOM.createPortal(
    <div
      className="pg-overlay"
      style={{
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      // onClick={onClose}
    >
      <div
        className="pg-modal"
        style={{
          maxWidth: 680,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          borderRadius: 20,
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          background: '#fff',
          animation: 'modalIn 0.22s cubic-bezier(0.22,1,0.36,1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pg-modal__head" style={{ flexShrink: 0, padding: '16px 24px', borderBottom: '1px solid #f0f0f8' }}>
          <div className="pg-modal__head-left">
            <div
              className="pg-modal__icon-wrap"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(4,158,223,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={22} color="#049edf" />
            </div>
            <div>
              <h5 className="pg-modal__title" style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
                Add New External Hoarding
              </h5>
              <p className="pg-modal__subtitle" style={{ fontSize: 12.5, color: '#7878a0', margin: '2px 0 0' }}>
                Create hoarding specifications and map to vendor
              </p>
            </div>
          </div>
          <button
            className="pg-modal__close"
            onClick={onClose}
            disabled={saving}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '20px 24px' }}>
            {apiError && (
              <div
                className="pg-field-error hd-api-error mb-3"
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#dc2626',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ flex: 1 }}>{apiError}</span>
              </div>
            )}

            {loadingLookups ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', gap: 10 }}>
                <Loader2 size={24} className="pg-spin" color="#049edf" />
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13.5, color: '#9090a8', fontWeight: 600 }}>
                  Loading options…
                </span>
              </div>
            ) : (
              <div className="row g-3">
                {/* Vendor selection */}
                <div className="col-12">
                  <FieldLabel label="Map to Vendor" required />
                  <PortalDropdown
                    value={vendorID}
                    onChange={handleVendorChange}
                    hasError={!!errors.vendorID}
                    placeholder="Select vendor to assign this hoarding…"
                    icon={Building2}
                    options={vendorOptions}
                    searchable
                    emptyText="No vendors match"
                  />
                  <FieldError msg={errors.vendorID} />
                </div>

                {/* Hoarding Code */}
                <div className="col-12 col-md-6">
                  <FieldLabel label="Hoarding Code" required />
                  <InputWrap error={errors.hoardingCode} icon={Hash}>
                    <input
                      className="pg-field-input"
                      placeholder="e.g. AMD-EXT-101"
                      value={form.hoardingCode}
                      onChange={e => handleHoardingCodeChange(e.target.value)}
                    />
                  </InputWrap>
                  <FieldError msg={errors.hoardingCode} />
                </div>

                {/* Effective Date */}
                <div className="col-12 col-md-6">
                  <FieldLabel label="Effective Date" required />
                  <InputWrap error={errors.effdt} icon={Calendar}>
                    <input
                      className="pg-field-input"
                      type="date"
                      value={form.effdt}
                      onChange={e => handleChange('effdt', e.target.value)}
                    />
                  </InputWrap>
                  <FieldError msg={errors.effdt} />
                </div>

                {/* Site */}
                <div className="col-12">
                  <FieldLabel label="Site Location" required />
                  <PortalDropdown
                    value={form.siteID}
                    onChange={v => handleChange('siteID', Number(v))}
                    hasError={!!errors.siteID}
                    placeholder="Select site…"
                    icon={MapPin}
                    options={siteOptions}
                    searchable
                    emptyText="No sites match"
                  />
                  <FieldError msg={errors.siteID} />
                </div>

                {/* Material */}
                <div className="col-12 col-md-6">
                  <FieldLabel label="Material" required />
                  <PortalDropdown
                    value={form.material}
                    onChange={v => handleChange('material', v)}
                    hasError={!!errors.material}
                    placeholder="Select material…"
                    icon={Layers}
                    options={materialOptions}
                  />
                  <FieldError msg={errors.material} />
                </div>

                {/* Hoarding Type */}
                <div className="col-12 col-md-6">
                  <FieldLabel label="Hoarding Type" required />
                  <PortalDropdown
                    value={form.hoardingType}
                    onChange={v => handleChange('hoardingType', Number(v))}
                    hasError={!!errors.hoardingType}
                    placeholder="Select type…"
                    icon={Maximize2}
                    options={typeOptions}
                    searchable
                    emptyText="No types match"
                  />
                  <FieldError msg={errors.hoardingType} />
                </div>

                {/* Monthly Rent */}
                <div className="col-12 col-md-4">
                  <FieldLabel label="Monthly Rent (₹)" required />
                  <InputWrap error={errors.monthlyRent} icon={IndianRupee}>
                    <input
                      className="pg-field-input"
                      type="number"
                      min="0"
                      placeholder="e.g. 25000"
                      value={form.monthlyRent}
                      onChange={e => handleChange('monthlyRent', e.target.value)}
                    />
                  </InputWrap>
                  <FieldError msg={errors.monthlyRent} />
                </div>

                {/* Width */}
                <div className="col-12 col-md-4">
                  <FieldLabel label="Width (ft)" required />
                  <InputWrap error={errors.width}>
                    <input
                      className="pg-field-input"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 20"
                      value={form.width}
                      onChange={e => handleChange('width', e.target.value === '' ? '' : Math.floor(Number(e.target.value)))}
                    />
                  </InputWrap>
                  <FieldError msg={errors.width} />
                </div>

                {/* Height */}
                <div className="col-12 col-md-4">
                  <FieldLabel label="Height (ft)" required />
                  <InputWrap error={errors.height}>
                    <input
                      className="pg-field-input"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 10"
                      value={form.height}
                      onChange={e => handleChange('height', e.target.value === '' ? '' : Math.floor(Number(e.target.value)))}
                    />
                  </InputWrap>
                  <FieldError msg={errors.height} />
                </div>

                {/* Area and Status */}
                <div className="col-12 col-md-6">
                  <FieldLabel label="Total Area" />
                  <InputWrap>
                    <input
                      className="pg-field-input"
                      readOnly
                      value={form.width && form.height ? `${Number(form.width) * Number(form.height)} sq ft` : '—'}
                      style={{ color: '#049edf', fontWeight: 700, cursor: 'not-allowed', background: '#f8fafc' }}
                    />
                  </InputWrap>
                </div>

                <div className="col-12 col-md-6">
                  <FieldLabel label="Status" required />
                  <PortalDropdown
                    value={form.status}
                    onChange={v => handleChange('status', v)}
                    hasError={!!errors.status}
                    placeholder="Select status…"
                    icon={ShieldCheck}
                    options={statusOptions}
                  />
                  <FieldError msg={errors.status} />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="pg-modal__foot"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 12,
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
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="pg-btn-save"
              disabled={saving || loadingLookups}
              style={{
                background: 'linear-gradient(135deg,#049edf,#6c63ff)',
                color: '#fff',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 20px',
                borderRadius: 10,
                boxShadow: '0 3px 12px rgba(4,158,223,0.25)',
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="pg-spin" /> Saving & Mapping…
                </>
              ) : (
                <>
                  <Plus size={14} /> Save Hoarding
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
