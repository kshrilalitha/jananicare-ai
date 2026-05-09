import React, { useState, useEffect } from 'react';
import { getLocation } from '../services/location';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getMotherDashboard, saveAlert } from '../services/dataService';
import Navbar from '../components/Navbar';
import './MotherDashboard.css';



const MotherDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertSent, setAlertSent] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);

  useEffect(() => {
   fetchDashboard();
}, [fetchDashboard]);
  
  const fetchDashboard = async () => {
    try {
      const data = await getMotherDashboard(user.uid);
      setDashData(data);
    } catch (err) {
      console.error('Dashboard error:', err);
      setDashData(getEmptyDashData(user));
    } finally {
      setLoading(false);
    }
  };

  const handleOneTapHelp = async () => {
  setSendingAlert(true);

  try {
   

    // 📍 Get location
    const { lat, lng } = await getLocation();


    // 📩 Send to backend (SMS)
    await fetch('/api/alerts/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.uid,
        lat,
        lng
      })
    });

    // 💾 (optional) still save alert in DB
    await saveAlert({
      userId: user.uid,
      userName: user.name,
      alertType: 'one_tap_help',
      severity: 'critical',
      title: '🆘 ONE TAP EMERGENCY HELP',
      message: `EMERGENCY: ${user.name} needs help! Location: https://maps.google.com/?q=${lat},${lng}`,
      village: user.village || '',
      district: user.district || ''
    });

    setAlertSent(true);
    setTimeout(() => setAlertSent(false), 5000);

  } catch (err) {
    console.error(err);
    alert("Error sending SOS");
  } finally {
    setSendingAlert(false);
  }
};

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading your health dashboard...</p>
      </div>
    );
  }

  const { latestPrediction, nutritionTips, healthTips, medicineReminders, nextCheckup, profile } = dashData || {};
  const riskLevel = latestPrediction?.riskLevel || 'unknown';

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="dashboard-content">
        {/* Welcome Header */}
        <div className="dashboard-header fade-in">
          <div>
            <h1>{t('hello')}, {user?.name?.split(' ')[0]} 🌸</h1>
            <p>{t('healthOverview')}</p>
          </div>
          <div className="header-date">
            <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Emergency One Tap Help */}
        {alertSent ? (
          <div className="alert-success fade-in">
            <span>✅</span>
            <div>
              <strong>{t('emergencyAlertSent')}</strong>
              <p>{t('helpOnWay')}</p>
            </div>
          </div>
        ) : (
          <div className="one-tap-banner fade-in">
            <div className="one-tap-info">
              <span className="one-tap-icon">🆘</span>
              <div>
                <strong>{t('oneTapHelp')}</strong>
                <p>{t('alertASHA')}</p>
              </div>
            </div>
            <button className="one-tap-btn" onClick={handleOneTapHelp} disabled={sendingAlert}>
              {sendingAlert ? '⏳ ...' : `🆘 ${t('sendHelpNow')}`}
            </button>
          </div>
        )}

        {/* Main Grid */}
        <div className="dashboard-grid">
          {/* Risk Status Card */}
          <div className={`risk-card risk-${riskLevel} fade-in`}>
            <div className="risk-card-header">
              <div>
                <h3>{t('pregnancyRisk')}</h3>
                <p>{t('basedOnAssessment')}</p>
              </div>
              <div className={`risk-badge-large risk-badge-${riskLevel}`}>
                {riskLevel === 'high' ? '🔴' : riskLevel === 'medium' ? '🟡' : riskLevel === 'low' ? '🟢' : '⚪'}
                {riskLevel.toUpperCase()} RISK
              </div>
            </div>
            {latestPrediction ? (
              <>
                <div className="risk-score-bar">
                  <div className="risk-score-label">
                    <span>{t('riskScore')}</span>
                    <span className="risk-score-num">{latestPrediction.riskScore}/100</span>
                  </div>
                  <div className="risk-bar-track">
                    <div
                      className={`risk-bar-fill risk-fill-${riskLevel}`}
                      style={{ width: `${latestPrediction.riskScore}%` }}
                    ></div>
                  </div>
                </div>
                <p className="risk-urgency">
                  {riskLevel === 'high' ? `🚨 ${t('seekImmediate')}` :
                   riskLevel === 'medium' ? `⚠️ ${t('scheduleDoctorVisit')}` :
                   `✅ ${t('continueCheckups')}`}
                </p>
              </>
            ) : (
              <div className="no-prediction">
                <p>{t('noAssessmentYet')}</p>
                <button className="assess-btn" onClick={() => navigate('/health-form')}>
                  {t('startAssessment')} →
                </button>
              </div>
            )}
            <button className="update-btn" onClick={() => navigate('/health-form')}>
              📋 {t('updateHealthData')}
            </button>
          </div>

          {/* Next Checkup */}
          <div className="info-card fade-in">
            <div className="info-card-icon">📅</div>
            <h3>{t('nextCheckup')}</h3>
            {nextCheckup ? (
              <>
                <p className="info-card-value">{new Date(nextCheckup).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="info-card-sub">
                  {Math.ceil((new Date(nextCheckup) - new Date()) / (1000 * 60 * 60 * 24))} {t('daysRemaining')}
                </p>
              </>
            ) : (
              <p className="info-card-value">Schedule your next visit</p>
            )}
            <div className="info-card-badge">{t('antenatalVisit')}</div>
          </div>

          {/* Trimester Info */}
          <div className="info-card fade-in">
            <div className="info-card-icon">🤰</div>
            <h3>{t('pregnancyStage')}</h3>
            <p className="info-card-value">
              {profile?.currentTrimester ? `${t('trimester')} ${profile.currentTrimester}` : t('notSet')}
            </p>
            <p className="info-card-sub">
              {profile?.currentTrimester === 1 ? 'Weeks 1-12' :
               profile?.currentTrimester === 2 ? 'Weeks 13-26' :
               profile?.currentTrimester === 3 ? 'Weeks 27-40' : 'Update your profile'}
            </p>
            <div className="trimester-dots">
              {[1,2,3].map(t => (
                <div key={t} className={`trimester-dot ${profile?.currentTrimester >= t ? 'active' : ''}`}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Medicine Reminders */}
        <div className="section-card fade-in">
          <div className="section-card-header">
            <h2>💊 {t('medicineReminders')}</h2>
            <span className="section-badge">{t('today')}</span>
          </div>
          <div className="reminders-grid">
            {(medicineReminders || []).map((rem, i) => (
              <div className="reminder-item" key={i}>
                <div className="reminder-icon">💊</div>
                <div className="reminder-info">
                  <strong>{rem.medicine}</strong>
                  <span>{rem.time} · {rem.frequency}</span>
                </div>
                <div className="reminder-check">✓</div>
              </div>
            ))}
          </div>
        </div>

        {/* Nutrition Tips */}
        <div className="section-card fade-in">
          <div className="section-card-header">
            <h2>🥗 {t('nutritionGuidance')}</h2>
            <span className="section-badge">
              {profile?.currentTrimester ? `${t('trimester')} ${profile.currentTrimester}` : t('general')}
            </span>
          </div>
          <div className="nutrition-grid">
            {(nutritionTips || []).map((tip, i) => (
              <div className="nutrition-card" key={i}>
                <span className="nutrition-icon">{tip.icon}</span>
                <div>
                  <strong>{tip.title}</strong>
                  <p>{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Health Tips */}
        <div className="section-card fade-in">
          <div className="section-card-header">
            <h2>💡 {t('healthTips')}</h2>
            <span className={`section-badge badge-${riskLevel}`}>
              {riskLevel.toUpperCase()} RISK
            </span>
          </div>
          <div className="tips-list">
            {(healthTips || []).map((tip, i) => (
              <div className="tip-item" key={i}>
                <span className="tip-bullet">→</span>
                <p>{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="section-card emergency-contact-card fade-in">
          <div className="section-card-header">
            <h2>📞 {t('emergencyContacts')}</h2>
          </div>
          <div className="contacts-grid">
            <div className="contact-item">
              <div className="contact-icon">🏥</div>
              <div>
                <strong>{t('nationalAmbulance')}</strong>
                <span className="contact-number">108</span>
              </div>
              <a href="tel:108" className="call-btn">{t('call')}</a>
            </div>
            <div className="contact-item">
              <div className="contact-icon">👩‍⚕️</div>
              <div>
                <strong>{t('womenHelpline')}</strong>
                <span className="contact-number">181</span>
              </div>
              <a href="tel:181" className="call-btn">{t('call')}</a>
            </div>
            <div className="contact-item">
              <div className="contact-icon">🚑</div>
              <div>
                <strong>{t('emergencyServices')}</strong>
                <span className="contact-number">112</span>
              </div>
              <a href="tel:112" className="call-btn">{t('call')}</a>
            </div>
            {dashData?.emergencyContact?.phone && (
              <div className="contact-item">
                <div className="contact-icon">👨‍👩‍👧</div>
                <div>
                  <strong>{dashData.emergencyContact.name}</strong>
                  <span className="contact-number">{dashData.emergencyContact.phone}</span>
                </div>
                <a href={`tel:${dashData.emergencyContact.phone}`} className="call-btn">Call</a>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="cta-card fade-in">
          <div className="cta-content">
            <div>
              <h3>{t('readyAssessment')}</h3>
              <p>{t('enterHealthData')}</p>
            </div>
            <button className="cta-btn" onClick={() => navigate('/health-form')}>
              {t('startAssessment')} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function getEmptyDashData(user) {
  return {
    user,
    profile: { currentTrimester: null, currentRiskLevel: 'unknown' },
    latestPrediction: null,
    nextCheckup: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    nutritionTips: [
      { icon: '🥩', title: 'Iron Rich Foods', desc: 'Lean meat, beans, and dark leafy greens for hemoglobin' },
      { icon: '🐟', title: 'Omega-3', desc: 'Fish for baby brain development' },
      { icon: '🥚', title: 'Protein', desc: 'Eggs and legumes for baby growth' },
      { icon: '🌾', title: 'Whole Grains', desc: 'Brown rice and whole wheat for energy' }
    ],
    healthTips: [
      'Complete your first health assessment to get personalized tips',
      'Register with your ASHA worker',
      'Schedule your first antenatal checkup',
      'Take folic acid and iron supplements daily'
    ],
    medicineReminders: [
      { medicine: 'Iron + Folic Acid Tablet', time: '08:00 AM', frequency: 'Daily' },
      { medicine: 'Calcium Supplement', time: '02:00 PM', frequency: 'Daily' },
      { medicine: 'Vitamin D', time: '08:00 AM', frequency: 'Weekly' }
    ],
    emergencyContact: null
  };
}

export default MotherDashboard;
