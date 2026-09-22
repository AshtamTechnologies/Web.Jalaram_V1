import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Wrench,
  Layers,
  Calendar,
  User,
  Clock,
  IndianRupee,
  FileText,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Archive,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  AlertCircle,
  Loader2,
  ShieldAlert,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import { apiService } from '../../api/api';
import StatusBadge from '../../components/hoardingMaintenance/StatusBadge';
import PriorityBadge from '../../components/hoardingMaintenance/PriorityBadge';
import PhotoGallery from '../../components/hoardingMaintenance/PhotoGallery';
import ConfirmDialog from '../../components/hoardingMaintenance/ConfirmDialog';
import CompleteDialog from '../../components/hoardingMaintenance/CompleteDialog';
import CancelDialog from '../../components/hoardingMaintenance/CancelDialog';
import AddPhotosDialog from '../../components/hoardingMaintenance/AddPhotosDialog';
import { MAINTENANCE_STATUSES } from '../../constants/maintenanceConstants';
import '../Common1.css';

export default function MaintenanceDetails({
  maintenanceId,
  onBack,
  showToast,
  changeTab,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [showStartWorkConfirm, setShowStartWorkConfirm] = useState(false);
  const [showPromptUploadConfirm, setShowPromptUploadConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showAddPhotosDialog, setShowAddPhotosDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);

  const storedData = (() => {
    try {
      return JSON.parse(localStorage.getItem('userData') || '{}');
    } catch {
      return {};
    }
  })();
  const roleId = Number(localStorage.getItem('roleId') || storedData.roleId || storedData.role_Id || 0);
  const currentUserRole = (storedData.role || localStorage.getItem('userRole') || '').toLowerCase();
  const isAdmin = currentUserRole === 'admin' || storedData.isAdmin === true || roleId === 1;
  const isSupervisor = currentUserRole === 'supervisor' || storedData.isSupervisor === true || roleId === 2;
  const canManageWork = !currentUserRole || isAdmin || isSupervisor;
  const currentUserId = Number(storedData.id || storedData.userId || localStorage.getItem('userId') || 0);

  const isSubmittingRef = React.useRef(false);
  const isFetchingRef = React.useRef(false);

  const handleHoardingClick = (e) => {
    if (!isAdmin || !data) return;
    e.stopPropagation();
    sessionStorage.setItem('hoarding_return_tab', 'hoarding-maintenance');
    sessionStorage.setItem('hoarding_return_maint_view', 'details');
    if (data.maintenanceID) sessionStorage.setItem('hoarding_return_maint_id', String(data.maintenanceID));
    if (data.hoardingCode) sessionStorage.setItem('open_hoarding_code', data.hoardingCode);
    if (data.hoardingID) sessionStorage.setItem('open_hoarding_id', String(data.hoardingID));
    if (changeTab) {
      changeTab('new-hoarding');
    } else {
      sessionStorage.setItem('dashTab', 'new-hoarding');
      window.location.reload();
    }
  };

  // Fetch Details
  const fetchDetails = useCallback(async (isRefresh = false) => {
    if (!maintenanceId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [res, addressData] = await Promise.all([
        apiService.getHoardingMaintenanceById(maintenanceId),
        apiService.getHoardingAddressMap().catch(() => null),
      ]);
      if (res && (!res.siteAddress || res.siteAddress === '—' || res.siteAddress.startsWith('HD-')) && addressData) {
        const { byIdMap, byCodeMap } = addressData;
        const matched =
          (res.hoardingID && byIdMap ? (byIdMap.get(String(res.hoardingID)) || byIdMap.get(Number(res.hoardingID))) : null) ||
          (res.hoardingCode && byCodeMap ? (byCodeMap.get(res.hoardingCode.toLowerCase().trim()) || byCodeMap.get(res.hoardingCode.toLowerCase().replace(/[\s\-_]/g, ''))) : null);
        if (matched?.fullAddress) {
          res.siteAddress = matched.fullAddress;
        }
      }
      setData(res);
    } catch (err) {
      console.error('Failed to load maintenance details:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Failed to load maintenance details.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [maintenanceId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Action: Start Work (Open -> In Progress)
  const handleStartWork = async () => {
    if (actionLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setActionLoading(true);
    setShowStartWorkConfirm(false);
    try {
      const formData = new FormData();
      formData.append('New_Status', MAINTENANCE_STATUSES.IN_PROGRESS);
      formData.append('NewStatus', MAINTENANCE_STATUSES.IN_PROGRESS);
      formData.append('newStatus', MAINTENANCE_STATUSES.IN_PROGRESS);
      formData.append('Status', MAINTENANCE_STATUSES.IN_PROGRESS);
      formData.append('status', MAINTENANCE_STATUSES.IN_PROGRESS);
      formData.append('Remarks', 'Work started on maintenance request.');
      formData.append('remarks', 'Work started on maintenance request.');
      formData.append('Maintenance_Cost', '0');
      formData.append('MaintenanceCost', '0');

      await apiService.updateMaintenanceStatus(maintenanceId, formData);
      if (showToast) showToast('Maintenance status updated to In Progress.', 'success');
      await fetchDetails(true);
      setShowPromptUploadConfirm(true);
    } catch (err) {
      console.error('Start work failed:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to start work.';
      if (showToast) showToast(msg, 'error');
    } finally {
      setActionLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Action: Complete Work (In Progress -> Completed)
  const handleCompleteWork = async (formData) => {
    if (actionLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setActionLoading(true);
    setShowCompleteDialog(false);
    try {
      await apiService.updateMaintenanceStatus(maintenanceId, formData);
      if (showToast) showToast('Maintenance marked as Completed!', 'success');
      await fetchDetails(true);
    } catch (err) {
      console.error('Complete work failed:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to complete maintenance.';
      if (showToast) showToast(msg, 'error');
    } finally {
      setActionLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Action: Close Maintenance (Completed -> Closed, Admin only)
  const handleCloseMaintenance = async () => {
    if (actionLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setActionLoading(true);
    setShowCloseConfirm(false);
    try {
      const formData = new FormData();
      formData.append('New_Status', MAINTENANCE_STATUSES.CLOSED);
      formData.append('NewStatus', MAINTENANCE_STATUSES.CLOSED);
      formData.append('newStatus', MAINTENANCE_STATUSES.CLOSED);
      formData.append('Status', MAINTENANCE_STATUSES.CLOSED);
      formData.append('status', MAINTENANCE_STATUSES.CLOSED);
      formData.append('Remarks', 'Maintenance request reviewed and closed.');
      formData.append('remarks', 'Maintenance request reviewed and closed.');
      formData.append('Maintenance_Cost', '0');
      formData.append('MaintenanceCost', '0');

      await apiService.updateMaintenanceStatus(maintenanceId, formData);
      if (showToast) showToast('Maintenance request closed.', 'success');
      await fetchDetails(true);
    } catch (err) {
      console.error('Close maintenance failed:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to close maintenance.';
      if (showToast) showToast(msg, 'error');
    } finally {
      setActionLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Action: Reopen Maintenance (Completed / Closed -> Open, Admin only)
  const handleReopenMaintenance = async () => {
    if (actionLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setActionLoading(true);
    setShowReopenConfirm(false);
    try {
      const formData = new FormData();
      formData.append('New_Status', MAINTENANCE_STATUSES.OPEN);
      formData.append('NewStatus', MAINTENANCE_STATUSES.OPEN);
      formData.append('newStatus', MAINTENANCE_STATUSES.OPEN);
      formData.append('Status', MAINTENANCE_STATUSES.OPEN);
      formData.append('status', MAINTENANCE_STATUSES.OPEN);
      formData.append('Remarks', 'Maintenance request reopened by Admin.');
      formData.append('remarks', 'Maintenance request reopened by Admin.');
      formData.append('Maintenance_Cost', '0');
      formData.append('MaintenanceCost', '0');

      await apiService.updateMaintenanceStatus(maintenanceId, formData);
      if (showToast) showToast('Maintenance request reopened to Open status.', 'success');
      await fetchDetails(true);
    } catch (err) {
      console.error('Reopen maintenance failed:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to reopen maintenance.';
      if (showToast) showToast(msg, 'error');
    } finally {
      setActionLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Action: Cancel Maintenance
  const handleCancelMaintenance = async (formData) => {
    if (actionLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setActionLoading(true);
    setShowCancelDialog(false);
    try {
      await apiService.updateMaintenanceStatus(maintenanceId, formData);
      if (showToast) showToast('Maintenance request cancelled.', 'success');
      await fetchDetails(true);
    } catch (err) {
      console.error('Cancel maintenance failed:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to cancel maintenance.';
      if (showToast) showToast(msg, 'error');
    } finally {
      setActionLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Action: Add Photos
  const handleAddPhotos = async (formData) => {
    if (actionLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setActionLoading(true);
    setShowAddPhotosDialog(false);
    try {
      await apiService.addMaintenancePhotos(maintenanceId, formData);
      if (showToast) showToast('Photos uploaded successfully!', 'success');
      await fetchDetails(true);
    } catch (err) {
      console.error('Add photos failed:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to upload photos.';
      if (showToast) showToast(msg, 'error');
    } finally {
      setActionLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Action: Delete Photo
  const handleDeletePhoto = async (photoId) => {
    if (deletingPhotoId || actionLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setDeletingPhotoId(photoId);
    try {
      await apiService.deleteMaintenancePhoto(photoId);
      if (showToast) showToast('Photo deleted successfully.', 'success');
      await fetchDetails(true);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete photo.';
      if (showToast) showToast(msg, 'error');
    } finally {
      setDeletingPhotoId(null);
      isSubmittingRef.current = false;
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  if (loading) {
    return (
      <div className="pg-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
          <Loader2 size={32} color="#049edf" className="pg-spin" />
          <span style={{ fontFamily: 'Nunito, sans-serif', color: '#9090a8', fontSize: 14 }}>
            Loading maintenance details…
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="pg-page">
        <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
          <AlertCircle size={36} color="#dc2626" style={{ marginBottom: 12 }} />
          <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>
            Failed to Load Maintenance
          </h3>
          <p style={{ color: '#7878a0', fontSize: 13.5, marginBottom: 20 }}>{error || 'Maintenance record not found.'}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button type="button" className="pg-btn-cancel" onClick={onBack}>
              <ArrowLeft size={13} /> Back to List
            </button>
            <button type="button" className="pg-btn-add" onClick={() => fetchDetails()}>
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isClosedOrCancelled = data.status === MAINTENANCE_STATUSES.CLOSED || data.status === MAINTENANCE_STATUSES.CANCELLED;
  const isCompleted = data.status === MAINTENANCE_STATUSES.COMPLETED;
  const isInProgress = data.status === MAINTENANCE_STATUSES.IN_PROGRESS;
  const canStartWork = data.status === MAINTENANCE_STATUSES.OPEN && canManageWork;
  const canCompleteWork = isInProgress && canManageWork;
  const canAddPhotos = isAdmin ? !isClosedOrCancelled : (isInProgress && canManageWork);
  const canClose = isCompleted && isAdmin;
  const canReopen = isCompleted && isAdmin;
  const canCancel = !isClosedOrCancelled && !isCompleted && isAdmin;

  return (
    <div className="pg-page">
      {/* Top Header */}
      <div className="pg-header" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="pg-btn-cancel"
            onClick={onBack}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="pg-header__title" style={{ margin: 0 }}>
                Maintenance #{data.maintenanceID}
              </h1>
              <StatusBadge status={data.status} size="lg" />
              <PriorityBadge priority={data.priority} size="lg" />
            </div>
            <p className="pg-header__subtitle" style={{ margin: '3px 0 0' }}>
              Hoarding:{' '}
              <strong
                onClick={isAdmin ? handleHoardingClick : undefined}
                style={{
                  color: '#049edf',
                  cursor: isAdmin ? 'pointer' : 'default',
                  textDecoration: isAdmin ? 'underline' : 'none',
                }}
                title={isAdmin ? `Click to view/edit hoarding ${data.hoardingCode}` : undefined}
              >
                {data.hoardingCode}
              </strong>{' '}
              · Reason: <strong>{data.reasonName}</strong>
              {data.siteAddress && data.siteAddress !== '—' && (
                <> · Site: <strong>{data.siteAddress}</strong></>
              )}
            </p>
          </div>
        </div>

        {/* Right Toolbar / Actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="pg-btn-cancel"
            onClick={() => fetchDetails(true)}
            disabled={refreshing || actionLoading}
            title="Refresh maintenance details"
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <RefreshCw size={13} className={refreshing ? 'pg-spin' : ''} /> Refresh
          </button>

          {/* Action: Open -> Start Work (Admin & Supervisor) */}
          {canStartWork && (
            <button
              type="button"
              onClick={() => setShowStartWorkConfirm(true)}
              disabled={actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                color: '#fff',
                border: 'none',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(2, 132, 199, 0.3)',
              }}
            >
              <PlayCircle size={14} /> Start Work
            </button>
          )}

          {/* Action: In Progress -> Complete Work (Admin & Supervisor) */}
          {canCompleteWork && (
            <button
              type="button"
              onClick={() => setShowCompleteDialog(true)}
              disabled={actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#fff',
                border: 'none',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(22, 163, 74, 0.3)',
              }}
            >
              <CheckCircle2 size={14} /> Complete Work
            </button>
          )}

          {/* Action: Completed -> Reopen Request (Admin Only) */}
          {canReopen && (
            <button
              type="button"
              onClick={() => setShowReopenConfirm(true)}
              disabled={actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                border: 'none',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(217, 119, 6, 0.3)',
              }}
              title="Reopen maintenance request back to Open status"
            >
              <RotateCcw size={14} /> Reopen Request
            </button>
          )}

          {/* Action: Completed -> Close (Admin Only) */}
          {canClose && (
            <button
              type="button"
              onClick={() => setShowCloseConfirm(true)}
              disabled={actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #475569, #334155)',
                color: '#fff',
                border: 'none',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(71, 85, 105, 0.3)',
              }}
            >
              <Archive size={14} /> Close Request
            </button>
          )}

          {/* Action: Add Photos (Admin & Supervisor) */}
          {canAddPhotos && (
            <button
              type="button"
              className="pg-btn-add"
              onClick={() => setShowAddPhotosDialog(true)}
              disabled={actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
              }}
            >
              <Plus size={13} /> Add Photos
            </button>
          )}

          {/* Action: Cancel (Admin Only) */}
          {canCancel && (
            <button
              type="button"
              onClick={() => setShowCancelDialog(true)}
              disabled={actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                background: '#fef2f2',
                color: '#dc2626',
                border: '1.5px solid #fecaca',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 800,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              <XCircle size={13} /> Cancel Request
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="row g-3">
        <div className="col-12">
          {/* Key Information Card */}
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1.5px solid #e8e8f4',
              padding: '20px 24px',
              marginBottom: 16,
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                borderBottom: '1.5px solid #f0f0f8',
                paddingBottom: 10,
              }}
            >
              <Wrench size={16} color="#049edf" />
              <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 15, color: '#1a1a2e' }}>
                Maintenance Information
              </span>
            </div>

            <div className="row g-3">
              <div className="col-12 col-sm-6">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: '#8c8ca1',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Reason for Maintenance
                  </span>
                  <div
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontWeight: 800,
                      fontSize: 14,
                      color: '#1a1a2e',
                    }}
                  >
                    {data.reasonName}
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: '#8c8ca1',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Hoarding Identifier
                  </span>
                  <div
                    onClick={isAdmin ? handleHoardingClick : undefined}
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontWeight: 800,
                      fontSize: 14,
                      color: '#049edf',
                      cursor: isAdmin ? 'pointer' : 'default',
                      textDecoration: isAdmin ? 'underline' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      width: 'fit-content',
                    }}
                    title={isAdmin ? `Click to view/edit hoarding ${data.hoardingCode}` : undefined}
                  >
                    {data.hoardingCode}
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: '#8c8ca1',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Site Address / Location
                  </span>
                  <div
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontWeight: 700,
                      fontSize: 13.5,
                      color: '#1a1a2e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <MapPin size={13} color="#049edf" style={{ flexShrink: 0 }} />
                    <span>{data.siteAddress || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: '#8c8ca1',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Reported By & Date
                  </span>
                  <div
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontWeight: 700,
                      fontSize: 13.5,
                      color: '#1a1a2e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <User size={12} color="#9090a8" style={{ flexShrink: 0 }} />
                    <span>{data.reportedByName || (data.reportedBy ? `User #${data.reportedBy}` : 'Admin')}</span>
                    <span style={{ color: '#9090a8' }}>·</span>
                    <span>{formatDate(data.reportedDate)}</span>
                  </div>
                </div>
              </div>

              {data.assignedToName && (
                <div className="col-12 col-sm-6">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span
                      style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#8c8ca1',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Assigned To
                    </span>
                    <div
                      style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontWeight: 700,
                        fontSize: 13.5,
                        color: '#1a1a2e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <User size={12} color="#049edf" style={{ flexShrink: 0 }} />
                      <span>{data.assignedToName}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="col-12 col-sm-6">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: '#8c8ca1',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Target Resolution Date
                  </span>
                  <div
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontWeight: 700,
                      fontSize: 13.5,
                      color: '#1a1a2e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Calendar size={12} color="#9090a8" style={{ flexShrink: 0 }} />
                    <span>{formatDate(data.targetDate)}</span>
                  </div>
                </div>
              </div>

              {data.completedDate && (
                <div className="col-12 col-sm-6">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span
                      style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#8c8ca1',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Completion Date
                    </span>
                    <div
                      style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontWeight: 700,
                        fontSize: 13.5,
                        color: '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <CheckCircle2 size={13} color="#16a34a" style={{ flexShrink: 0 }} />
                      <span>{formatDate(data.completedDate)}</span>
                    </div>
                  </div>
                </div>
              )}

              {data.description && (
                <div className="col-12">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span
                      style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#8c8ca1',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Issue Description
                    </span>
                    <div
                      style={{
                        background: '#fafafd',
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: '1px solid #f0f0f8',
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: 13.5,
                        color: '#334155',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {data.description}
                    </div>
                  </div>
                </div>
              )}

              {data.remarks && (
                <div className="col-12">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span
                      style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#8c8ca1',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Latest Status Remarks
                    </span>
                    <div
                      style={{
                        background: '#f0fdf4',
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: '1px solid #bbf7d0',
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: 13.5,
                        color: '#166534',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {data.remarks}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Photo Gallery Card */}
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1.5px solid #e8e8f4',
              padding: '20px 24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <ImageIcon size={16} color="#049edf" />
              <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 15, color: '#1a1a2e' }}>
                Maintenance Photos ({data.photos?.length || 0})
              </span>
            </div>

            <PhotoGallery
              photos={data.photos || []}
              onDeletePhoto={handleDeletePhoto}
              canDelete={!isClosedOrCancelled && isAdmin}
              deletingPhotoId={deletingPhotoId}
            />
          </div>
        </div>
      </div>

      {/* Confirmation: Start Work */}
      {showStartWorkConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Start Maintenance Work"
          message={`Are you sure you want to mark maintenance #${data.maintenanceID} for hoarding "${data.hoardingCode}" as In Progress?`}
          confirmText="Yes, Start Work"
          cancelText="Cancel"
          variant="primary"
          loading={actionLoading}
          onConfirm={handleStartWork}
          onCancel={() => setShowStartWorkConfirm(false)}
        />
      )}

      {/* Confirmation: Prompt Upload Photos after Start Work */}
      {showPromptUploadConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Upload Maintenance Photos?"
          message="Maintenance work has been started. Would you like to upload photos for this request now?"
          confirmText="Yes, Upload Photos"
          cancelText="No, Later"
          variant="primary"
          onConfirm={() => {
            setShowPromptUploadConfirm(false);
            setShowAddPhotosDialog(true);
          }}
          onCancel={() => setShowPromptUploadConfirm(false)}
        />
      )}

      {/* Confirmation: Close Request (Admin Only) */}
      {showCloseConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Close Maintenance Request"
          message={`Are you sure you want to officially close maintenance request #${data.maintenanceID}? This confirms the work is verified and will archive the request.`}
          confirmText="Yes, Close Request"
          cancelText="Cancel"
          variant="primary"
          loading={actionLoading}
          onConfirm={handleCloseMaintenance}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}

      {/* Confirmation: Reopen Request (Admin Only) */}
      {showReopenConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Reopen Maintenance Request"
          message={`Are you sure you want to reopen maintenance request #${data.maintenanceID} for hoarding "${data.hoardingCode}" back to Open status?`}
          confirmText="Yes, Reopen Request"
          cancelText="Cancel"
          variant="warning"
          loading={actionLoading}
          onConfirm={handleReopenMaintenance}
          onCancel={() => setShowReopenConfirm(false)}
        />
      )}

      {/* Complete Dialog */}
      {showCompleteDialog && (
        <CompleteDialog
          isOpen={true}
          maintenance={data}
          loading={actionLoading}
          onClose={() => setShowCompleteDialog(false)}
          onSubmit={handleCompleteWork}
        />
      )}

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <CancelDialog
          isOpen={true}
          maintenance={data}
          loading={actionLoading}
          onClose={() => setShowCancelDialog(false)}
          onSubmit={handleCancelMaintenance}
        />
      )}

      {/* Add Photos Dialog */}
      {showAddPhotosDialog && (
        <AddPhotosDialog
          isOpen={true}
          maintenance={data}
          loading={actionLoading}
          onClose={() => setShowAddPhotosDialog(false)}
          onSubmit={handleAddPhotos}
        />
      )}
    </div>
  );
}
