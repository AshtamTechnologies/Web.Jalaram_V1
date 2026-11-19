import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Wrench,
  Plus,
  Search,
  RefreshCw,
  Eye,
  AlertCircle,
  Calendar,
  Layers,
  User,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Loader2,
  X,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  FileText,
} from 'lucide-react';
import { apiService } from '../../api/api';
import StatusBadge from '../../components/hoardingMaintenance/StatusBadge';
import PriorityBadge from '../../components/hoardingMaintenance/PriorityBadge';
import SearchableSelect from '../../components/hoardingMaintenance/SearchableSelect';
import MaintenanceReportModal from '../../components/hoardingMaintenance/MaintenanceReportModal';
import {
  STATUS_OPTIONS,
  STATUS_CONFIG,
  PRIORITY_OPTIONS,
  PRIORITY_CONFIG,
} from '../../constants/maintenanceConstants';
import { useResizableColumns } from '../../hooks/useResizableColumns';
import '../Common1.css';

const PAGE_SIZE_OPTIONS = [10, 12, 15, 20, 50];

function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span className="pg-sort-icon">
      <ChevronUp
        size={10}
        color={active && sortDir === 'asc' ? '#049edf' : '#c0c0d8'}
        className="pg-sort-icon__up"
        style={{ display: 'block', marginBottom: -2 }}
      />
      <ChevronDown
        size={10}
        color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'}
        className="pg-sort-icon__down"
        style={{ display: 'block' }}
      />
    </span>
  );
}

export default function MaintenanceList({
  onView,
  onCreate,
  canCreate = true,
  refreshTrigger = 0,
  changeTab,
}) {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [sortKey, setSortKey] = useState('maintenanceID');
  const [sortDir, setSortDir] = useState('desc');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  // Determine admin role
  const storedData = (() => {
    try {
      return JSON.parse(localStorage.getItem('userData') || '{}');
    } catch {
      return {};
    }
  })();
  const roleId = Number(localStorage.getItem('roleId') || storedData.roleId || storedData.role_Id || 0);
  const currentUserRole = (storedData.role || localStorage.getItem('userRole') || '').toLowerCase();
  const isAdmin = currentUserRole === 'admin' || storedData.isAdmin === true || roleId === 1;

  const handleHoardingClick = (e, m) => {
    if (!isAdmin) return;
    e.stopPropagation();
    sessionStorage.setItem('hoarding_return_tab', 'hoarding-maintenance');
    sessionStorage.setItem('hoarding_return_maint_view', 'list');
    sessionStorage.setItem('open_hoarding_code', m.hoardingCode);
    if (m.hoardingID) sessionStorage.setItem('open_hoarding_id', String(m.hoardingID));
    if (changeTab) {
      changeTab('new-hoarding');
    } else {
      sessionStorage.setItem('dashTab', 'new-hoarding');
      window.location.reload();
    }
  };

  // Dropdowns lookup data
  const [hoardings, setHoardings] = useState([]);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [hoardingFilter, setHoardingFilter] = useState('');

  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => {
    if (!loading) setTableReady(true);
  }, [loading]);

  useResizableColumns(tableRef, tableReady, [70, 140, 180, 110, 120, 130, 120, 110, 80]);

  // Load hoardings once for filter dropdown
  useEffect(() => {
    let active = true;
    apiService
      .getHoardingAddressMap()
      .then((data) => {
        if (!active) return;
        const list = data?.uniqueHoardings || [];
        setHoardings(list);
      })
      .catch((err) => console.warn('Failed to load hoardings for filter:', err));
    return () => {
      active = false;
    };
  }, []);

  // Fetch Maintenance List
  const fetchList = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        const data = await apiService.getHoardingMaintenances({
          page,
          pageSize,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          hoardingId: hoardingFilter || undefined,
        });

        let fetchedItems = data.items || [];

        // Local search filtering for fast live search
        if (search) {
          const q = search.toLowerCase().trim();
          fetchedItems = fetchedItems.filter(
            (m) =>
              String(m.maintenanceID).includes(q) ||
              (m.hoardingCode || '').toLowerCase().includes(q) ||
              (m.reasonName || '').toLowerCase().includes(q) ||
              (m.description || '').toLowerCase().includes(q) ||
              (m.siteAddress || '').toLowerCase().includes(q) ||
              (m.reportedByName || '').toLowerCase().includes(q) ||
              String(m.reportedBy || '').toLowerCase().includes(q)
          );
        }

        setItems(fetchedItems);
        setTotalCount(data.totalCount || fetchedItems.length);
        setTotalPages(data.totalPages || Math.max(1, Math.ceil((data.totalCount || fetchedItems.length) / pageSize)));
      } catch (err) {
        console.error('Error fetching maintenance requests:', err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          err?.message ||
          'Failed to load maintenance records.';
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, pageSize, statusFilter, priorityFilter, hoardingFilter, search]
  );

  useEffect(() => {
    fetchList();
  }, [fetchList, refreshTrigger]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    let av = a[sortKey];
    let bv = b[sortKey];

    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();

    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Options for custom filter dropdowns
  const hoardingFilterOptions = [
    { value: '', label: 'All Hoardings' },
    ...hoardings.map((h) => ({
      value: h.hoardingID,
      label: h.hoardingCode,
      badge: h.width && h.height ? `${h.width} × ${h.height} ft` : null,
      subtext: h.fullAddress || (h.city ? `${h.city}, ${h.addressLine1 || 'Main'}` : (h.addressLine1 || 'No address specified')),
      subIcon: MapPin,
    })),
  ];

  const statusFilterOptions = [
    { value: '', label: 'All Statuses' },
    ...STATUS_OPTIONS.map((st) => {
      const conf = STATUS_CONFIG[st] || {};
      return {
        value: st,
        label: st,
        badge: st,
        badgeBg: conf.bg,
        badgeColor: conf.color,
        icon: conf.icon || ShieldCheck,
        iconColor: conf.color,
      };
    }),
  ];

  const priorityFilterOptions = [
    { value: '', label: 'All Priorities' },
    ...PRIORITY_OPTIONS.map((p) => {
      const conf = PRIORITY_CONFIG[p] || {};
      return {
        value: p,
        label: p,
        badge: p,
        badgeBg: conf.bg,
        badgeColor: conf.color,
        icon: AlertTriangle,
        iconColor: conf.color,
      };
    }),
  ];

  // Pagination helper array
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="pg-page">
      {/* Page Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Hoarding Maintenance</h1>
          <p className="pg-header__subtitle">
            Track and manage physical damage repairs, maintenance requests, and site inspections for hoardings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {isAdmin && (
            <button
              type="button"
              className="pg-btn-add"
              onClick={() => setShowReportModal(true)}
              style={{
                background: '#ffffff',
                color: '#049edf',
                border: '1.5px solid #049edf',
                boxShadow: 'none',
              }}
            >
              <FileText size={15} /> Report
            </button>
          )}

          {canCreate && (
            <button className="pg-btn-add" onClick={onCreate}>
              <Plus size={16} /> Add Maintenance
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: '10px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 11,
            marginBottom: 16,
            color: '#dc2626',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'Nunito,sans-serif',
          }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Main Container */}
      <div className="pg-container">
        {/* Integrated Toolbar / Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f8',
            position: 'relative',
            zIndex: 100,
            background: '#ffffff',
          }}
        >
          {/* Item Count Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: 'rgba(4,158,223,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wrench size={15} color="#049edf" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'Nunito,sans-serif',
                  fontSize: 16,
                  fontWeight: 900,
                  color: '#1a1a2e',
                  lineHeight: 1,
                }}
              >
                {totalCount}
              </div>
              <div
                style={{
                  fontFamily: 'Nunito,sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#9090a8',
                  lineHeight: 1,
                  marginTop: 2,
                }}
              >
                Request{totalCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div
            style={{
              flex: '1 1 180px',
              minWidth: 150,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: '#f4f4fb',
              borderRadius: 10,
              border: '1.5px solid #ececf8',
              minHeight: 36,
              boxSizing: 'border-box',
            }}
          >
            <Search size={14} color="#9090a8" style={{ flexShrink: 0 }} />
            <input
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontFamily: 'Nunito,sans-serif',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#1a1a2e',
                minWidth: 0,
              }}
              placeholder="Search by code, hoarding, reason, description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <X
                size={13}
                style={{ cursor: 'pointer', color: '#9090a8', flexShrink: 0 }}
                onClick={() => setSearch('')}
              />
            )}
          </div>

          {/* Custom Hoarding Filter Dropdown */}
          <SearchableSelect
            value={hoardingFilter}
            onChange={(val) => {
              setHoardingFilter(val);
              setPage(1);
            }}
            options={hoardingFilterOptions}
            placeholder="All Hoardings"
            searchPlaceholder="Search hoardings…"
            icon={Layers}
            compact
            width="auto"
            style={{ flex: '1 1 140px', minWidth: 130 }}
            clearable={false}
          />

          {/* Custom Status Filter Dropdown */}
          <SearchableSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            options={statusFilterOptions}
            placeholder="All Statuses"
            searchable={false}
            icon={ShieldCheck}
            compact
            width="auto"
            style={{ flex: '1 1 120px', minWidth: 110 }}
            clearable={false}
          />

          {/* Custom Priority Filter Dropdown */}
          <SearchableSelect
            value={priorityFilter}
            onChange={(val) => {
              setPriorityFilter(val);
              setPage(1);
            }}
            options={priorityFilterOptions}
            placeholder="All Priorities"
            searchable={false}
            icon={AlertTriangle}
            compact
            width="auto"
            style={{ flex: '1 1 120px', minWidth: 110 }}
            clearable={false}
          />

          {/* Refresh Button */}
          <button
            onClick={() => fetchList(true)}
            disabled={loading || refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 10,
              border: '1.5px solid #e8e8f4',
              background: '#fff',
              color: '#5a5a78',
              cursor: 'pointer',
              fontFamily: 'Nunito,sans-serif',
              fontSize: 12.5,
              fontWeight: 700,
              flexShrink: 0,
              minHeight: 36,
            }}
          >
            <RefreshCw size={13} className={refreshing ? 'pg-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="pg-desktop-table" style={{ overflowX: 'auto', position: 'relative', zIndex: 1 }}>
          <table ref={tableRef} className="pg-table" style={{ minWidth: 920, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                {[
                  { key: 'maintenanceID', label: 'ID', w: '6%' },
                  { key: 'hoardingCode', label: 'Hoarding & Location', w: '18%' },
                  { key: 'reasonName', label: 'Reason & Notes', w: '18%' },
                  { key: 'priority', label: 'Priority', w: '10%' },
                  { key: 'status', label: 'Status', w: '12%' },
                  { key: 'reportedBy', label: 'Reported By', w: '13%' },
                  { key: 'reportedDate', label: 'Reported Date', w: '11%' },
                  { key: 'targetDate', label: 'Target Date', w: '11%' },
                  { key: null, label: 'Actions', w: '8%' },
                ].map((col, idx) => (
                  <th
                    key={idx}
                    style={{ width: col.w }}
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
              {loading && !refreshing ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '50px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <Loader2 size={24} className="pg-spin" color="#049edf" />
                      <span style={{ fontFamily: 'Nunito, sans-serif', color: '#9090a8', fontSize: 13.5 }}>
                        Loading maintenance records…
                      </span>
                    </div>
                  </td>
                </tr>
              ) : sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="pg-td pg-empty">
                    <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                      <Wrench size={36} color="#d0d0e8" />
                      <span className="pg-empty__label">No maintenance records found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedItems.map((m) => {
                  const hoardingMatch = hoardings.find(
                    (h) =>
                      String(h.hoardingID) === String(m.hoardingID) ||
                      (h.hoardingCode && (m.hoardingCode || '').toLowerCase().trim() === h.hoardingCode.toLowerCase().trim()) ||
                      (h.hoardingCode && (m.hoardingCode || '').toLowerCase().replace(/[\s\-_]/g, '') === h.hoardingCode.toLowerCase().replace(/[\s\-_]/g, ''))
                  );
                  const displayAddress =
                    (m.siteAddress && m.siteAddress !== '—' && !m.siteAddress.startsWith('HD-'))
                      ? m.siteAddress
                      : (hoardingMatch?.fullAddress || '');

                  return (
                    <tr
                      key={m.maintenanceID}
                      className="pg-tr"
                      onClick={() => onView(m.maintenanceID)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td
                        className="pg-td"
                        style={{
                          fontFamily: 'Nunito,sans-serif',
                          fontSize: 12.5,
                          fontWeight: 800,
                          color: '#049edf',
                        }}
                      >
                        #{m.maintenanceID}
                      </td>
                      <td className="pg-td pg-td--overflow" style={{ fontWeight: 800, color: '#1a1a2e' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Layers size={13} color="#049edf" style={{ flexShrink: 0 }} />
                          <span
                            className="pg-td__ellipsis"
                            title={isAdmin ? `Click to view/edit hoarding ${m.hoardingCode}` : m.hoardingCode}
                            onClick={(e) => handleHoardingClick(e, m)}
                            style={{
                              cursor: isAdmin ? 'pointer' : 'default',
                              color: isAdmin ? '#0284c7' : '#1a1a2e',
                              textDecoration: isAdmin ? 'underline' : 'none',
                            }}
                          >
                            {m.hoardingCode}
                          </span>
                        </div>
                        {displayAddress && displayAddress !== '—' && (
                          <div
                            className="pg-td__ellipsis"
                            title={displayAddress}
                            style={{
                              fontSize: 11.5,
                              color: '#64748b',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              marginTop: 2,
                            }}
                          >
                            <MapPin size={11} color="#94a3b8" style={{ flexShrink: 0 }} />
                            <span>{displayAddress}</span>
                          </div>
                        )}
                      </td>
                      <td className="pg-td pg-td--overflow">
                        <div style={{ fontWeight: 700, color: '#1a1a2e' }} title={m.reasonName}>
                          {m.reasonName}
                        </div>
                      {m.description && (
                        <div
                          className="pg-td__ellipsis"
                          title={m.description}
                          style={{ fontSize: 11.5, color: '#9090a8', marginTop: 2 }}
                        >
                          {m.description}
                        </div>
                      )}
                    </td>
                    <td className="pg-td">
                      <PriorityBadge priority={m.priority} />
                    </td>
                    <td className="pg-td">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="pg-td pg-td--overflow">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <User size={12} color="#9090a8" style={{ flexShrink: 0 }} />
                        <span className="pg-td__ellipsis" title={m.reportedByName || (m.reportedBy ? `User #${m.reportedBy}` : 'Admin')} style={{ fontWeight: 600 }}>
                          {m.reportedByName || (m.reportedBy ? `User #${m.reportedBy}` : 'Admin')}
                        </span>
                      </div>
                    </td>
                    <td className="pg-td" style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700 }}>
                      {formatDate(m.reportedDate)}
                    </td>
                    <td className="pg-td" style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5 }}>
                      {formatDate(m.targetDate)}
                    </td>
                      <td className="pg-td">
                        <div className="pg-action-wrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="pg-btn-view"
                            onClick={() => onView(m.maintenanceID)}
                            title="View Details"
                            style={{ width: 28, height: 28 }}
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="pg-mobile-cards">
          {loading && !refreshing ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Loader2 size={24} className="pg-spin" color="#049edf" />
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="pg-empty__inner" style={{ padding: '36px 20px' }}>
              <Wrench size={32} color="#d0d0e8" />
              <span className="pg-empty__label">No maintenance records found</span>
            </div>
          ) : (
            sortedItems.map((m) => {
              const hoardingMatch = hoardings.find(
                (h) =>
                  String(h.hoardingID) === String(m.hoardingID) ||
                  (h.hoardingCode && (m.hoardingCode || '').toLowerCase().trim() === h.hoardingCode.toLowerCase().trim()) ||
                  (h.hoardingCode && (m.hoardingCode || '').toLowerCase().replace(/[\s\-_]/g, '') === h.hoardingCode.toLowerCase().replace(/[\s\-_]/g, ''))
              );
              const displayAddress =
                (m.siteAddress && m.siteAddress !== '—' && !m.siteAddress.startsWith('HD-'))
                  ? m.siteAddress
                  : (hoardingMatch?.fullAddress || '');

              return (
                <div
                  key={m.maintenanceID}
                  className="pg-card"
                  onClick={() => onView(m.maintenanceID)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="pg-card__header">
                    <div className="pg-card__title-wrap">
                      <div className="pg-card__title">
                        #{m.maintenanceID} ·{' '}
                        <span
                          onClick={(e) => handleHoardingClick(e, m)}
                          style={{
                            cursor: isAdmin ? 'pointer' : 'default',
                            color: isAdmin ? '#0284c7' : 'inherit',
                            textDecoration: isAdmin ? 'underline' : 'none',
                          }}
                          title={isAdmin ? `Click to view/edit hoarding ${m.hoardingCode}` : undefined}
                        >
                          {m.hoardingCode}
                        </span>
                      </div>
                      <div className="pg-card__subtitle">{m.reasonName}</div>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>

                  <div className="pg-card__body">
                    <div className="pg-card__row" style={{ alignItems: 'center' }}>
                      <span style={{ color: '#7878a0', minWidth: 68, flexShrink: 0, whiteSpace: 'nowrap', fontSize: 12.5, fontWeight: 700 }}>Priority:</span>
                      <PriorityBadge priority={m.priority} />
                    </div>
                    <div className="pg-card__row" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: '#7878a0', minWidth: 68, flexShrink: 0, whiteSpace: 'nowrap', fontSize: 12.5, fontWeight: 700 }}>Reported:</span>
                      <span style={{ color: '#1a1a2e', fontWeight: 700, fontSize: 12.5, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                        {formatDate(m.reportedDate)} by {m.reportedByName || (m.reportedBy ? `User #${m.reportedBy}` : 'Admin')}
                      </span>
                    </div>
                    {displayAddress && displayAddress !== '—' && (
                      <div className="pg-card__row" style={{ alignItems: 'flex-start' }}>
                        <span style={{ color: '#7878a0', minWidth: 68, flexShrink: 0, whiteSpace: 'nowrap', fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>Location:</span>
                        <span style={{ color: '#1a1a2e', fontWeight: 600, fontSize: 12.5, flex: 1, minWidth: 0, wordBreak: 'break-word', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                          <MapPin size={13} color="#049edf" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{displayAddress}</span>
                        </span>
                      </div>
                    )}
                    {m.targetDate && (
                      <div className="pg-card__row" style={{ alignItems: 'center' }}>
                        <span style={{ color: '#7878a0', minWidth: 68, flexShrink: 0, whiteSpace: 'nowrap', fontSize: 12.5, fontWeight: 700 }}>Target:</span>
                        <span style={{ color: '#1a1a2e', fontWeight: 700, fontSize: 12.5, flex: 1, minWidth: 0 }}>{formatDate(m.targetDate)}</span>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      padding: '10px 16px',
                      borderTop: '1px solid #f0f0f8',
                      display: 'flex',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(m.maintenanceID);
                      }}
                      style={{
                        padding: '6px 14px',
                        fontSize: 12.5,
                        borderRadius: 8,
                        border: '1.5px solid #e0e7ff',
                        background: '#ffffff',
                        color: '#049edf',
                        fontWeight: 800,
                        fontFamily: 'Nunito, sans-serif',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#049edf';
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.borderColor = '#049edf';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = '#049edf';
                        e.currentTarget.style.borderColor = '#e0e7ff';
                      }}
                    >
                      <Eye size={13} /> View Details
                    </button>
                  </div>
              </div>
            );
          })
        )}
      </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="pg-pagination">
            <div className="pg-pagination__left">
              <button
                className="pg-pg-btn"
                disabled={page === 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft size={13} />
              </button>
              <button
                className="pg-pg-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={13} />
              </button>
              {pageNums.map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} className="pg-pg-ellipsis">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                className="pg-pg-btn"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={13} />
              </button>
              <button
                className="pg-pg-btn"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsRight size={13} />
              </button>
            </div>

            <div className="pg-pagination__right">
              <select
                className="pg-pagesize-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="pg-pagination__text">Items per page</span>
              <span className="pg-pagination__text">
                {page} of {totalPages} pages ({totalCount} items)
              </span>
            </div>
          </div>
        )}
      </div>

      {isAdmin && showReportModal && (
        <MaintenanceReportModal onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}
