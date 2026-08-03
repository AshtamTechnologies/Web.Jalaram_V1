import { useState, useEffect, useRef } from 'react';
import {
    LogOut, Menu, X, ChevronDown, ChevronRight,
    Layers, MapPin, Briefcase, BarChart3, CheckSquare, HardHat, CreditCard, Lightbulb
} from 'lucide-react';
import './SupervisorLayout.css';

/* ─────────────────────────────────────
   SUPERVISOR MENU
───────────────────────────────────── */
const SUP_MENU = [
    // { id: 'sup-dashboard', icon: BarChart3,  label: 'Dashboard' },
    { id: 'sup-jobs', icon: Briefcase, label: 'Jobs' },  // ← fixed: was 'sup-hoardings'
    { id: 'workers', icon: HardHat, label: 'Workers' },
    { id: 'sup-payment', icon: CreditCard, label: 'Payments' },
    { id: 'opportunity', icon: Lightbulb, label: 'Opportunity' },
];

/* ── Lookup maps ── */
const SUP_CHILD_TO_PARENT = {};
SUP_MENU.forEach(item => {
    item.children?.forEach(child => { SUP_CHILD_TO_PARENT[child.id] = item.id; });
});
const SUP_PARENT_IDS = SUP_MENU.filter(i => i.children?.length).map(i => i.id);

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
   SUPERVISOR LAYOUT
═══════════════════════════════════════════ */
export default function SupervisorLayout({ tab, changeTab, onLogout, children }) {
    const [mobileMenu, setMobileMenu] = useState(false);
    const [dropOpen, setDropOpen] = useState(false);
    const [supName, setSupName] = useState('Supervisor');

    const [expandedMenus, setExpandedMenus] = useState(() => {
        const initial = {};
        SUP_PARENT_IDS.forEach(parentId => {
            const childIds = SUP_MENU.find(m => m.id === parentId)?.children?.map(c => c.id) ?? [];
            initial[parentId] = childIds.includes(tab);
        });
        return initial;
    });

    const dropRef = useRef(null);
    const width = useWindowWidth();
    const isMobile = width < 1024;

    useEffect(() => {
        const s = JSON.parse(localStorage.getItem('userData') || '{}');
        setSupName(
            `${s?.first_Name || ''} ${s?.last_Name || ''}`.trim() ||
            s?.name || s?.Name || 'Supervisor'
        );
    }, []);

    useEffect(() => {
        const h = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [tab]);

    const handleTabChange = (id) => {
        changeTab(id);
        setMobileMenu(false);
        const parentId = SUP_CHILD_TO_PARENT[id] ?? null;
        setExpandedMenus(() => {
            const next = {};
            SUP_PARENT_IDS.forEach(pid => { next[pid] = pid === parentId; });
            return next;
        });
    };

    const handleParentClick = (item) => {
        if (item.children?.length) {
            setExpandedMenus(prev => {
                const next = {};
                SUP_PARENT_IDS.forEach(pid => {
                    next[pid] = pid === item.id ? !prev[item.id] : false;
                });
                return next;
            });
        } else {
            handleTabChange(item.id);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('supTab');
        localStorage.clear();
        window.history.replaceState({}, document.title, '/');
        onLogout?.();
    };

    const isParentActive = (item) => item.children?.some(c => c.id === tab) ?? false;

    /* ══════════════════════════════════════
       SIDEBAR INNER
    ══════════════════════════════════════ */
    const SideInner = () => (
        <div className="sup-sidebar-inner">

            {/* Logo */}
            <div className="sup-sidebar-logo-area">
                <div
                    className="sup-sidebar-logo-img-wrap"
                    onClick={() => handleTabChange('sup-dashboard')}
                    style={{ cursor: 'pointer' }}
                >
                    <img
                        src="/logoimp.svg"
                        alt="Logo"
                        style={{ width: '100px', height: '100px', objectFit: 'contain', zIndex: 1 }}
                    />
                </div>
            </div>

            <div className="sup-sidebar-section-label">Main Menu</div>

            <nav className="sup-sidebar-nav">
                {SUP_MENU.map((item) => {
                    const { id, icon: Icon, label, children } = item;
                    const hasChildren = children?.length > 0;
                    const parentActive = isParentActive(item);
                    const isSelfActive = tab === id;
                    const isExpanded = !!expandedMenus[id];
                    const isActive = parentActive || isSelfActive;

                    return (
                        <div key={id}>
                            <button
                                onClick={() => handleParentClick(item)}
                                className="sup-nav-btn"
                                style={isActive ? {
                                    background: 'rgba(4, 158, 223, 0.13)',
                                    borderLeftColor: 'rgb(4, 158, 223)',
                                    color: 'rgb(4, 158, 223)',
                                    fontWeight: 800,
                                    paddingLeft: 'calc(-3px + 1rem)',
                                } : {}}
                            >
                                <div
                                    className="sup-nav-btn-icon"
                                    style={isActive ? {
                                        background: 'rgba(16, 123, 185, 0.14)',
                                        color: '#049edf',
                                    } : {}}
                                >
                                    <Icon size={17} />
                                </div>
                                <span className="sup-nav-btn-label">{label}</span>

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

                            {hasChildren && (
                                <div
                                    className="sup-nav-submenu"
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
                                                className="sup-nav-sub-btn"
                                                style={isChildActive ? {
                                                    background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(52,211,153,0.07))',
                                                    borderLeftColor: '#049edf',
                                                    color: '#049edf',
                                                    fontWeight: 800,
                                                } : {}}
                                            >
                                                <div style={{
                                                    width: '6px', height: '6px', borderRadius: '50%',
                                                    background: 'currentColor',
                                                    opacity: isChildActive ? 1 : 0.4,
                                                    flexShrink: 0, marginLeft: '4px',
                                                    transition: 'opacity 0.15s',
                                                }} />
                                                <div
                                                    className="sup-nav-btn-icon"
                                                    style={{
                                                        width: '28px', height: '28px', borderRadius: '8px',
                                                        background: isChildActive
                                                            ? 'rgba(16,185,129,0.12)'
                                                            : 'rgba(104,104,160,0.06)',
                                                        color: isChildActive ? '#049edf' : undefined,
                                                    }}
                                                >
                                                    <CIcon size={14} />
                                                </div>
                                                <span className="sup-nav-btn-label">{clabel}</span>
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

    return (
        <div className="sup-root">

            <div className="sup-bg-blobs" aria-hidden="true">
                <div className="sup-blob-1" />
                <div className="sup-blob-2" />
                <div className="sup-blob-3" />
            </div>

            {isMobile && mobileMenu && (
                <div className="sup-mobile-overlay" onClick={() => setMobileMenu(false)} />
            )}

            {!isMobile && (
                <aside className="sup-sidebar-desktop"><SideInner /></aside>
            )}

            {isMobile && (
                <aside className={`sup-sidebar-mobile${mobileMenu ? ' open' : ''}`}>
                    <button className="sup-mobile-close-btn" onClick={() => setMobileMenu(false)}>
                        <X size={18} />
                    </button>
                    <SideInner />
                </aside>
            )}

            <div className={`sup-main-area${isMobile ? ' mobile' : ''}`}>

                <header className="sup-topbar">
                    <div className="sup-topbar-left">
                        {isMobile && (
                            <button className="sup-hamburger-btn" onClick={() => setMobileMenu(v => !v)}>
                                {mobileMenu ? <X size={19} /> : <Menu size={19} />}
                            </button>
                        )}
                    </div>

                    <div className="sup-topbar-right">
                        <div ref={dropRef} style={{ position: 'relative' }}>
                            <button className="sup-profile-btn" onClick={() => setDropOpen(v => !v)}>
                                <div className="sup-profile-avatar">
                                    {supName.charAt(0).toUpperCase()}
                                </div>
                                <span className="sup-profile-name">{supName}</span>
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
                                <div className="sup-profile-dropdown">
                                    <button className="sup-dropdown-logout" onClick={handleLogout}>
                                        <LogOut size={14} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="sup-page-content">
                    {children}
                </main>

            </div>
        </div>
    );
}