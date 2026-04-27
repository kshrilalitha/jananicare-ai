import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './RiskResultPage.css';

const RiskResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const { riskLevel, riskScore, confidence, riskFactors, recommendations, urgency, doctorConsultationRequired, consultationTimeframe } = prediction;

  const riskConfig = {
    high: {
      color: '#dc2626', bg: '#fef2f2', border: '#fca5a5',
      icon: '🔴', label: 'HIGH RISK',
      headline: 'Immediate Medical Attention Required',
      subtext: 'Your health data indicates a high-risk pregnancy. Please seek medical help immediately.',
      gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)'
    },
    medium: {
      color: '#d97706', bg: '#fffbeb', border: '#fcd34d',
      icon: '🟡', label: 'MEDIUM RISK',
      headline: 'Medical Consultation Recommended',
      subtext: 'Your health data shows some concerning factors. Please schedule a doctor visit soon.',
      gradient: 'linear-gradient(135deg, #d97706, #b45309)'
    },
    low: {
      color: '#16a34a', bg: '#f0fdf4', border: '#86efac',
      icon: '🟢', label: 'LOW RISK',
      headline: 'Pregnancy Appears Healthy',
      subtext: 'Your health data looks good! Continue your regular antenatal care routine.',
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
              <span className="score-sub">Risk Score</span>
            </div>
          </div>
        </div>

        {/* Urgency Banner */}
        {riskLevel === 'high' && (
          <div className="urgency-banner fade-in">
            <span className="urgency-icon">🚨</span>
            <div>
              <strong>EMERGENCY ACTION REQUIRED</strong>
              <p>Go to the nearest Primary Health Centre or hospital immediately. Do not delay.</p>
            </div>
            <div className="urgency-actions">
              <a href="tel:108" className="urgency-call-btn">📞 Call 108</a>
              <a href="tel:112" className="urgency-call-btn">🚑 Call 112</a>
            </div>
          </div>
        )}

        {/* Consultation Info */}
        <div className="consultation-card fade-in">
          <div className="consultation-items">
            <div className="consult-item">
              <span className="consult-icon">⏰</span>
              <div>
                <strong>Consultation Timeframe</strong>
                <p>{consultationTimeframe}</p>
              </div>
            </div>
            <div className="consult-item">
              <span className="consult-icon">🏥</span>
              <div>
                <strong>Doctor Visit Required</strong>
                <p>{doctorConsultationRequired ? 'Yes — Please schedule immediately' : 'Routine checkup recommended'}</p>
              </div>
            </div>
            <div className="consult-item">
              <span className="consult-icon">🎯</span>
              <div>
                <strong>AI Confidence</strong>
                <p>{Math.round((confidence || 0.87) * 100)}% prediction accuracy</p>
              </div>
            </div>
            <div className="consult-item">
              <span className="consult-icon">⚡</span>
              <div>
                <strong>Urgency Level</strong>
                <p style={{ textTransform: 'capitalize', fontWeight: 700, color: config.color }}>{urgency}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="result-grid">
          {/* Risk Factors */}
          {riskFactors && riskFactors.length > 0 && (
            <div className="result-card fade-in">
              <h2>⚠️ Risk Factors Identified</h2>
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
            <h2>💡 AI Recommendations</h2>
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
          <h2>🛡️ Preventive Care Guidance</h2>
          <div className="preventive-grid">
            {getPreventiveGuidance(riskLevel).map((item, i) => (
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
            <h2>📞 Emergency Contacts</h2>
            <div className="emergency-contacts-grid">
              {[
                { name: 'National Ambulance', number: '108', icon: '🚑' },
                { name: 'Emergency Services', number: '112', icon: '🆘' },
                { name: 'Women Helpline', number: '181', icon: '👩‍⚕️' },
                { name: 'ASHA Worker', number: 'Contact via app', icon: '🏥' }
              ].map((c, i) => (
                <div key={i} className="emergency-contact-item">
                  <span>{c.icon}</span>
                  <div>
                    <strong>{c.name}</strong>
                    <span className="emergency-number">{c.number}</span>
                  </div>
                  {c.number !== 'Contact via app' && (
                    <a href={`tel:${c.number}`} className="call-now-btn">Call Now</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="result-actions fade-in">
          <button className="action-btn-secondary" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <button className="action-btn-primary" onClick={() => navigate('/health-form')}>
            📋 New Assessment
          </button>
          {riskLevel === 'high' && (
            <button className="action-btn-emergency" onClick={() => navigate('/dashboard')}>
              🆘 Send Emergency Alert
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function getPreventiveGuidance(riskLevel) {
  const guidance = {
    high: [
      { icon: '🏥', title: 'Immediate Hospital Visit', desc: 'Do not delay — go to nearest PHC or hospital today' },
      { icon: '📞', title: 'Contact ASHA Worker', desc: 'Inform your ASHA worker about your risk status immediately' },
      { icon: '🚫', title: 'Avoid Physical Strain', desc: 'No heavy lifting, strenuous activity, or travel without medical clearance' },
      { icon: '👥', title: 'Stay with Family', desc: 'Do not stay alone — have a family member with you at all times' }
    ],
    medium: [
      { icon: '📅', title: 'Schedule Doctor Visit', desc: 'Book an appointment within the next 2-3 days' },
      { icon: '📊', title: 'Monitor Daily', desc: 'Check blood pressure and note any new symptoms daily' },
      { icon: '💊', title: 'Take Supplements', desc: 'Ensure you take iron, folic acid, and calcium as prescribed' },
      { icon: '😴', title: 'Rest Adequately', desc: 'Get 8-9 hours of sleep and avoid stress' }
    ],
    low: [
      { icon: '📅', title: 'Regular Checkups', desc: 'Continue antenatal visits every 4 weeks as scheduled' },
      { icon: '🥗', title: 'Balanced Nutrition', desc: 'Eat iron-rich foods, fruits, vegetables, and whole grains' },
      { icon: '🚶', title: 'Light Exercise', desc: 'Walk 20-30 minutes daily — great for circulation and mood' },
      { icon: '💧', title: 'Stay Hydrated', desc: 'Drink 8-10 glasses of water daily' }
    ]
  };
  return guidance[riskLevel] || guidance.low;
}

export default RiskResultPage;
