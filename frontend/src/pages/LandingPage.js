import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="header-logo">
          <span className="logo-icon">🌸</span>
          <span className="logo-text">JananiCare <span className="logo-ai">AI</span></span>
        </div>
        <div className="header-actions">
          <button className="btn-outline" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn-primary" onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <span>🤖 AI-Powered Maternal Healthcare</span>
        </div>
        <h1 className="hero-title">
          Predict Early.<br />
          <span className="hero-highlight">Protect Mothers.</span>
        </h1>
        <p className="hero-subtitle">
          JananiCare AI uses advanced machine learning to detect high-risk pregnancies early,
          coordinate emergency care, and empower ASHA workers with real-time insights —
          saving lives in rural and underserved communities.
        </p>
        <div className="hero-actions">
          <button className="btn-hero-primary" onClick={() => navigate('/register')}>
            🌸 I'm a Pregnant Mother
          </button>
          <button className="btn-hero-secondary" onClick={() => navigate('/register?role=asha_worker')}>
            👩‍⚕️ I'm an ASHA Worker
          </button>
        </div>
        <div className="hero-stats">
          <div className="stat-item">
            <span className="stat-number">94%</span>
            <span className="stat-label">Prediction Accuracy</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">2min</span>
            <span className="stat-label">Risk Assessment</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">24/7</span>
            <span className="stat-label">Emergency Alerts</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">7+</span>
            <span className="stat-label">Languages</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2>Everything You Need for Safe Motherhood</h2>
          <p>Comprehensive maternal care powered by AI, designed for India's healthcare ecosystem</p>
        </div>
        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <div className="section-header">
          <h2>How JananiCare AI Works</h2>
          <p>Simple, fast, and life-saving — in just 3 steps</p>
        </div>
        <div className="steps-container">
          {steps.map((step, i) => (
            <div className="step-card" key={i}>
              <div className="step-number">{i + 1}</div>
              <div className="step-icon">{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Role Cards */}
      <section className="roles-section">
        <div className="section-header">
          <h2>Choose Your Role</h2>
          <p>Tailored experience for every user</p>
        </div>
        <div className="roles-grid">
          <div className="role-card role-mother" onClick={() => navigate('/register')}>
            <div className="role-emoji">🤱</div>
            <h3>Pregnant Mother</h3>
            <p>Track your pregnancy health, get AI risk assessment, receive personalized nutrition and care guidance</p>
            <ul>
              <li>✅ AI Risk Prediction</li>
              <li>✅ Nutrition Guidance</li>
              <li>✅ Medicine Reminders</li>
              <li>✅ Emergency SOS</li>
              <li>✅ Voice Symptom Input</li>
            </ul>
            <button className="role-btn">Register as Mother →</button>
          </div>
          <div className="role-card role-asha" onClick={() => navigate('/register?role=asha_worker')}>
            <div className="role-emoji">👩‍⚕️</div>
            <h3>ASHA Worker</h3>
            <p>Monitor all assigned mothers, receive priority alerts for high-risk cases, coordinate emergency care</p>
            <ul>
              <li>✅ Patient Dashboard</li>
              <li>✅ Priority Alerts</li>
              <li>✅ Visit Planning</li>
              <li>✅ Case History</li>
              <li>✅ Risk Analytics</li>
            </ul>
            <button className="role-btn asha-btn">Register as ASHA Worker →</button>
          </div>
        </div>
      </section>

      {/* Emergency Banner */}
      <section className="emergency-banner">
        <div className="emergency-content">
          <span className="emergency-icon">🆘</span>
          <div>
            <h3>One Tap Emergency Help</h3>
            <p>In case of emergency, instantly alert your ASHA worker and nearest PHC with a single tap</p>
          </div>
          <button className="emergency-demo-btn" onClick={() => navigate('/login')}>
            Try Demo
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-logo">
          <span>🌸</span> JananiCare AI
        </div>
        <p>Predict Early. Protect Mothers. Save Lives.</p>
        <p className="footer-tagline">Built for India's Maternal Healthcare Revolution 🇮🇳</p>
        <div className="footer-links">
          <span onClick={() => navigate('/login')}>Login</span>
          <span onClick={() => navigate('/register')}>Register</span>
        </div>
      </footer>
    </div>
  );
};

const features = [
  { icon: '🤖', title: 'AI Risk Prediction', desc: 'ML-powered analysis of hemoglobin, BP, age, symptoms to classify Low/Medium/High risk pregnancies' },
  { icon: '🚨', title: 'Emergency Alerts', desc: 'Instant notifications to ASHA workers and nearest PHC when high-risk cases are detected' },
  { icon: '🎤', title: 'Voice Symptom Input', desc: 'Speak symptoms in simple language — perfect for rural accessibility and low-literacy users' },
  { icon: '📊', title: 'ASHA Dashboard', desc: 'Real-time monitoring of all assigned mothers with priority sorting and case history tracking' },
  { icon: '🥗', title: 'Nutrition Guidance', desc: 'Personalized diet recommendations based on pregnancy trimester and nutritional deficiencies' },
  { icon: '💊', title: 'Medicine Reminders', desc: 'Automated reminders for iron, folic acid, calcium supplements and antenatal medications' },
  { icon: '🌐', title: 'Multi-language Support', desc: 'Available in Hindi, Tamil, Telugu, Kannada, Marathi, Bengali and more regional languages' },
  { icon: '📱', title: 'Mobile Friendly', desc: 'Fully responsive design works on any device — smartphone, tablet, or desktop' }
];

const steps = [
  { icon: '📝', title: 'Enter Health Data', desc: 'Input vitals like hemoglobin, blood pressure, weight, and symptoms — or use voice input' },
  { icon: '🤖', title: 'AI Analyzes Risk', desc: 'Our ML model instantly analyzes your data and predicts your pregnancy risk level with 94% accuracy' },
  { icon: '🏥', title: 'Get Care Guidance', desc: 'Receive personalized recommendations, doctor consultation urgency, and emergency alerts if needed' }
];

export default LandingPage;
