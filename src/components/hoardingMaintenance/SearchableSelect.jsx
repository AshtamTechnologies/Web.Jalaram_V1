import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import '../../Pages/Common1.css';

export default function SearchableSelect({
  value,
  onChange,
  onBlur,
  options = [],
  placeholder = 'Select…',
  icon: Icon,
  searchable = true,
  searchPlaceholder = 'Search…',
  clearable = true,
  error = false,
  disabled = false,
  compact = false,
  width,
  minWidth,
  panelStyle = {},
  style = {},
  dropdownZIndex = 99999,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [wasOpened, setWasOpened] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter options
  const filtered = searchable && query.trim()
    ? options.filter((opt) => {
        const q = query.toLowerCase().trim();
        const labelMatch = (opt.label || '').toLowerCase().includes(q);
        const subtextMatch = (opt.subtext || '').toLowerCase().includes(q);
        const badgeMatch = (opt.badge || '').toLowerCase().includes(q);
        return labelMatch || subtextMatch || badgeMatch;
      })
    : options;

  // Handle outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
        if (wasOpened) {
          onBlur?.();
          setWasOpened(false);
        }
      }
    }
    if (open) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onBlur, wasOpened]);

  // Focus search input on open
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open, searchable]);

  const openDropdown = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
    setWasOpened(true);
    setQuery('');
  };

  const select = (val) => {
    onChange(val);
    setOpen(false);
    setQuery('');
    setWasOpened(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
    setWasOpened(false);
    onBlur?.();
  };

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const handleTriggerKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      (items[idx + 1] || items[0])?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      (items[idx - 1] || items[items.length - 1])?.focus();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      onBlur?.();
      setWasOpened(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items?.[0]?.focus();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      onBlur?.();
      setWasOpened(false);
    }
  };

  const handleOptionKeyDown = (e, optValue) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(optValue);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll('.pg-combo-option');
      const idx = Array.from(items).indexOf(e.currentTarget);
      (items[idx + 1] || items[0])?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll('.pg-combo-option');
      const idx = Array.from(items).indexOf(e.currentTarget);
      (items[idx - 1] || items[items.length - 1])?.focus();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      onBlur?.();
      setWasOpened(false);
    }
  };

  const resolvedWidth = width || (compact ? 'auto' : '100%');

  return (
    <div
      className="pg-combo-wrap"
      ref={wrapRef}
      style={{
        width: resolvedWidth,
        minWidth: minWidth || (compact ? 140 : undefined),
        flexShrink: compact ? 0 : undefined,
        position: 'relative',
        zIndex: open ? 1000 : 1,
        ...style,
      }}
    >
      {/* Trigger Box matching Owner.jsx StateCombo */}
      <div
        className={`pg-field-wrap pg-combo-trigger ${
          error
            ? 'pg-field-wrap--error'
            : disabled
            ? 'pg-field-wrap--readonly'
            : 'pg-field-wrap--normal'
        }`}
        onClick={openDropdown}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleTriggerKeyDown}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: '#ffffff',
          ...(compact ? { minHeight: 36, padding: '6px 12px', gap: 7 } : { minHeight: 42 }),
        }}
      >
        {Icon && (
          <Icon
            size={compact ? 13 : 14}
            color={error ? '#ef4444' : '#c0c0d8'}
            style={{ flexShrink: 0 }}
          />
        )}

        <span
          className={`pg-combo-display${!value ? ' pg-combo-display--placeholder' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: compact ? 12.5 : 13,
          }}
        >
          {selectedOption ? (
            <>
              <span style={{ fontWeight: 700, color: '#1a1a2e', flexShrink: 0 }}>
                {selectedOption.label}
              </span>
              {selectedOption.subtext && !compact && (
                <span
                  style={{
                    fontSize: 12,
                    color: '#64748b',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={selectedOption.subtext}
                >
                  — {selectedOption.subtext}
                </span>
              )}
              {selectedOption.badge && selectedOption.badge !== selectedOption.label && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: selectedOption.badgeColor || '#049edf',
                    background: selectedOption.badgeBg || 'rgba(4, 158, 223, 0.1)',
                    padding: '1px 6px',
                    borderRadius: 4,
                    flexShrink: 0,
                    marginLeft: 'auto',
                  }}
                >
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>

        {value && clearable && !disabled ? (
          <X size={compact ? 12 : 13} className="pg-combo-clear" onClick={clear} />
        ) : (
          <ChevronDown size={compact ? 12 : 13} color="#c0c0d8" style={{ flexShrink: 0 }} />
        )}
      </div>

      {/* Dropdown Panel with solid white background and elevated z-index */}
      {open && (
        <div
          className={`pg-combo-panel ${!searchable ? 'pg-combo-panel--sm' : ''}`}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: compact ? 'auto' : 0,
            minWidth: compact ? 190 : '100%',
            zIndex: dropdownZIndex,
            background: '#ffffff',
            border: '1.5px solid #ececf8',
            borderRadius: 12,
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.18)',
            overflow: 'hidden',
            ...panelStyle,
          }}
        >
          {/* Search Row */}
          {searchable && (
            <div className="pg-combo-search" style={{ background: '#f8f8fd' }}>
              <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                className="pg-combo-search__input"
                placeholder={searchPlaceholder || 'Search…'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              {query && (
                <X
                  size={11}
                  className="pg-combo-clear"
                  onClick={() => setQuery('')}
                  style={{ cursor: 'pointer' }}
                />
              )}
            </div>
          )}

          {/* Options List */}
          <div className="pg-combo-list" ref={listRef} style={{ background: '#ffffff', maxHeight: 220 }}>
            {filtered.length === 0 ? (
              <div className="pg-combo-empty">No options match</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.value}
                    className={`pg-combo-option${isSelected ? ' pg-combo-option--active' : ''}`}
                    onClick={() => select(opt.value)}
                    tabIndex={0}
                    onKeyDown={(e) => handleOptionKeyDown(e, opt.value)}
                    style={{
                      background: isSelected ? 'rgba(4, 158, 223, 0.08)' : '#ffffff',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {opt.icon && (
                          <opt.icon
                            size={13}
                            color={opt.iconColor || (isSelected ? '#049edf' : '#9090a8')}
                            style={{ flexShrink: 0 }}
                          />
                        )}
                        <span className="pg-combo-option__name">{opt.label}</span>
                        {opt.badge && opt.badge !== opt.label && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: opt.badgeColor || '#049edf',
                              background: opt.badgeBg || 'rgba(4, 158, 223, 0.1)',
                              padding: '1px 6px',
                              borderRadius: 4,
                            }}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>

                      {opt.subtext && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#9090a8',
                            marginTop: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {opt.subIcon && <opt.subIcon size={10} style={{ flexShrink: 0 }} />}
                          <span>{opt.subtext}</span>
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
