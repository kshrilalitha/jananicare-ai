import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientDetail, logVisit } from '../services/dataService';
import Navbar from '../components/Navbar';
import './PatientDetailPage.css';

const PatientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visitNote, setVisitNote] = useState('');
  const [nextVisit, setNextVisit] = useState('');
  const [visitStatus, setVisitStatus] = useState('normal');
  const [savingVisit, setSavingVisit] = useState(false);

  useEffect(() => {
  const fetchPatient = async () => {
    try {
      const result = await getPatientDetail(id);
      setData(result);
    } catch (err) {
      console.error('Patient fetch error:', err);
      setData({
        mother: null,
        profile: null,
        predictions: [],
        alerts: [],
        healthRecords: []
      });
    } finally {
      setLoading(false);
    }
  };

  fetchPatient();
}, [id]);

  const handleLogVisit = async (e) => {
    e.preventDefault();
    setSavingVisit(true);
    try {
      await logVisit({ motherId: id, visitNotes: visitNote, nextVisitDate: nextVisit, status: visitStatus });
      alert('Visit logged successfully!');
      setVisitNote('');
      setNextVisit('');
    } catch (err) {
      alert('Error logging visit: ' + err.message);
    } finally {
      setSavingVisit(false);
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div><p>Loading patient details...</p></div>;

  const { mother, profile, predictions = [], alerts = [] } = data || {};
  const latestPrediction = predictions[0];
  const riskLevel = latestPrediction?.riskLevel || 'unknown';

  return (
    <div className="patient-detail-page">
      <Navbar />
      <div className="patient-detail-content">
        <div className="detail-back" onClick={() => navigate('/asha-dashboard')}>
          ← Back to Dashboard
        </div>

        {/* Patient Header */}
        <div className={`patient-header-card risk-border-${riskLevel} fade-in`}>
          <div className="patient-header-left">
            <div className={`patient-avatar-large risk-bg-${riskLevel}`}>
              {mother?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h1>{mother?.name || 'Patient'}</h1>
              <p>📍 {mother?.village || 'Unknown'}{mother?.district ? `, ${mother.district}` : ''}</p>
              <p>📞 {mother?.phone || 'No phone'}</p>
              <p>📧 {mother?.email || ''}</p>
            </div>
          </div>
          <div className="patient-header-right">
            <div className={`risk-status-large risk-status-${riskLevel}`}>
              <span>{riskLevel === 'high' ? '🔴' : riskLevel === 'medium' ? '🟡' : riskLevel === 'low' ? '🟢' : '⚪'}</span>
              <div>
                <strong>{riskLevel.toUpperCase()} RISK</strong>
                <p>Score: {latestPrediction?.riskScore ?? 'N/A'}/100</p>
              </div>
            </div>
            {mother?.phone && (
              <a href={`tel:${mother.phone}`} className="call-patient-btn">📞 Call Patient</a>
            )}
          </div>
        </div>

        <div className="detail-grid">
          {/* Pregnancy Info */}
          <div className="detail-card fade-in">
            <h2>🤰 Pregnancy Information</h2>
            <div className="detail-items">
              <div className="detail-item"><span>Current Trimester</span><strong>{profile?.currentTrimester ? `Trimester ${profile.currentTrimester}` : 'Not set'}</strong></div>
              <div className="detail-item"><span>Expected Delivery</span><strong>{profile?.expectedDeliveryDate ? new Date(profile.expectedDeliveryDate).toLocaleDateString('en-IN') : 'Not set'}</strong></div>
              <div className="detail-item"><span>Blood Group</span><strong>{profile?.bloodGroup || 'Not set'}</strong></div>
              <div className="detail-item"><span>Total Assessments</span><strong>{profile?.totalPredictions || predictions.length}</strong></div>
              <div className="detail-item"><span>Last Assessment</span><strong>{profile?.lastPredictionDate ? new Date(profile.lastPredictionDate).toLocaleDateString('en-IN') : 'Never'}</strong></div>
              <div className="detail-item"><span>Next Checkup</span><strong>{profile?.nextCheckupDate ? new Date(profile.nextCheckupDate).toLocaleDateString('en-IN') : 'Not scheduled'}</strong></div>
            </div>
          </div>

          {/* Latest Prediction */}
          {latestPrediction && (
            <div className="detail-card fade-in">
              <h2>🤖 Latest AI Prediction</h2>
              <div className="prediction-summary">
                <div className={`pred-risk-badge pred-risk-${riskLevel}`}>
                  {riskLevel.toUpperCase()} RISK — {latestPrediction.riskScore}/100
                </div>
                <p className="pred-urgency">Urgency: <strong style={{ textTransform: 'capitalize' }}>{latestPrediction.urgency}</strong></p>
                <p className="pred-consult">{latestPrediction.consultationTimeframe}</p>
              </div>
              {latestPrediction.riskFactors?.length > 0 && (
                <div className="pred-factors">
                  <h3>Risk Factors:</h3>
                  {latestPrediction.riskFactors.slice(0, 3).map((rf, i) => (
                    <div key={i} className={`pred-factor rf-${rf.severity}`}>
                      <strong>{rf.factor}</strong>
                      <p>{rf.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Prediction History */}
        {predictions.length > 0 && (
          <div className="detail-card fade-in">
            <h2>📊 Assessment History</h2>
            <div className="history-table">
              <div className="history-header">
                <span>Date</span>
                <span>Risk Level</span>
                <span>Score</span>
                <span>Urgency</span>
                <span>Doctor Required</span>
              </div>
              {predictions.map((pred, i) => (
                <div key={i} className="history-row">
                  <span>{new Date(pred.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
                  <span className={`badge badge-${pred.riskLevel}`}>{pred.riskLevel?.toUpperCase()}</span>
                  <span><strong>{pred.riskScore}/100</strong></span>
                  <span style={{ textTransform: 'capitalize' }}>{pred.urgency}</span>
                  <span>{pred.doctorConsultationRequired ? '✅ Yes' : '❌ No'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="detail-card fade-in">
            <h2>🚨 Alert History</h2>
            <div className="alerts-mini-list">
              {alerts.map((alert, i) => (
                <div key={i} className={`alert-mini alert-mini-${alert.severity}`}>
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.message?.substring(0, 100)}...</p>
                  </div>
                  <div className="alert-mini-meta">
                    <span>{new Date(alert.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
                    <span className={`status-badge status-${alert.status}`}>{alert.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Log Visit */}
        <div className="detail-card visit-log-card fade-in">
          <h2>📝 Log Visit / Follow-up</h2>
          <form onSubmit={handleLogVisit} className="visit-form">
            <div className="visit-form-grid">
              <div className="field-group">
                <label>Visit Notes</label>
                <textarea
                  value={visitNote}
                  onChange={e => setVisitNote(e.target.value)}
                  placeholder="Describe the visit, observations, and any concerns..."
                  className="field-input field-textarea"
                  rows={4}
                  required
                />
              </div>
              <div className="visit-form-right">
                <div className="field-group">
                  <label>Next Visit Date</label>
                  <input
                    type="date"
                    value={nextVisit}
                    onChange={e => setNextVisit(e.target.value)}
                    className="field-input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="field-group">
                  <label>Visit Status</label>
                  <select value={visitStatus} onChange={e => setVisitStatus(e.target.value)} className="field-input">
                    <option value="normal">Normal Visit</option>
                    <option value="follow_up_needed">Follow-up Needed</option>
                    <option value="referred">Referred to Doctor</option>
                    <option value="emergency">Emergency Referral</option>
                  </select>
                </div>
                <button type="submit" className="log-visit-btn" disabled={savingVisit}>
                  {savingVisit ? '⏳ Saving...' : '✓ Log Visit'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailPage;
