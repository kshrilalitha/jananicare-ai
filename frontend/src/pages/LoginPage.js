import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(formData.email, formData.password);
      navigate(user.role === 'asha_worker' ? '/asha-dashboard' : '/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessages = {
        'auth/user-not-found': 'No account found with this email. Please register first.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/invalid-credential': 'Invalid email or password. Please try again.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your internet connection.'
      };
      setError(errorMessages[err.code] || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    if (role === 'mother') {
      setFormData({ email: 'priya@demo.com', password: 'demo123' });
    } else {
      setFormData({ email: 'asha@demo.com', password: 'demo123' });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="brand-icon">🌸</span>
          <h1>JananiCare AI</h1>
          <p>Predict Early. Protect Mothers.</p>
        </div>
        <div className="auth-illustration">
          <div className="illustration-card">
            <div className="illus-icon">🤱</div>
            <h3>Safe Motherhood</h3>
            <p>AI-powered risk detection for every pregnant woman</p>
          </div>
          <div className="illustration-card">
            <div className="illus-icon">👩‍⚕️</div>
            <h3>ASHA Worker Support</h3>
            <p>Real-time monitoring and emergency coordination</p>
          </div>
          <div className="illustration-card">
            <div className="illus-icon">🚨</div>
            <h3>Emergency Alerts</h3>
            <p>Instant notifications for high-risk pregnancies</p>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your JananiCare AI account</p>
          </div>

          {/* Demo Buttons */}
          <div className="demo-buttons">
            <p className="demo-label">🎯 Quick Demo Login:</p>
            <div className="demo-btn-row">
              <button className="demo-btn demo-mother" onClick={() => fillDemo('mother')}>
                🤱 Mother Demo
              </button>
              <button className="demo-btn demo-asha" onClick={() => fillDemo('asha')}>
                👩‍⚕️ ASHA Demo
              </button>
            </div>
          </div>

          {error && (
            <div className="auth-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                className="form-input"
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <><span className="btn-spinner"></span> Signing in...</>
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create Account</Link>
          </p>

          <div className="auth-back">
            <Link to="/">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
