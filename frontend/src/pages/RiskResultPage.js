import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';
import './RiskResultPage.css';

const RiskResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [animateScore, setAnimateScore] = useState(0);
  const prediction = location.state?.prediction;

  useEffect(() => {
    if (!prediction) { navigate('/health-form'); return; }
    // Animate score
    let current = 0;
    const target = prediction.riskScore;
    const interval = setInterval(() => {
      current += 2;
      if (current >= target) { setAnimateScore(target); clearInterval(interval); }
      else setAnimateScore(current);
    }, 20);
    return () => clearInterval(interval);
  }, [prediction, navigate]);

  if (!prediction) return null;

  const { riskLevel, confidence, riskFactors, recommendations, urgency, doctorConsultationRequired, consultationTimeframe } = prediction;

  const riskConfig = {
    high: {
      color: '#dc2626', bg: '#fef2f2', border: '#fca5a5',
      icon: '🔴', label: t('highRisk'),
      headline: t('immediateMedicalAttention'),
      subtext: t('highRiskSubtext'),
      gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)'
    },
    medium: {
      color: '#d97706', bg: '#fffbeb', border: '#fcd34d',
      icon: '🟡', label: t('mediumRisk'),
      headline: t('medicalConsultationRecommended'),
      subtext: t('mediumRiskSubtext'),
      gradient: 'linear-gradient(135deg, #d97706, #b45309)'
    },
    low: {
      color: '#16a34a', bg: '#f0fdf4', border: '#86efac',
      icon: '🟢', label: t('lowRisk'),
      headline: t('pregnancyAppearsHealthy'),
      subtext: t('lowRiskSubtext'),
      gradient: 'linear-gradient(135deg, #16a34a, #15803d)'
    }
  };

  const config = riskConfig[riskLevel] || riskConfig.low;

  return (
    <div className="result-page">
      <Navbar />
      <div className="result-content">

        {/* Main Risk Card */}
        <div className={`result-hero result-hero-${riskLevel} fade-in`}>
          <div className="result-hero-left">
            <div className="result-icon-large">{config.icon}</div>
            <div>
              <div className="result-label" style={{ color: config.color }}>{config.label}</div>
              <h1 className="result-headline">{config.headline}</h1>
              <p className="result-subtext">{config.subtext}</p>
            </div>
          </div>
          <div className="result-score-circle">
            <svg viewBox="0 0 120 120" className="score-svg">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                stroke={config.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(animateScore / 100) * 314} 314`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 0.1s' }}
              />
            </svg>
            <div className="score-text">
              <span className="score-number" style={{ color: config.color }}>{animateScore}</span>
              <span className="score-label">/ 100</span>
              <span className="score-sub">{t('riskScore')}</span>
            </div>
          </div>
        </div>

        {/* Urgency Banner */}
        {riskLevel === 'high' && (
          <div className="urgency-banner fade-in">
            <span className="urgency-icon">🚨</span>
            <div>
              <strong>{t('emergencyActionRequired')}</strong>
              <p>{t('emergencyActionDesc')}</p>
            </div>
            <div className="urgency-actions">
              <a href="tel:108" className="urgency-call-btn">📞 {t('call108')}</a>
              <a href="tel:112" className="urgency-call-btn">🚑 {t('call112')}</a>
            </div>
          </div>
        )}

        {/* Consultation Info */}
        <div className="consultation-card fade-in">
          <div className="consultation-items">
            <div className="consult-item">
              <span className="consult-icon">⏰</span>
              <div>
                <strong>{t('consultationTimeframeLabel')}</strong>
                <p>{consultationTimeframe}</p>
              </div>
            </div>
            <div className="consult-item">
              <span className="consult-icon">🏥</span>
              <div>
                <strong>{t('doctorVisitRequiredLabel')}</strong>
                <p>{doctorConsultationRequired ? t('seekImmediate') : t('continueCheckups')}</p>
              </div>
            </div>
            <div className="consult-item">
              <span className="consult-icon">🎯</span>
              <div>
                <strong>{t('aiConfidenceLabel')}</strong>
                <p>{Math.round((confidence || 0.87) * 100)}% {t('predictionAccuracy')}</p>
              </div>
            </div>
            <div className="consult-item">
              <span className="consult-icon">⚡</span>
              <div>
                <strong>{t('urgencyLevelLabel')}</strong>
                <p style={{ textTransform: 'capitalize', fontWeight: 700, color: config.color }}>{t(urgency) || urgency}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="result-grid">
          {/* Risk Factors */}
          {riskFactors && riskFactors.length > 0 && (
            <div className="result-card fade-in">
              <h2>⚠️ {t('riskFactorsIdentified')}</h2>
              <div className="risk-factors-list">
                {riskFactors.map((rf, i) => (
                  <div key={i} className={`risk-factor-item rf-${rf.severity}`}>
                    <div className="rf-header">
                      <span className="rf-dot"></span>
                      <strong>{rf.factor}</strong>
                      <span className={`rf-badge rf-badge-${rf.severity}`}>{rf.severity?.toUpperCase()}</span>
                    </div>
                    <p>{rf.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="result-card fade-in">
            <h2>💡 {t('aiRecommendations')}</h2>
            <div className="recommendations-list">
              {(recommendations || []).map((rec, i) => (
                <div key={i} className="recommendation-item">
                  <span className="rec-num">{i + 1}</span>
                  <p>{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preventive Guidance */}
        <div className="preventive-card fade-in">
          <h2>🛡️ {t('preventiveCareGuidance')}</h2>
          <div className="preventive-grid">
            {getPreventiveGuidance(riskLevel, t).map((item, i) => (
              <div key={i} className="preventive-item">
                <span className="preventive-icon">{item.icon}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contacts */}
        {riskLevel === 'high' && (
          <div className="emergency-card fade-in">
            <h2>📞 {t('emergencyContacts')}</h2>
            <div className="emergency-contacts-grid">
              {[
                { name: t('nationalAmbulance'), number: '108', icon: '🚑' },
                { name: t('emergencyServices'), number: '112', icon: '🆘' },
                { name: t('womenHelpline'), number: '181', icon: '👩‍⚕️' },
                { name: t('ashaWorker'), number: t('contactViaApp'), icon: '🏥' }
              ].map((c, i) => (
                <div key={i} className="emergency-contact-item">
                  <span>{c.icon}</span>
                  <div>
                    <strong>{c.name}</strong>
                    <span className="emergency-number">{c.number}</span>
                  </div>
                  {c.number !== t('contactViaApp') && (
                    <a href={`tel:${c.number}`} className="call-now-btn">{t('callNow')}</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="result-actions fade-in">
          <button className="action-btn-secondary" onClick={() => navigate('/dashboard')}>
            ← {t('backToDashboard')}
          </button>
          <button className="action-btn-primary" onClick={() => navigate('/health-form')}>
            📋 {t('newAssessmentBtn')}
          </button>
          {riskLevel === 'high' && (
            <button className="action-btn-emergency" onClick={() => navigate('/dashboard')}>
              🆘 {t('sendEmergencyAlertBtn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function getPreventiveGuidance(riskLevel, t) {
  const guidance = {
    high: [
      { icon: '🏥', title: t('immediateHospitalVisit'), desc: t('immediateHospitalDesc') },
      { icon: '📞', title: t('contactASHA'), desc: t('contactASHADesc') },
      { icon: '🚫', title: t('avoidPhysicalStrain'), desc: t('avoidPhysicalStrainDesc') },
      { icon: '👥', title: t('stayWithFamily'), desc: t('stayWithFamilyDesc') }
    ],
    medium: [
      { icon: '📅', title: t('scheduleDoctorVisitGuidance'), desc: t('scheduleDoctorVisitDesc') },
      { icon: '📊', title: t('monitorDaily'), desc: t('monitorDailyDesc') },
      { icon: '💊', title: t('takeSupplements'), desc: t('takeSupplementsDesc') },
      { icon: '😴', title: t('restAdequately'), desc: t('restAdequatelyDesc') }
    ],
    low: [
      { icon: '📅', title: t('regularCheckups'), desc: t('regularCheckupsDesc') },
      { icon: '🥗', title: t('balancedNutrition'), desc: t('balancedNutritionDesc') },
      { icon: '🚶', title: t('lightExercise'), desc: t('lightExerciseDesc') },
      { icon: '💧', title: t('stayHydrated'), desc: t('stayHydratedDesc') }
    ]
  };
  return guidance[riskLevel] || guidance.low;
}

export default RiskResultPage;
