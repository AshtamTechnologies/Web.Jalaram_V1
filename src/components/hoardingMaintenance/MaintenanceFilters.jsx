import React from 'react';
import { Search, X, Filter, RotateCcw, Calendar, Layers, ShieldCheck, AlertTriangle } from 'lucide-react';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../constants/maintenanceConstants';

export default function MaintenanceFilters({
  filters,
  onChange,
  onReset,
  hoardings = [],
  disabled = false,
}) {
  const isFiltered = Boolean(
    filters.search ||
    filters.status ||
    filters.priority ||
    filters.hoardingId ||
    filters.fromDate ||
    filters.toDate
  );

  const handleFieldChange = (key, value) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
        padding: '12px 16px',
        background: '#fff',
        borderRadius: 14,
        border: '1.5px solid #e8e8f4',
        marginBottom: 16,
      }}
    >
      {/* Search Input */}
      <div
        className="pg-search-box"
        style={{
          flex: '1 1 200px',
          minWidth: 180,
          background: '#f8f8fd',
          borderRadius: 10,
          border: '1.5px solid #e8e8f4',
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          gap: 8,
        }}
      >
        <Search size={13} color="#9090a8" style={{ flexShrink: 0 }} />
        <input
          placeholder="Search by code, description, reporter…"
          value={filters.search || ''}
          onChange={(e) => handleFieldChange('search', e.target.value)}
          disabled={disabled}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            width: '100%',
            fontFamily: 'Nunito, sans-serif',
            fontSize: 12.5,
            color: '#1a1a2e',
          }}
        />
        {filters.search && (
          <X
            size={12}
            className="pg-search-clear"
            onClick={() => handleFieldChange('search', '')}
            style={{ cursor: 'pointer', color: '#9090a8' }}
          />
        )}
      </div>

      {/* Hoarding Filter */}
      <div style={{ minWidth: 140, flex: '1 1 140px' }}>
        <select
          value={filters.hoardingId || ''}
          onChange={(e) => handleFieldChange('hoardingId', e.target.value)}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: 10,
            border: '1.5px solid #e8e8f4',
            background: '#f8f8fd',
            fontFamily: 'Nunito, sans-serif',
            fontSize: 12.5,
            fontWeight: 700,
            color: filters.hoardingId ? '#1a1a2e' : '#7878a0',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">All Hoardings</option>
          {hoardings.map((h) => (
            <option key={h.hoardingID} value={h.hoardingID}>
              {h.hoardingCode}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div style={{ minWidth: 125, flex: '1 1 125px' }}>
        <select
          value={filters.status || ''}
          onChange={(e) => handleFieldChange('status', e.target.value)}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: 10,
            border: '1.5px solid #e8e8f4',
            background: '#f8f8fd',
            fontFamily: 'Nunito, sans-serif',
            fontSize: 12.5,
            fontWeight: 700,
            color: filters.status ? '#1a1a2e' : '#7878a0',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {/* Priority Filter */}
      <div style={{ minWidth: 125, flex: '1 1 125px' }}>
        <select
          value={filters.priority || ''}
          onChange={(e) => handleFieldChange('priority', e.target.value)}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: 10,
            border: '1.5px solid #e8e8f4',
            background: '#f8f8fd',
            fontFamily: 'Nunito, sans-serif',
            fontSize: 12.5,
            fontWeight: 700,
            color: filters.priority ? '#1a1a2e' : '#7878a0',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* From Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 130 }}>
        <span style={{ fontSize: 11.5, color: '#7878a0', fontWeight: 700, fontFamily: 'Nunito, sans-serif' }}>From:</span>
        <input
          type="date"
          value={filters.fromDate || ''}
          onChange={(e) => handleFieldChange('fromDate', e.target.value)}
          disabled={disabled}
          style={{
            padding: '6px 8px',
            borderRadius: 9,
            border: '1.5px solid #e8e8f4',
            background: '#f8f8fd',
            fontFamily: 'Nunito, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            color: '#1a1a2e',
            outline: 'none',
          }}
        />
      </div>

      {/* To Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 130 }}>
        <span style={{ fontSize: 11.5, color: '#7878a0', fontWeight: 700, fontFamily: 'Nunito, sans-serif' }}>To:</span>
        <input
          type="date"
          value={filters.toDate || ''}
          onChange={(e) => handleFieldChange('toDate', e.target.value)}
          disabled={disabled}
          style={{
            padding: '6px 8px',
            borderRadius: 9,
            border: '1.5px solid #e8e8f4',
            background: '#f8f8fd',
            fontFamily: 'Nunito, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            color: '#1a1a2e',
            outline: 'none',
          }}
        />
      </div>

      {/* Reset Button */}
      {isFiltered && (
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '7px 12px',
            borderRadius: 9,
            border: '1.5px solid #fca5a5',
            background: '#fef2f2',
            color: '#dc2626',
            fontFamily: 'Nunito, sans-serif',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginLeft: 'auto',
          }}
        >
          <RotateCcw size={12} /> Reset
        </button>
      )}
    </div>
  );
}
