import { useState, useEffect, useRef } from 'react';
import {
  LogOut, Menu, X, ChevronDown, ChevronRight,
  IndianRupee, Users, MapPin, Layers, UserCircle, Hash, FileX,
  FileText, BarChart3, PlusSquare, Banknote, bibriefcase, Briefcase, CreditCard, UserRoundPlus
} from 'lucide-react';
// import Chatbot from './Chatbot';
import Notification from './Notification';
import './Layout.css';

/* ─────────────────────────────────────
   MENU CONFIG
───────────────────────────────────── */
const MENU = [
  {
    id: 'job',
    icon: Briefcase,
    label: 'Job',
    badge: null,
    children: [
      { id: 'Jobs', icon: Briefcase, label: 'Jobs', badge: null },
      { id: 'JobPayment', icon: CreditCard, label: 'Job Payment', badge: null },
    ]
  },
  {
    id: 'customer',
    icon: Users,
    label: 'Customer',
    badge: null,
    children: [
      { id: 'customer-details', icon: UserCircle, label: 'Customer Details' },
      { id: 'quotation', icon: BarChart3, label: 'Quotation' },
      { id: 'customer-contract', icon: FileText, label: 'Customer Contract' },
      { id: 'DissloveContract', icon: FileX, label: 'Dissolve Contract' },

    ],
  },
  { id: 'owners', icon: UserCircle, label: 'LandLord', badge: null },
  { id: 'sites', icon: MapPin, label: 'Sites', badge: null },
  { id: 'Registration', icon: UserRoundPlus, label: 'Registration', badge: null },

  {
    id: 'hoardings',
    icon: Layers,
    label: 'Hoardings',
    badge: null,
    children: [
      { id: 'new-hoarding', icon: PlusSquare, label: 'Maintain Hoarding' },
      { id: 'hoarding-expense', icon: IndianRupee, label: 'Hoarding Expense' },
      // { id: 'hoarding-merge', icon: Layers, label: 'Hoarding Merge' },
    ],
  },
  { id: 'reports', icon: BarChart3, label: 'Reports', badge: null },

  {
    id: 'land-contract',
    icon: FileText,
    label: 'Land Contracts',
    badge: null,
    children: [
      { id: 'land-contracts', icon: FileText, label: 'Land Contracts' },
      { id: 'land-payment', icon: Banknote, label: 'Land Payment' },
      { id: 'vendors', icon: Users, label: 'Vendor' },
    ],
  },
  //  { id: 'Jobs', icon: Briefcase, label: 'Jobs', badge: null },
  {
    id: 'configuration',
    icon: FileText,
    label: 'Configuration',
    badge: null,
    children: [
      { id: 'terms', icon: FileText, label: 'Terms' },
      { id: 'FinancialYear', icon: FileText, label: 'Financial Year' },
      { id: 'SeriesSetup', icon: Hash, label: 'Series Setup' },
      { id: 'ExpenseType', icon: FileText, label: 'Hoarding Expense Type' },
      { id: 'CompanyDetails', icon: FileText, label: 'Company Details' },
    ],
  },
];

/* ── Build lookup maps ── */
const CHILD_TO_PARENT = {};
MENU.forEach(item => {
  item.children?.forEach(child => { CHILD_TO_PARENT[child.id] = item.id; });
});
const PARENT_IDS = MENU.filter(item => item.children?.length).map(item => item.id);

/* ── Responsive hook ── */
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
   LAYOUT COMPONENT
   Props: tab, changeTab, onLogout, children
═══════════════════════════════════════════ */
export default function Layout({ tab, changeTab, onLogout, children }) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [adminName, setAdminName] = useState('Admin');

  /* Expand the parent that owns the active child on first render */
  const [expandedMenus, setExpandedMenus] = useState(() => {
    const initial = {};
    PARENT_IDS.forEach(parentId => {
      const childIds = MENU.find(m => m.id === parentId)?.children?.map(c => c.id) ?? [];
      initial[parentId] = childIds.includes(tab);
    });
    return initial;
  });

  const dropRef = useRef(null);
  const width = useWindowWidth();
  const isMobile = width < 1024;

  /* Read admin name from localStorage */
  useEffect(() => {
    const s = JSON.parse(localStorage.getItem('userData') || '{}');
    setAdminName(
      `${s?.first_Name || ''} ${s?.last_Name || ''}`.trim() ||
      s?.name ||
      s?.Name ||
      'Admin'
    );
  }, []);

  /* Close profile dropdown on outside click */
  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* Scroll to top whenever the active tab changes */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [tab]);

  /* ── Internal tab change: closes mobile drawer + syncs expanded menus ── */
  const handleTabChange = (id) => {
    changeTab(id);          // lift state up to App.js
    setMobileMenu(false);
    const parentId = CHILD_TO_PARENT[id] ?? null;
    setExpandedMenus(() => {
      const next = {};
      PARENT_IDS.forEach(pid => { next[pid] = pid === parentId; });
      return next;
    });
  };

  /* ── Parent menu item click: toggle accordion OR navigate ── */
  const handleParentClick = (item) => {
    if (item.children?.length) {
      setExpandedMenus(prev => {
        const next = {};
        PARENT_IDS.forEach(pid => {
          next[pid] = pid === item.id ? !prev[item.id] : false;
        });
        return next;
      });
    } else {
      handleTabChange(item.id);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('dashTab');
    localStorage.clear();
    window.history.replaceState({}, document.title, '/');
    onLogout?.();
  };

  const isParentActive = (item) =>
    item.children?.some(c => c.id === tab) ?? false;

  /* ══════════════════════════════════════
     SIDEBAR CONTENT (used for both
     desktop sidebar and mobile drawer)
  ══════════════════════════════════════ */
  const SideInner = () => (
    <div className="sidebar-inner">
      {/* Logo */}
      <div className="sidebar-logo-area">
        <div
          className="sidebar-logo-img-wrap"
          onClick={() => handleTabChange('dashboard')}
          style={{ cursor: 'pointer' }}
        >
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
          const isSelfActive = tab === id;
          const isExpanded = !!expandedMenus[id];
          const isActive = parentActive || isSelfActive;

          const parentBtnStyle = isActive
            ? {
              background: 'rgba(4,158,223,0.13)',
              color: '#049edf',
              borderLeft: '3px solid #049edf',
              paddingLeft: 'calc(1rem - 3px)',
              fontWeight: 700,
            }
            : {
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
                  style={{ color: isActive ? '#049edf' : undefined }}
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

              {/* Animated submenu */}
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
                    return (
                      <button
                        key={cid}
                        onClick={() => handleTabChange(cid)}
                        className="nav-sub-btn"
                        style={
                          isChildActive
                            ? { background: 'rgba(4,158,223,0.10)', color: '#049edf', fontWeight: 700 }
                            : {}
                        }
                      >
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
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="dashboard-root">

      {/* Background blobs */}
      <div className="bg-blobs" aria-hidden="true">
        <div className="blob-1" />
        <div className="blob-2" />
        <div className="blob-3" />
      </div>

      {/* Mobile drawer backdrop */}
      {isMobile && mobileMenu && (
        <div className="mobile-overlay" onClick={() => setMobileMenu(false)} />
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="sidebar-desktop"><SideInner /></aside>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <aside className={`sidebar-mobile${mobileMenu ? ' open' : ''}`}>
          <button className="mobile-close-btn" onClick={() => setMobileMenu(false)}>
            <X size={18} />
          </button>
          <SideInner />
        </aside>
      )}

      {/* Main content area */}
      <div className={`main-area${isMobile ? ' mobile' : ''}`}>

        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            {isMobile && (
              <button className="hamburger-btn" onClick={() => setMobileMenu(v => !v)}>
                {mobileMenu ? <X size={19} /> : <Menu size={19} />}
              </button>
            )}
          </div>

          <div className="topbar-right">
            {/* Notification Bell Dropdown & Toasts */}
            {/* <Notification handleTabChange={handleTabChange} />*/}

            <div ref={dropRef} style={{ position: 'relative' }}>
              <button className="profile-btn" onClick={() => setDropOpen(v => !v)}>
                <div className="profile-avatar">
                  {adminName.charAt(0).toUpperCase()}
                </div>
                <span className="profile-name">{adminName}</span>
                <ChevronDown
                  size={12}
                  color="#9090a8"
                  style={{
                    transform: dropOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                  }}
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

        {/* Page content (injected by App.js) */}
        <main className="page-content">
          {children}
        </main>

        {/* <Chatbot /> */}
      </div>
    </div>
  );
}