import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, CalendarCheck, LogOut,
  Menu, X, ChevronDown, RefreshCw, DollarSign,
  Bell, Search, TrendingUp, ArrowUpRight,
  MapPin, CreditCard, Layers, TrendingDown, UserCircle,
  ChevronRight, Receipt, FileText, PlusSquare
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import './Common1.css';

import OwnerPage from './Owner';
import SitePage from './Site.jsx';
import Hoarding from './Hoarding.jsx';
import Hoardingexpense from './Hoardingexpense.jsx'
import LandContract from './LandContract.jsx'

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
  { name: 'Active', value: 62, color: '#049edf' },
  { name: 'Expired', value: 24, color: '#e84040' },
  { name: 'Pending', value: 14, color: '#f59e0b' },
];

const RECENT_BOOKINGS = [
  { id: '#BK-1041', client: 'Mehta Enterprises', site: 'NH-48 Ahmedabad', duration: '30 days', amount: '₹42,000', statusId: 1 },
  { id: '#BK-1040', client: 'Shah Motors', site: 'SG Highway, Sola', duration: '15 days', amount: '₹18,500', statusId: 3 },
  { id: '#BK-1039', client: 'Patel Jewellers', site: 'Manek Chowk', duration: '60 days', amount: '₹73,000', statusId: 1 },
  { id: '#BK-1038', client: 'NeoMart Retail', site: 'Vastrapur Lake', duration: '30 days', amount: '₹39,000', statusId: 2 },
  { id: '#BK-1037', client: 'Desai Constructions', site: 'Ring Road West', duration: '45 days', amount: '₹55,500', statusId: 1 },
];

const STATUS_STYLE = {
  1: { bg: '#e8faf3', color: '#1a9e6e', label: 'Active' },
  3: { bg: '#fff8e1', color: '#e08a00', label: 'Pending' },
  2: { bg: '#ffeaea', color: '#e84040', label: 'Expired' },
};

/* ─────────────────────────────────────
   MENU
───────────────────────────────────── */
const MENU = [
  // { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: null },
  {
    id: 'hoardings', icon: Layers, label: 'Hoardings', badge: null,
    children: [
      { id: 'new-hoarding', icon: PlusSquare, label: 'Maintain Hoarding' },
      { id: 'hoarding-expense', icon: Receipt, label: 'Hoarding Expense' },
    ],
  },
  { id: 'bookings', icon: CalendarCheck, label: 'Bookings', badge: null },
  { id: 'sites', icon: MapPin, label: 'Sites', badge: null },
  { id: 'land-contract', icon: FileText, label: 'Land Contracts', badge: null },
  { id: 'clients', icon: Users, label: 'Clients', badge: null },
  { id: 'owners', icon: UserCircle, label: 'Owners', badge: null },
  { id: 'payments', icon: CreditCard, label: 'Payments', badge: null },
];

const CHILD_TO_PARENT = {};
MENU.forEach(item => {
  item.children?.forEach(child => {
    CHILD_TO_PARENT[child.id] = item.id;
  });
});

const PARENT_IDS = MENU.filter(item => item.children?.length).map(item => item.id);

/* ─────────────── hook ─────────────── */
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
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function Dashboard({ onLogout }) {
  const [tab, setTab] = useState(() => sessionStorage.getItem('dashTab') || 'dashboard');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adminName, setAdminName] = useState('Admin');

  const [expandedMenus, setExpandedMenus] = useState(() => {
    const saved = sessionStorage.getItem('dashTab') || 'dashboard';
    const initial = {};
    PARENT_IDS.forEach(parentId => {
      const children = MENU.find(m => m.id === parentId)?.children?.map(c => c.id) ?? [];
      initial[parentId] = children.includes(saved);
    });
    return initial;
  });

  const dropRef = useRef(null);
  const width = useWindowWidth();
  const isMobile = width < 768;

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem('userData') || '{}');
    setAdminName(s?.name || s?.Name || s?.email || 'Admin');
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const changeTab = (id) => {
    setTab(id);
    sessionStorage.setItem('dashTab', id);
    setMobileMenu(false);
    const ownerParent = CHILD_TO_PARENT[id] ?? null;
    setExpandedMenus(prev => {
      const next = {};
      PARENT_IDS.forEach(parentId => {
        next[parentId] = parentId === ownerParent ? true : false;
      });
      return next;
    });
  };

  const handleParentClick = (item) => {
    if (item.children?.length) {
      setExpandedMenus(prev => {
        const next = {};
        PARENT_IDS.forEach(parentId => {
          next[parentId] = parentId === item.id ? !prev[item.id] : false;
        });
        return next;
      });
    } else {
      changeTab(item.id);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('dashTab');
    localStorage.clear();
    onLogout && onLogout();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 900));
    setRefreshing(false);
  };

  const isParentActive = (item) =>
    item.children?.some(c => c.id === tab) ?? false;

  /* ══════════════════════════════════════
     SIDEBAR INNER
  ══════════════════════════════════════ */
  const SideInner = () => (
    <div className="sidebar-inner">
      <div className="sidebar-logo-area">
        <div className="sidebar-logo-img-wrap" onClick={() => changeTab('dashboard')} style={{ cursor: 'pointer' }}>
          <img
            src="/logoimp.svg"
            alt="HoardPro Logo"
            style={{ width: '100px', height: '100px', objectFit: 'contain', zIndex: 1 }}
          />
        </div>
      </div>

      <div className="sidebar-section-label">Main Menu</div>

      <nav className="sidebar-nav">
        {MENU.map((item) => {
          const { id, icon: Icon, label, badge, children } = item;
          const hasChildren = children?.length > 0;
          const parentActive = isParentActive(item);
          const isSelfActive = tab === id;                    // non-parent direct active
          const isExpanded = !!expandedMenus[id];

          /* ── styles driven by active state ── */
          const parentBtnStyle = (parentActive || isSelfActive) ? {
            background: 'rgba(4,158,223,0.13)',
            color: '#049edf',
            borderLeft: '3px solid #049edf',
            paddingLeft: 'calc(1rem - 3px)',   // compensate for border
            fontWeight: 700,
          } : {
            borderLeft: '3px solid transparent',
            paddingLeft: 'calc(1rem - 3px)',
          };

          return (
            <div key={id}>
              <button
                onClick={() => handleParentClick(item)}
                className="nav-btn"
                style={parentBtnStyle}
              >
                <div
                  className="nav-btn-icon"
                  style={{ color: (parentActive || isSelfActive) ? '#049edf' : undefined }}
                >
                  <Icon size={17} />
                </div>
                <span className="nav-btn-label">{label}</span>
                {badge && <span className="nav-badge">{badge}</span>}

                {hasChildren && (
                  <ChevronRight
                    size={13}
                    style={{
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.22s cubic-bezier(0.22,1,0.36,1)',
                      color: parentActive ? '#049edf' : '#c0c0d8',
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>

              {/* Sub-menu */}
              {hasChildren && (
                <div
                  className="nav-submenu"
                  style={{
                    maxHeight: isExpanded ? `${children.length * 48}px` : '0px',
                    overflow: 'hidden',
                    transition: 'max-height 0.28s cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  {children.map(({ id: cid, icon: CIcon, label: clabel }) => {
                    const isChildActive = tab === cid;

                    const childBtnStyle = isChildActive ? {
                      background: 'rgba(4,158,223,0.10)',
                      color: '#049edf',
                      fontWeight: 700,
                    } : {};

                    return (
                      <button
                        key={cid}
                        onClick={() => changeTab(cid)}
                        className="nav-sub-btn"
                        style={childBtnStyle}
                      >
                        {/* Active indicator bar */}
                        <div
                          className="nav-sub-indicator"
                          style={{
                            background: isChildActive ? '#049edf' : 'transparent',
                            width: '3px',
                            borderRadius: '2px',
                            alignSelf: 'stretch',
                            flexShrink: 0,
                            transition: 'background 0.2s',
                          }}
                        />
                        <div
                          className="nav-btn-icon nav-btn-icon--sm"
                          style={{ color: isChildActive ? '#049edf' : undefined }}
                        >
                          <CIcon size={14} />
                        </div>
                        <span className="nav-btn-label">{clabel}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  /* ══════════════════════════════════════
     PLACEHOLDER
  ══════════════════════════════════════ */
  const Placeholder = ({ title, Icon }) => (
    <div className="placeholder-page">
      <div className="placeholder-icon-wrap"><Icon size={34} color="#049edf" /></div>
      <h2 className="placeholder-title">{title}</h2>
      <p className="placeholder-sub">Connect your API to load real data here.</p>
    </div>
  );

  /* ══════════════════════════════════════
     DASHBOARD PAGE
  ══════════════════════════════════════ */
  const DashboardPage = () => {
    const STATS = [
      { title: 'Total Hoardings', value: '148', sub: '+6 added this month', icon: Layers, color: '#049edf', bg: 'rgba(4,158,223,0.1)' },
      { title: 'Active Bookings', value: '62', sub: '14 expiring this week', icon: CalendarCheck, color: '#1a9e6e', bg: 'rgba(26,158,110,0.1)' },
      { title: 'Expired Bookings', value: '24', sub: '8 pending renewal', icon: TrendingDown, color: '#e84040', bg: 'rgba(232,64,64,0.1)' },
      { title: 'Total Revenue', value: '₹16.1L', sub: '+23% vs last month', icon: DollarSign, color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
    ];

    return (
      <div style={{ animation: 'fadeUp 0.4s ease both' }}>
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

        <div className="stats-grid">
          {STATS.map((s, i) => (
            <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="stat-icon" style={{ background: s.bg }}>
                <s.icon size={21} color={s.color} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="stat-label">{s.title}</p>
                <p className="stat-value">{s.value}</p>
                <p className="stat-sub" style={{ color: s.color }}><TrendingUp size={10} /> {s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`charts-grid ${width >= 900 ? 'two-col' : 'one-col'}`}>
          <div className={`chart-card${width >= 900 ? ' full-width' : ''}`}>
            <div className="chart-header">
              <h3 className="chart-title">Monthly Revenue</h3>
              <span className="chart-badge">Last 6 months</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MONTHLY_REVENUE}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#049edf" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#049edf" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" stroke="#c0c0d8" tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 11 }} />
                <YAxis stroke="#c0c0d8" tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} width={52} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e0e0f0', fontFamily: 'Nunito,sans-serif', fontSize: 12 }} formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#049edf" strokeWidth={3} fill="url(#revGrad)" dot={{ fill: '#049edf', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3 className="chart-title" style={{ marginBottom: 16 }}>Monthly Bookings</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MONTHLY_REVENUE} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" stroke="#c0c0d8" tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 11 }} />
                <YAxis stroke="#c0c0d8" tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e0e0f0', fontFamily: 'Nunito,sans-serif', fontSize: 12 }} />
                <Bar dataKey="bookings" radius={[8, 8, 0, 0]} name="Bookings">
                  {MONTHLY_REVENUE.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#049edf' : '#6c63ff'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

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

        <div className="bookings-card">
          <div className="bookings-header">
            <h3 className="bookings-title">Recent Bookings</h3>
            <button className="view-all-btn" onClick={() => changeTab('bookings')}>
              View All <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="bookings-table-wrap">
            <table className="bookings-table">
              <thead>
                <tr>{['Booking ID', 'Client', 'Site Location', 'Duration', 'Amount', 'Status'].map(h => <th key={h}>{h}</th>)}</tr>
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
  };

  /* ── Route ── */
  const renderContent = () => {
    switch (tab) {
      case 'new-hoarding': return <Hoarding />;
      case 'hoarding-expense': return <Hoardingexpense />;
      case 'land-contract': return <LandContract />;
      case 'bookings': return <Placeholder title="Bookings" Icon={CalendarCheck} />;
      case 'clients': return <Placeholder title="Clients" Icon={Users} />;
      case 'owners': return <OwnerPage />;
      case 'payments': return <Placeholder title="Payments" Icon={CreditCard} />;
      case 'sites': return <SitePage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="dashboard-root">
      <div className="bg-blobs" aria-hidden="true">
        <div className="blob-1" /><div className="blob-2" /><div className="blob-3" />
      </div>

      {isMobile && mobileMenu && (
        <div className="mobile-overlay" onClick={() => setMobileMenu(false)} />
      )}

      {!isMobile && (
        <aside className="sidebar-desktop"><SideInner /></aside>
      )}

      {isMobile && (
        <aside className={`sidebar-mobile${mobileMenu ? ' open' : ''}`}>
          <button className="mobile-close-btn" onClick={() => setMobileMenu(false)}>
            <X size={18} />
          </button>
          <SideInner />
        </aside>
      )}

      <div className={`main-area${isMobile ? ' mobile' : ''}`}>
        <header className="topbar">
          <div className="topbar-left">
            {isMobile && (
              <button className="hamburger-btn" onClick={() => setMobileMenu(v => !v)}>
                {mobileMenu ? <X size={19} /> : <Menu size={19} />}
              </button>
            )}
          </div>
          <div className="topbar-right">
            <div ref={dropRef} style={{ position: 'relative' }}>
              <button className="profile-btn" onClick={() => setDropOpen(v => !v)}>
                <div className="profile-avatar">{adminName.charAt(0).toUpperCase()}</div>
                <span className="profile-name">{adminName}</span>
                <ChevronDown
                  size={12} color="#9090a8"
                  style={{ transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                />
              </button>
              {dropOpen && (
                <div className="profile-dropdown">
                  <button className="dropdown-logout" onClick={handleLogout}>
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}