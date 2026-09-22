import {
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Archive
} from 'lucide-react';

/* ─────────────────────────────────────────
   STATUSES
───────────────────────────────────────── */
export const MAINTENANCE_STATUSES = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export const STATUS_OPTIONS = [
  MAINTENANCE_STATUSES.OPEN,
  MAINTENANCE_STATUSES.IN_PROGRESS,
  MAINTENANCE_STATUSES.COMPLETED,
  MAINTENANCE_STATUSES.CLOSED,
  MAINTENANCE_STATUSES.CANCELLED,
];

export const STATUS_CONFIG = {
  [MAINTENANCE_STATUSES.OPEN]: {
    label: 'Open',
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    icon: Clock,
  },
  [MAINTENANCE_STATUSES.IN_PROGRESS]: {
    label: 'In Progress',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: PlayCircle,
  },
  [MAINTENANCE_STATUSES.COMPLETED]: {
    label: 'Completed',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: CheckCircle2,
  },
  [MAINTENANCE_STATUSES.CLOSED]: {
    label: 'Closed',
    color: '#475569',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    icon: Archive,
  },
  [MAINTENANCE_STATUSES.CANCELLED]: {
    label: 'Cancelled',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: XCircle,
  },
};

/* ─────────────────────────────────────────
   PRIORITIES
───────────────────────────────────────── */
export const MAINTENANCE_PRIORITIES = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const PRIORITY_OPTIONS = [
  MAINTENANCE_PRIORITIES.LOW,
  MAINTENANCE_PRIORITIES.NORMAL,
  MAINTENANCE_PRIORITIES.HIGH,
  MAINTENANCE_PRIORITIES.URGENT,
];

export const PRIORITY_CONFIG = {
  [MAINTENANCE_PRIORITIES.LOW]: {
    label: 'Low',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: HelpCircle,
  },
  [MAINTENANCE_PRIORITIES.NORMAL]: {
    label: 'Normal',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: AlertCircle,
  },
  [MAINTENANCE_PRIORITIES.HIGH]: {
    label: 'High',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: AlertTriangle,
  },
  [MAINTENANCE_PRIORITIES.URGENT]: {
    label: 'Urgent',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: AlertTriangle,
  },
};

/* ─────────────────────────────────────────
   PHOTO TYPES
───────────────────────────────────────── */
export const PHOTO_TYPES = {
  BEFORE: 'Before',
  AFTER: 'After',
};

export const PHOTO_TYPE_OPTIONS = [
  PHOTO_TYPES.BEFORE,
  PHOTO_TYPES.AFTER,
];

/* ─────────────────────────────────────────
   VALIDATION LIMITS
───────────────────────────────────────── */
export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_PHOTOS_COUNT = 10;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
