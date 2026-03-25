import React, { useState } from 'react';
import {
  UserCircle, Plus, Phone, Home, Globe,
  Building2, MapPin, Search, Users, RefreshCw,
  X, AlertCircle, Check, Edit2, Eye, ChevronDown,
  ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Filter
} from 'lucide-react';

const SAMPLE_OWNERS = [
  { id: 1,  name: 'Rajesh Mehta',    alternateName: 'R. Mehta',   address: '14, Navrangpura, Ahmedabad',       phone1: '+91 98765 43210', phone2: '+91 79001 12233', city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
  { id: 2,  name: 'Priya Shah',      alternateName: 'P. Shah',    address: '7, Satellite Road, Ahmedabad',     phone1: '+91 90000 11122', phone2: '+91 79002 33445', city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
  { id: 3,  name: 'Amit Patel',      alternateName: 'A. Patel',   address: '22, Maninagar, Ahmedabad',         phone1: '+91 99001 22334', phone2: '',                city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
  { id: 4,  name: 'Sneha Desai',     alternateName: 'S. Desai',   address: '5, Bodakdev, Ahmedabad',           phone1: '+91 97890 12345', phone2: '+91 79003 44556', city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
  { id: 5,  name: 'Kiran Joshi',     alternateName: 'K. Joshi',   address: '9, Paldi, Ahmedabad',              phone1: '+91 96543 21098', phone2: '',                city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
  { id: 6,  name: 'Dinesh Trivedi',  alternateName: 'D. Trivedi', address: '3, Vastrapur, Ahmedabad',          phone1: '+91 94567 89012', phone2: '+91 79004 55667', city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
  { id: 7,  name: 'Meena Kapoor',    alternateName: 'M. Kapoor',  address: '18, Gota, Ahmedabad',              phone1: '+91 93456 78901', phone2: '',                city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
  { id: 8,  name: 'Suresh Nair',     alternateName: 'S. Nair',    address: '11, Chandkheda, Ahmedabad',        phone1: '+91 92345 67890', phone2: '+91 79005 66778', city: 'Gandhinagar', district: 'Gandhinagar', country: 'India' },
  { id: 9,  name: 'Pooja Agarwal',   alternateName: 'P. Agarwal', address: '26, Thaltej, Ahmedabad',           phone1: '+91 91234 56789', phone2: '',                city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
  { id: 10, name: 'Vikram Singh',    alternateName: 'V. Singh',   address: '8, Science City Road, Ahmedabad', phone1: '+91 90123 45678', phone2: '+91 79006 77889', city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
  { id: 11, name: 'Anita Rao',       alternateName: 'A. Rao',     address: '33, Bopal, Ahmedabad',             phone1: '+91 89012 34567', phone2: '',                city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
  { id: 12, name: 'Harish Bhatt',    alternateName: 'H. Bhatt',   address: '4, Motera, Ahmedabad',             phone1: '+91 88901 23456', phone2: '+91 79007 88990', city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
  { id: 13, name: 'Reena Sharma',    alternateName: 'R. Sharma',  address: '15, Nikol, Ahmedabad',             phone1: '+91 87890 12345', phone2: '',                city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
  { id: 14, name: 'Mahesh Pandya',   alternateName: 'M. Pandya',  address: '6, Naroda, Ahmedabad',             phone1: '+91 86789 01234', phone2: '+91 79008 99001', city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
  { id: 15, name: 'Kavita Mehta',    alternateName: 'K. Mehta',   address: '29, Bapunagar, Ahmedabad',         phone1: '+91 85678 90123', phone2: '',                city: 'Ahmedabad',   district: 'Ahmedabad',   country: 'India' },
];

const EMPTY_FORM = { name: '', alternateName: '', address: '', phone1: '', phone2: '', city: '', district: '', country: '' };

const FIELDS = [
  { key: 'name',          label: 'Owner Name',             icon: UserCircle, placeholder: 'e.g. Rajesh Mehta', col: 6              },
  { key: 'alternateName', label: 'Alternate Contact Name', icon: Users,      placeholder: 'e.g. R. Mehta',     col: 6              },
  { key: 'address',       label: 'Owner Address',          icon: Home,       placeholder: 'Street / Area',     col: 12             },
  { key: 'phone1',        label: 'Phone 1',                icon: Phone,      placeholder: '+91 98765 43210',   col: 6              },
  { key: 'phone2',        label: 'Phone 2',                icon: Phone,      placeholder: '+91 79001 12233',   col: 6, optional: true },
  { key: 'city',          label: 'City',                   icon: Building2,  placeholder: 'e.g. Ahmedabad',    col: 6              },
  { key: 'district',      label: 'District',               icon: MapPin,     placeholder: 'e.g. Ahmedabad',    col: 6              },
  { key: 'country',       label: 'Country',                icon: Globe,      placeholder: 'e.g. India',        col: 12             },
];

const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

/* ═══════════════════════════════════════════
   MODAL
═══════════════════════════════════════════ */
function OwnerModal({ onClose, onSave, editData }) {
  const isEdit = !!editData;
  const [form, setForm]             = useState(isEdit ? { ...editData } : EMPTY_FORM);
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);

  const validate = () => {
    const e = {};
    FIELDS.forEach(({ key, optional }) => {
      if (optional) return;
      if (!form[key] || !form[key].trim()) e[key] = 'Required';
    });
    return e;
  };

  const handleChange = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 700));
    setSuccess(true);
    await new Promise(r => setTimeout(r, 750));
    onSave({ ...form, id: isEdit ? editData.id : Date.now() });
    onClose();
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1050,
        background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', animation: 'owOverlayIn 0.2s ease both',
        overflowY: 'auto',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '640px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 32px 80px rgba(0,0,0,0.18)',
        animation: 'owModalIn 0.28s cubic-bezier(0.22,1,0.36,1) both',
        margin: 'auto',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg,#e8f6fd,#ede9ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserCircle size={20} color="#049edf" />
            </div>
            <div>
              <h5 style={{ margin: 0, fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: '17px', color: '#1a1a2e' }}>
                {isEdit ? 'Edit Owner' : 'Add New Owner'}
              </h5>
              <p style={{ margin: 0, fontFamily: 'Nunito,sans-serif', fontSize: '12px', color: '#9090a8', fontWeight: 600 }}>
                {isEdit ? `Editing: ${editData.name}` : 'Fill in the details below'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f5f5fb', border: '1px solid #e8e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9090a8', transition: 'all 0.15s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f5f5fb'; e.currentTarget.style.color = '#9090a8'; }}>
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '22px 24px' }}>
          <div className="row g-3">
            {FIELDS.map(({ key, label, icon: Icon, placeholder, col, optional }) => (
              <div key={key} className={`col-12 col-sm-${col}`}>
                <label style={{ fontFamily: 'Nunito,sans-serif', fontSize: '11.5px', fontWeight: 800, color: '#4a5568', letterSpacing: '0.3px', marginBottom: '6px', display: 'block' }}>
                  {label} {optional
                    ? <span style={{ color: '#b0b0c8', fontWeight: 600 }}>(optional)</span>
                    : <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 13px', background: errors[key] ? 'rgba(239,68,68,0.03)' : '#f8f8fd', border: `1.5px solid ${errors[key] ? '#fca5a5' : '#e8e8f4'}`, borderRadius: '11px', transition: 'all 0.15s' }}
                  onFocusCapture={e => { if (!errors[key]) { e.currentTarget.style.borderColor = '#049edf'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(4,158,223,0.1)'; } }}
                  onBlurCapture={e => { if (!errors[key]) { e.currentTarget.style.borderColor = '#e8e8f4'; e.currentTarget.style.boxShadow = 'none'; } }}>
                  <Icon size={14} color={errors[key] ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                  <input
                    placeholder={placeholder} value={form[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'Nunito,sans-serif', fontSize: '13px', fontWeight: 600, color: '#1a1a2e', minWidth: 0 }}
                  />
                </div>
                {errors[key] && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontFamily: 'Nunito,sans-serif', fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>
                    <AlertCircle size={10} /> {errors[key]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px 22px', borderTop: '1px solid #f0f0f8', flexWrap: 'wrap' }}>
          <button onClick={onClose} disabled={submitting}
            style={{ padding: '10px 22px', borderRadius: '11px', background: '#f5f5fb', border: '1.5px solid #e8e8f0', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: '13px', color: '#7878a0' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 24px', borderRadius: '11px', background: 'linear-gradient(135deg,#049edf,#6c63ff)', color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: '13px', boxShadow: '0 4px 18px rgba(4,158,223,0.35)', opacity: submitting ? 0.85 : 1 }}>
            {success   ? <><Check size={14} /> {isEdit ? 'Saved!' : 'Added!'}</> :
             submitting ? <><RefreshCw size={13} style={{ animation: 'owSpin 0.8s linear infinite' }} /> Saving…</> :
                          <><Plus size={14} /> {isEdit ? 'Save Changes' : 'Add Owner'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sort indicator ─── */
function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: '5px', gap: '1px' }}>
      <ChevronUp   size={10} color={active && sortDir === 'asc'  ? '#049edf' : '#c0c0d8'} style={{ display: 'block' }} />
      <ChevronDown size={10} color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'} style={{ display: 'block', marginTop: '-4px' }} />
    </span>
  );
}

/* ─── Mobile Owner Card ─── */
function OwnerCard({ o, onEdit }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '16px', border: '1.5px solid #eeeefc',
      boxShadow: '0 2px 16px rgba(100,100,180,0.07)', padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '12px',
      animation: 'owFadeUp 0.35s ease both',
    }}>
      {/* Top: name + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: '15px', color: '#1a1a2e', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: '12px', color: '#049edf', fontWeight: 700 }}>{o.alternateName}</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button onClick={() => onEdit(o)} title="Edit"
            style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(4,158,223,0.08)', border: '1.5px solid rgba(4,158,223,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#049edf' }}>
            <Edit2 size={13} />
          </button>
          <button title="View"
            style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#049edf,#6c63ff)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <Eye size={13} />
          </button>
        </div>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f8f8fd', borderRadius: '12px', border: '1px solid #eeeefc' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontFamily: 'Nunito,sans-serif', fontSize: '12.5px', color: '#4a5568', fontWeight: 600 }}>
          <Home size={13} color="#c0c0d8" style={{ marginTop: '2px', flexShrink: 0 }} />
          <span>{o.address}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Nunito,sans-serif', fontSize: '12.5px', color: '#4a5568', fontWeight: 600 }}>
            <Phone size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.phone1}</span>
          </div>
          {o.phone2 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Nunito,sans-serif', fontSize: '12.5px', color: '#9090a8', fontWeight: 600 }}>
              <Phone size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.phone2}</span>
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Nunito,sans-serif', fontSize: '12.5px', color: '#4a5568', fontWeight: 600 }}>
          <Building2 size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
          <span>{o.city}{o.district !== o.city ? `, ${o.district}` : ''}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   OWNER PAGE
═══════════════════════════════════════════ */
export default function OwnerPage() {
  const [owners, setOwners]       = useState(SAMPLE_OWNERS);
  const [showModal, setShowModal] = useState(false);
  const [editOwner, setEditOwner] = useState(null);
  const [search, setSearch]       = useState('');
  const [sortKey, setSortKey]     = useState('name');
  const [sortDir, setSortDir]     = useState('asc');
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(12);

  const filtered = owners.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.city.toLowerCase().includes(search.toLowerCase()) ||
    o.phone1.includes(search) ||
    o.alternateName.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sortKey] || '').toString().toLowerCase();
    const bv = (b[sortKey] || '').toString().toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleAdd  = (o) => { setOwners(p => [...p, o]); setPage(1); };
  const handleSave = (o) => setOwners(p => p.map(x => x.id === o.id ? o : x));
  const handleEdit = (o) => { setEditOwner(o); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditOwner(null); };

  /* Desktop table columns */
  const COLS = [
    { key: 'name',    label: 'Owner Name',     w: '20%' },
    { key: 'address', label: 'Full Address',   w: '24%', tabletHide: true },
    { key: 'phone1',  label: 'Phone',          w: '16%' },
    { key: 'phone2',  label: 'Alt Phone',      w: '14%', tabletHide: true },
    { key: 'city',    label: 'City / District',w: '14%' },
    { key: '_action', label: 'Action',         w: '12%', noSort: true },
  ];

  const thBase = {
    padding: '12px 14px',
    fontFamily: 'Nunito,sans-serif',
    fontWeight: 800,
    fontSize: '12.5px',
    color: '#4a5568',
    background: '#f8f8fd',
    borderBottom: '1.5px solid #eeeefc',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  const tdBase = {
    padding: '12px 14px',
    fontFamily: 'Nunito,sans-serif',
    fontSize: '13px',
    color: '#3a3a5c',
    fontWeight: 600,
    verticalAlign: 'middle',
    borderBottom: '1px solid #f4f4fb',
    maxWidth: 0,
  };

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  return (
    <>
      <style>{`
        @keyframes owFadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes owModalIn   { from{opacity:0;transform:translateY(22px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes owOverlayIn { from{opacity:0} to{opacity:1} }
        @keyframes owSpin      { to{transform:rotate(360deg)} }
        .ow-page { animation: owFadeUp 0.38s ease both; }
        .ow-tr:hover td { background:#f5f5fd !important; }
        .ow-th-sort { cursor:pointer; transition:background 0.12s; }
        .ow-th-sort:hover { background:#eeeefb !important; }
        .ow-pg-btn { width:32px;height:32px;border-radius:8px;border:1.5px solid #e8e8f0;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:Nunito,sans-serif;font-weight:800;font-size:13px;color:#7878a0;transition:all 0.15s; }
        .ow-pg-btn:hover:not(:disabled) { border-color:#049edf;color:#049edf;background:rgba(4,158,223,0.06); }
        .ow-pg-btn.active { background:linear-gradient(135deg,#049edf,#6c63ff);color:#fff;border-color:transparent; }
        .ow-pg-btn:disabled { opacity:0.38;cursor:not-allowed; }

        /* Responsive visibility */
        .ow-tablet-hide { display:table-cell; }
        .ow-mobile-cards { display:none; }
        .ow-desktop-table { display:block; }

        @media (max-width: 900px) {
          .ow-tablet-hide { display:none !important; }
        }
        @media (max-width: 640px) {
          .ow-mobile-cards { display:flex !important; flex-direction:column; gap:12px; padding:14px; }
          .ow-desktop-table { display:none !important; }
          .ow-pg-btn { width:28px; height:28px; font-size:12px; }
          .ow-pagination-text { display:none; }
        }
        @media (max-width: 480px) {
          .ow-toolbar-inner { flex-direction:column; align-items:stretch !important; }
          .ow-search-box { max-width:100% !important; }
        }
      `}</style>

      <div className="ow-page">

        {/* Page Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 'clamp(20px,4vw,26px)', color: '#1a1a2e', margin: '0 0 3px' }}>Owners</h1>
            <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: '13.5px', color: '#9090a8', margin: 0, fontWeight: 600 }}>
              Manage all hoarding &amp; site <strong style={{ color: '#049edf' }}>owners</strong> in one place.
            </p>
          </div>
          <button
            onClick={() => { setEditOwner(null); setShowModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 20px', background: 'linear-gradient(135deg,#049edf,#6c63ff)', color: '#fff', border: 'none', borderRadius: '13px', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: '13px', boxShadow: '0 4px 18px rgba(4,158,223,0.35)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 26px rgba(4,158,223,0.46)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(4,158,223,0.35)'; }}>
            <Plus size={14} /> Add New Owner
          </button>
        </div>

        {/* Table / Card container */}
        <div style={{ background: '#fff', borderRadius: '18px', border: '1.5px solid #eeeefc', boxShadow: '0 2px 20px rgba(100,100,180,0.07)', overflow: 'hidden' }}>

          {/* Toolbar */}
          <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #f0f0f8' }}>
            <div className="ow-toolbar-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Nunito,sans-serif', fontSize: '13px', fontWeight: 700, color: '#7878a0', whiteSpace: 'nowrap' }}>
                <Users size={14} color="#9090a8" />
                <span><strong style={{ color: '#1a1a2e' }}>{filtered.length}</strong> owner{filtered.length !== 1 ? 's' : ''}</span>
              </div>
              <div
                className="ow-search-box"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#f8f8fd', border: '1.5px solid #e8e8f4', borderRadius: '11px', minWidth: '180px', maxWidth: '300px', flex: 1, transition: 'border-color 0.15s, box-shadow 0.15s' }}
                onFocusCapture={e => { e.currentTarget.style.borderColor = '#049edf'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(4,158,223,0.1)'; }}
                onBlurCapture={e => { e.currentTarget.style.borderColor = '#e8e8f4'; e.currentTarget.style.boxShadow = 'none'; }}>
                <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                <input
                  placeholder="Search by name, city, phone…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'Nunito,sans-serif', fontSize: '13px', fontWeight: 600, color: '#1a1a2e', minWidth: 0 }}
                />
                {search && <X size={12} color="#c0c0d8" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setSearch('')} />}
              </div>
            </div>
          </div>

          {/* ─── DESKTOP / TABLET TABLE ─── */}
          <div className="ow-desktop-table" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '520px' }}>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      style={{ ...thBase, width: col.w }}
                      className={[col.noSort ? '' : 'ow-th-sort', col.tabletHide ? 'ow-tablet-hide' : ''].join(' ').trim()}
                      onClick={() => !col.noSort && handleSort(col.key)}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {col.label}
                        {!col.noSort
                          ? <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                          : <Filter size={10} color="#d0d0e4" style={{ marginLeft: '5px' }} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} style={{ ...tdBase, textAlign: 'center', padding: '60px 20px', maxWidth: 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#b0b0c8' }}>
                        <UserCircle size={36} color="#d0d0e8" />
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: '14px' }}>No owners found</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(o => (
                  <tr key={o.id} className="ow-tr" style={{ transition: 'background 0.12s' }}>

                    {/* Name */}
                    <td style={{ ...tdBase, overflow: 'hidden' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px' }}>{o.name}</div>
                        <div style={{ fontSize: '11px', color: '#9090a8', fontWeight: 600 }}>{o.alternateName}</div>
                      </div>
                    </td>

                    {/* Address — hidden on tablet */}
                    <td className="ow-tablet-hide" style={{ ...tdBase, overflow: 'hidden' }}>
                      <span title={o.address} style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#4a5568' }}>{o.address}</span>
                    </td>

                    {/* Phone */}
                    <td style={tdBase}><span style={{ color: '#4a5568' }}>{o.phone1}</span></td>

                    {/* Alt Phone — hidden on tablet */}
                    <td className="ow-tablet-hide" style={tdBase}><span style={{ color: '#9090a8' }}>{o.phone2 || '—'}</span></td>

                    {/* City */}
                    <td style={tdBase}>
                      <span style={{ color: '#4a5568' }}>{o.city}</span>
                      {o.district !== o.city && <span style={{ color: '#b0b0c8', fontSize: '11px' }}>, {o.district}</span>}
                    </td>

                    {/* Action */}
                    <td style={tdBase}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleEdit(o)} title="Edit"
                          style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(4,158,223,0.08)', border: '1.5px solid rgba(4,158,223,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#049edf', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(4,158,223,0.18)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(4,158,223,0.08)'}>
                          <Edit2 size={13} />
                        </button>
                        <button title="View"
                          style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg,#049edf,#6c63ff)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', boxShadow: '0 2px 8px rgba(4,158,223,0.28)', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 14px rgba(4,158,223,0.38)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(4,158,223,0.28)'; }}>
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── MOBILE CARDS ─── */}
          <div className="ow-mobile-cards">
            {paginated.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#b0b0c8', padding: '40px 20px' }}>
                <UserCircle size={36} color="#d0d0e8" />
                <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: '14px' }}>No owners found</span>
              </div>
            ) : paginated.map(o => (
              <OwnerCard key={o.id} o={o} onEdit={handleEdit} />
            ))}
          </div>

          {/* Pagination */}
          <div style={{ padding: '12px 18px', borderTop: '1.5px solid #f0f0f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <button className="ow-pg-btn" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
              <button className="ow-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
              {pageNums.map((p, i) =>
                p === '…'
                  ? <span key={`e${i}`} style={{ padding: '0 3px', color: '#b0b0c8', fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: '13px' }}>…</span>
                  : <button key={p} className={`ow-pg-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              )}
              <button className="ow-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
              <button className="ow-pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={13} /></button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                style={{ padding: '5px 26px 5px 10px', borderRadius: '9px', border: '1.5px solid #e8e8f0', background: '#fff url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239090a8\' stroke-width=\'2.5\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E") no-repeat right 8px center', fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: '13px', color: '#4a5568', cursor: 'pointer', outline: 'none', appearance: 'none' }}>
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="ow-pagination-text" style={{ fontFamily: 'Nunito,sans-serif', fontSize: '12.5px', color: '#9090a8', fontWeight: 600, whiteSpace: 'nowrap' }}>Items per page</span>
              <span className="ow-pagination-text" style={{ fontFamily: 'Nunito,sans-serif', fontSize: '12.5px', color: '#9090a8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {page} of {totalPages} pages ({sorted.length} items)
              </span>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <OwnerModal onClose={closeModal} onSave={editOwner ? handleSave : handleAdd} editData={editOwner} />
      )}
    </>
  );
}