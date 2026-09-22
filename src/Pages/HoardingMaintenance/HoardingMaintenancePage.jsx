import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import MaintenanceList from './MaintenanceList';
import MaintenanceCreate from './MaintenanceCreate';
import MaintenanceDetails from './MaintenanceDetails';

export default function HoardingMaintenancePage({ changeTab }) {
  const [view, setView] = useState(() => {
    const savedView = sessionStorage.getItem('hoarding_maint_view');
    if (savedView) {
      sessionStorage.removeItem('hoarding_maint_view');
      return savedView;
    }
    return 'list';
  });
  const [selectedId, setSelectedId] = useState(() => {
    const savedId = sessionStorage.getItem('hoarding_maint_selected_id');
    if (savedId) {
      sessionStorage.removeItem('hoarding_maint_selected_id');
      return Number(savedId) || savedId;
    }
    return null;
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'info' }

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  const handleView = useCallback((id) => {
    setSelectedId(id);
    setView('details');
  }, []);

  const handleOpenCreate = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleCloseCreate = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleBackToList = useCallback(() => {
    setView('list');
    setSelectedId(null);
  }, []);

  const handleCreated = useCallback((newId) => {
    setShowCreateModal(false);
    setRefreshTrigger((prev) => prev + 1);
    if (newId) {
      setSelectedId(newId);
      setView('details');
    }
  }, []);

  // Determine user roles
  const storedData = (() => {
    try {
      return JSON.parse(localStorage.getItem('userData') || '{}');
    } catch {
      return {};
    }
  })();
  const userRole = (storedData.role || localStorage.getItem('userRole') || '').toLowerCase();
  const isAdmin = userRole === 'admin' || storedData.isAdmin === true;
  const isSupervisor = userRole === 'supervisor' || storedData.isSupervisor === true;
  const canCreate = !userRole || isAdmin || isSupervisor;

  return (
    <div className="maintenance-page-wrapper" style={{ width: '100%', minHeight: '100%' }}>
      {/* List View */}
      {view === 'list' && (
        <MaintenanceList
          onView={handleView}
          onCreate={handleOpenCreate}
          canCreate={canCreate}
          refreshTrigger={refreshTrigger}
          changeTab={changeTab}
        />
      )}

      {/* Details View */}
      {view === 'details' && (
        <MaintenanceDetails
          maintenanceId={selectedId}
          onBack={handleBackToList}
          showToast={showToast}
          changeTab={changeTab}
        />
      )}

      {/* Create Modal (Portal popup over page like Opportunity.jsx) */}
      {showCreateModal && (
        <MaintenanceCreate
          onCancel={handleCloseCreate}
          onCreated={handleCreated}
          showToast={showToast}
        />
      )}

      {/* Floating Toast Notification */}
      {toast &&
        ReactDOM.createPortal(
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 18px',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 500,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)',
              backgroundColor:
                toast.type === 'error'
                  ? '#dc2626'
                  : toast.type === 'info'
                  ? '#2563eb'
                  : '#16a34a',
              animation: 'slideInUp 0.25s ease-out forwards',
            }}
          >
            {toast.type === 'error' ? (
              <AlertCircle size={18} />
            ) : toast.type === 'info' ? (
              <Info size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
                padding: '2px',
                marginLeft: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
