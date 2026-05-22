import { useState, useEffect } from 'react';
import {
  RefreshCw, Layers, CalendarCheck, TrendingDown,
  DollarSign, TrendingUp, ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import './Common1.css';

/* ─────────────────────────────────────
   MOCK DATA
───────────────────────────────────── */
const MONTHLY_REVENUE = [
  { month: 'Jan', revenue: 182000, bookings: 14 },
  { month: 'Feb', revenue: 245000, bookings: 19 },
  { month: 'Mar', revenue: 198000, bookings: 16 },
  { month: 'Apr', revenue: 312000, bookings: 26 },
  { month: 'May', revenue: 278000, bookings: 23 },
  { month: 'Jun', revenue: 395000, bookings: 34 },
];

const BOOKING_STATUS = [
  { name: 'Active',  value: 62, color: '#049edf' },
  { name: 'Expired', value: 24, color: '#e84040' },
  { name: 'Pending', value: 14, color: '#f59e0b' },
];

const RECENT_BOOKINGS = [
  { id: '#BK-1041', client: 'Mehta Enterprises',   site: 'NH-48 Ahmedabad',   duration: '30 days', amount: '₹42,000', statusId: 1 },
  { id: '#BK-1040', client: 'Shah Motors',          site: 'SG Highway, Sola', duration: '15 days', amount: '₹18,500', statusId: 3 },
  { id: '#BK-1039', client: 'Patel Jewellers',      site: 'Manek Chowk',      duration: '60 days', amount: '₹73,000', statusId: 1 },
  { id: '#BK-1038', client: 'NeoMart Retail',       site: 'Vastrapur Lake',   duration: '30 days', amount: '₹39,000', statusId: 2 },
  { id: '#BK-1037', client: 'Desai Constructions',  site: 'Ring Road West',   duration: '45 days', amount: '₹55,500', statusId: 1 },
];

const STATUS_STYLE = {
  1: { bg: '#e8faf3', color: '#1a9e6e', label: 'Active'  },
  3: { bg: '#fff8e1', color: '#e08a00', label: 'Pending' },
  2: { bg: '#ffeaea', color: '#e84040', label: 'Expired' },
};

/* ── Window width hook (for responsive chart grid) ── */
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

/* ═══════════════════════════════════════════
   DASHBOARD PAGE
   Props: changeTab  — passed from App.js via Layout
═══════════════════════════════════════════ */
export default function Dashboard({ changeTab }) {
  const [refreshing, setRefreshing] = useState(false);
  const [adminName,  setAdminName]  = useState('Admin');
  const width = useWindowWidth();

  /* Read admin name from localStorage (same source as Layout) */
  useEffect(() => {
    const s = JSON.parse(localStorage.getItem('userData') || '{}');
    setAdminName(s?.name || s?.Name || s?.email || 'Admin');
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 900));
    setRefreshing(false);
  };

  const STATS = [
    { title: 'Total Hoardings',  value: '148',    sub: '+6 added this month',   icon: Layers,       color: '#049edf', bg: 'rgba(4,158,223,0.1)'   },
    { title: 'Active Bookings',  value: '62',     sub: '14 expiring this week', icon: CalendarCheck,color: '#1a9e6e', bg: 'rgba(26,158,110,0.1)'  },
    { title: 'Expired Bookings', value: '24',     sub: '8 pending renewal',     icon: TrendingDown, color: '#e84040', bg: 'rgba(232,64,64,0.1)'   },
    { title: 'Total Revenue',    value: '₹16.1L', sub: '+23% vs last month',    icon: DollarSign,   color: '#6c63ff', bg: 'rgba(108,99,255,0.1)'  },
  ];

  return (
    <div style={{ animation: 'fadeUp 0.4s ease both' }}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{adminName}</strong>! Here's what's happening today.
          </p>
        </div>
        <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="stats-grid">
        {STATS.map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="stat-icon" style={{ background: s.bg }}>
              <s.icon size={21} color={s.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p className="stat-label">{s.title}</p>
              <p className="stat-value">{s.value}</p>
              <p className="stat-sub" style={{ color: s.color }}>
                <TrendingUp size={10} /> {s.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className={`charts-grid ${width >= 900 ? 'two-col' : 'one-col'}`}>

        {/* Revenue area chart */}
        <div className={`chart-card${width >= 900 ? ' full-width' : ''}`}>
          <div className="chart-header">
            <h3 className="chart-title">Monthly Revenue</h3>
            <span className="chart-badge">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MONTHLY_REVENUE}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#049edf" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#049edf" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis
                dataKey="month"
                stroke="#c0c0d8"
                tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 11 }}
              />
              <YAxis
                stroke="#c0c0d8"
                tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 10 }}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                width={52}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e0e0f0', fontFamily: 'Nunito,sans-serif', fontSize: 12 }}
                formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
              />
              <Area
                type="monotone" dataKey="revenue"
                stroke="#049edf" strokeWidth={3} fill="url(#revGrad)"
                dot={{ fill: '#049edf', r: 4, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly bookings bar chart */}
        <div className="chart-card">
          <h3 className="chart-title" style={{ marginBottom: 16 }}>Monthly Bookings</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MONTHLY_REVENUE} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" stroke="#c0c0d8" tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 11 }} />
              <YAxis stroke="#c0c0d8" tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e0e0f0', fontFamily: 'Nunito,sans-serif', fontSize: 12 }} />
              <Bar dataKey="bookings" radius={[8,8,0,0]} name="Bookings">
                {MONTHLY_REVENUE.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#049edf' : '#6c63ff'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Booking status pie chart */}
        <div className="chart-card">
          <h3 className="chart-title" style={{ marginBottom: 16 }}>Booking Status</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={BOOKING_STATUS} cx="50%" cy="50%"
                outerRadius={68} innerRadius={38} dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false} paddingAngle={3}
              >
                {BOOKING_STATUS.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e0e0f0', fontFamily: 'Nunito,sans-serif', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="status-legend">
            {BOOKING_STATUS.map(s => (
              <div key={s.name} className="legend-item">
                <div className="legend-value" style={{ color: s.color }}>{s.value}</div>
                <div className="legend-label">{s.name}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Recent bookings table ── */}
      <div className="bookings-card">
        <div className="bookings-header">
          <h3 className="bookings-title">Recent Bookings</h3>
          <button className="view-all-btn" onClick={() => changeTab?.('bookings')}>
            View All <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="bookings-table-wrap">
          <table className="bookings-table">
            <thead>
              <tr>
                {['Booking ID', 'Client', 'Site Location', 'Duration', 'Amount', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECENT_BOOKINGS.map((b, i) => {
                const st = STATUS_STYLE[b.statusId] || STATUS_STYLE[3];
                return (
                  <tr key={i} className="booking-row">
                    <td>{b.id}</td>
                    <td>{b.client}</td>
                    <td>{b.site}</td>
                    <td>{b.duration}</td>
                    <td>{b.amount}</td>
                    <td>
                      <span className="status-badge" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}