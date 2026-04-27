import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { acknowledgeAlert } from '../firebase/firestoreService';
import Navbar from '../components/Navbar';
import './AshaWorkerDashboard.css';

const AshaWorkerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('patients');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      // Fetch real data from backend (Firebase Admin SDK)
      const [mothersRes, alertsRes] = await Promise.all([
        fetch('http://localhost:5000/api/admin/mothers'),
        fetch('http://localhost:5000/api/admin/alerts')
      ]);
      const { mothers } = await mothersRes.json();
      const { alerts } = await alertsRes.json();

      const riskOrder = { high: 0, medium: 1, low: 2, unknown: 3 };
      const patients = (mothers || [])
        .map(m => ({
          id: m.userId || m.id,
          name: m.name,
          phone: m.phone,
          village: m.village,
          district: m.district,
          riskLevel: m.currentRiskLevel || 'unknown',
          currentTrimester: m.currentTrimester,
          latestRiskScore: m.latestRiskScore,
          urgency: m.urgency,
          totalPredictions: m.totalPredictions || 0
        }))
        .sort((a, b) => (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3));

      const stats = {
        total: patients.length,
        highRisk: patients.filter(p => p.riskLevel === 'high').length,
        mediumRisk: patients.filter(p => p.riskLevel === 'medium').length,
        lowRisk: patients.filter(p => p.riskLevel === 'low').length,
        pendingAlerts: (alerts || []).length,
        criticalAlerts: (alerts || []).filter(a => a.severity === 'critical').length
      };

      setData({ patients, pendingAlerts: alerts || [], stats });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setData({ patients: [], pendingAlerts: [], stats: { total: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0, pendingAlerts: 0, criticalAlerts: 0 } });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await acknowledgeAlert(alertId);
      fetchDashboard();
    } catch (err) {
      console.error('Acknowledge error:', err);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading ASHA Dashboard...</p>
      </div>
    );
  }

  const { patients = [], pendingAlerts = [], stats = {} } = data || {};

  const filteredPatients = patients
    .filter(p => filter === 'all' || p.riskLevel === filter)
    .filter(p => !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.village?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="asha-page">
      <Navbar />
      <div className="asha-content">

        {/* Header */}
        <div className="asha-header fade-in">
          <div>
            <h1>ASHA Worker Dashboard 👩‍⚕️</h1>
            <p>Welcome back, {user?.name} · {user?.village || user?.assignedArea || 'Your Area'}</p>
          </div>
          <div className="header-date">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid fade-in">
          <div className="stat-card stat-total">
            <div className="stat-icon">👥</div>
            <div>
              <div className="stat-value">{stats.total || 0}</div>
              <div className="stat-name">Total Patients</div>
            </div>
          </div>
          <div className="stat-card stat-high">
            <div className="stat-icon">🔴</div>
            <div>
              <div className="stat-value">{stats.highRisk || 0}</div>
              <div className="stat-name">High Risk</div>
            </div>
          </div>
          <div className="stat-card stat-medium">
            <div className="stat-icon">🟡</div>
            <div>
              <div className="stat-value">{stats.mediumRisk || 0}</div>
              <div className="stat-name">Medium Risk</div>
            </div>
          </div>
          <div className="stat-card stat-low">
            <div className="stat-icon">🟢</div>
            <div>
              <div className="stat-value">{stats.lowRisk || 0}</div>
              <div className="stat-name">Low Risk</div>
            </div>
          </div>
          <div className="stat-card stat-alerts">
            <div className="stat-icon">🚨</div>
            <div>
              <div className="stat-value">{stats.pendingAlerts || 0}</div>
              <div className="stat-name">Pending Alerts</div>
            </div>
          </div>
          <div className="stat-card stat-critical">
            <div className="stat-icon">⚡</div>
            <div>
              <div className="stat-value">{stats.criticalAlerts || 0}</div>
              <div className="stat-name">Critical Alerts</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="asha-tabs fade-in">
          <button className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
            👥 Patient Monitoring ({patients.length})
          </button>
          <button className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
            🚨 Priority Alerts {pendingAlerts.length > 0 && <span className="alert-count">{pendingAlerts.length}</span>}
          </button>
        </div>

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <div className="fade-in">
            {/* Filters */}
            <div className="filter-bar">
              <div className="search-box">
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search by name or village..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="filter-buttons">
                {['all', 'high', 'medium', 'low'].map(f => (
                  <button
                    key={f}
                    className={`filter-btn filter-${f} ${filter === f ? 'active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? '📋 All' : f === 'high' ? '🔴 High Risk' : f === 'medium' ? '🟡 Medium' : '🟢 Low Risk'}
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Cards */}
            <div className="patients-grid">
              {filteredPatients.length === 0 ? (
                <div className="empty-state">
                  <span>👥</span>
                  <p>No patients found matching your criteria</p>
                </div>
              ) : (
                filteredPatients.map((patient, i) => (
                  <PatientCard key={patient.id || i} patient={patient} onView={() => navigate(`/patient/${patient.id}`)} />
                ))
              )}
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="alerts-section fade-in">
            {pendingAlerts.length === 0 ? (
              <div className="empty-state">
                <span>✅</span>
                <p>No pending alerts — all patients are being monitored</p>
              </div>
            ) : (
              <div className="alerts-list">
                {pendingAlerts.map((alert, i) => (
                  <AlertCard key={alert._id || i} alert={alert} onAcknowledge={() => handleAcknowledgeAlert(alert._id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PatientCard = ({ patient, onView }) => {
  const riskColors = { high: '#dc2626', medium: '#d97706', low: '#16a34a', unknown: '#64748b' };
  const riskBgs = { high: '#fef2f2', medium: '#fffbeb', low: '#f0fdf4', unknown: '#f8fafc' };
  const riskBorders = { high: '#fca5a5', medium: '#fcd34d', low: '#86efac', unknown: '#e2e8f0' };
  const risk = patient.riskLevel || 'unknown';

  return (
    <div
      className="patient-card"
      style={{ borderColor: riskBorders[risk] }}
      onClick={onView}
    >
      <div className="patient-card-header">
        <div className="patient-avatar" style={{ background: riskBgs[risk], color: riskColors[risk] }}>
          {patient.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="patient-info">
          <h3>{patient.name}</h3>
          <p>📍 {patient.village || 'Unknown'}{patient.district ? `, ${patient.district}` : ''}</p>
        </div>
        <div className={`patient-risk-badge risk-badge-${risk}`}>
          {risk === 'high' ? '🔴' : risk === 'medium' ? '🟡' : risk === 'low' ? '🟢' : '⚪'}
          {risk.toUpperCase()}
        </div>
      </div>

      <div className="patient-details">
        <div className="patient-detail-item">
          <span>Trimester</span>
          <strong>{patient.currentTrimester ? `T${patient.currentTrimester}` : 'N/A'}</strong>
        </div>
        <div className="patient-detail-item">
          <span>Risk Score</span>
          <strong style={{ color: riskColors[risk] }}>{patient.latestRiskScore ?? 'N/A'}</strong>
        </div>
        <div className="patient-detail-item">
          <span>Urgency</span>
          <strong style={{ textTransform: 'capitalize' }}>{patient.urgency || 'N/A'}</strong>
        </div>
        <div className="patient-detail-item">
          <span>Assessments</span>
          <strong>{patient.totalPredictions || 0}</strong>
        </div>
      </div>

      {patient.phone && (
        <div className="patient-contact">
          <a href={`tel:${patient.phone}`} className="contact-call-btn" onClick={e => e.stopPropagation()}>
            📞 Call
          </a>
          <button className="contact-view-btn" onClick={onView}>View Details →</button>
        </div>
      )}

      {risk === 'high' && (
        <div className="patient-priority-tag">
          🚨 PRIORITY CASE — Immediate attention required
        </div>
      )}
    </div>
  );
};

const AlertCard = ({ alert, onAcknowledge }) => {
  const severityColors = { critical: '#dc2626', high: '#d97706', medium: '#2563eb', low: '#16a34a' };
  const severityBgs = { critical: '#fef2f2', high: '#fffbeb', medium: '#eff6ff', low: '#f0fdf4' };

  return (
    <div className="alert-card" style={{ background: severityBgs[alert.severity], borderColor: severityColors[alert.severity] + '40' }}>
      <div className="alert-card-header">
        <div className="alert-severity-dot" style={{ background: severityColors[alert.severity] }}></div>
        <div className="alert-info">
          <h3>{alert.title}</h3>
          <p>{alert.message}</p>
        </div>
        <div className="alert-meta">
          <span className="alert-time">
            {new Date(alert.createdAt || Date.now()).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={`alert-status-badge status-${alert.status}`}>{alert.status?.toUpperCase()}</span>
        </div>
      </div>
      {alert.motherId && (
        <div className="alert-patient-info">
          <span>👤 {alert.motherId?.name || 'Patient'}</span>
          {alert.motherId?.village && <span>📍 {alert.motherId.village}</span>}
          {alert.motherId?.phone && <a href={`tel:${alert.motherId.phone}`} className="alert-call">📞 {alert.motherId.phone}</a>}
        </div>
      )}
      {alert.status === 'pending' && (
        <button className="acknowledge-btn" onClick={onAcknowledge}>
          ✓ Acknowledge Alert
        </button>
      )}
    </div>
  );
};

export default AshaWorkerDashboard;
