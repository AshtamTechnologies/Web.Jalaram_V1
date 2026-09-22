import React from 'react';
import { STATUS_CONFIG, MAINTENANCE_STATUSES } from '../../constants/maintenanceConstants';

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: null,
  };

  const Icon = cfg.icon;
  const isLg = size === 'lg';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isLg ? 6 : 4,
        padding: isLg ? '5px 12px' : '2.5px 8px',
        borderRadius: 8,
        fontSize: isLg ? 13 : 11.5,
        fontWeight: 800,
        fontFamily: 'Nunito, sans-serif',
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        whiteSpace: 'nowrap',
        letterSpacing: '0.2px',
      }}
    >
      {Icon && <Icon size={isLg ? 14 : 11} style={{ flexShrink: 0 }} />}
      <span>{cfg.label}</span>
    </span>
  );
}
