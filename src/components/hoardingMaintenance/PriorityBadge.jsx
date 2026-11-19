import React from 'react';
import { PRIORITY_CONFIG } from '../../constants/maintenanceConstants';

export default function PriorityBadge({ priority, size = 'sm' }) {
  const cfg = PRIORITY_CONFIG[priority] || {
    label: priority || 'Normal',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
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
      {Icon && <Icon size={isLg ? 13 : 11} style={{ flexShrink: 0 }} />}
      <span>{cfg.label}</span>
    </span>
  );
}
