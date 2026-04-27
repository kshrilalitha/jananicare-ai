import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: searchParams.get('role') || 'mother',
    phone: '',
    village: '',
    district: '',
    state: '',
    ashaId: '',
    assignedArea: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await register(formData);
      navigate(user.role === 'asha_worker' ? '/asha-dashboard' : '/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      // Firebase error codes → user-friendly messages
      const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Try logging in.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/operation-not-allowed': 'Email/Password sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.'
      };
      setError(errorMessages[err.code] || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
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
        <div className="register-info">
          <h3>Join JananiCare AI</h3>
          <p>Create your account to access AI-powered maternal healthcare</p>
          <div className="register-benefits">
            <div className="benefit-item"><span>✅</span> Free AI Risk Assessment</div>
            <div className="benefit-item"><span>✅</span> Personalized Care Plans</div>
            <div className="benefit-item"><span>✅</span> Emergency Alert System</div>
            <div className="benefit-item"><span>✅</span> ASHA Worker Coordination</div>
            <div className="benefit-item"><span>✅</span> Multi-language Support</div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Create Account</h2>
            <p>Step {step} of 2 — {step === 1 ? 'Account Details' : 'Personal Information'}</p>
          </div>

          {/* Role Toggle */}
          <div className="role-toggle">
            <button
              className={`role-toggle-btn ${formData.role === 'mother' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, role: 'mother' })}
              type="button"
            >
              🤱 Pregnant Mother
            </button>
            <button
              className={`role-toggle-btn ${formData.role === 'asha_worker' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, role: 'asha_worker' })}
              type="button"
            >
              👩‍⚕️ ASHA Worker
            </button>
          </div>

          {/* Progress */}
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${step * 50}%` }}></div>
          </div>

          {error && <div className="auth-error"><span>⚠️</span> {error}</div>}

          {step === 1 ? (
            <form onSubmit={handleNext} className="auth-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange}
                  placeholder="Enter your full name" required className="form-input" />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  placeholder="Enter your email" required className="form-input" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange}
                    placeholder="Min 6 characters" required minLength={6} className="form-input" />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                    placeholder="Repeat password" required className="form-input" />
                </div>
              </div>
              <button type="submit" className="auth-submit-btn">Next Step →</button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                  placeholder="10-digit mobile number" className="form-input" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Village / Town</label>
                  <input type="text" name="village" value={formData.village} onChange={handleChange}
                    placeholder="Your village/town" className="form-input" />
                </div>
                <div className="form-group">
                  <label>District</label>
                  <input type="text" name="district" value={formData.district} onChange={handleChange}
                    placeholder="Your district" className="form-input" />
                </div>
              </div>
              <div className="form-group">
                <label>State</label>
                <select name="state" value={formData.state} onChange={handleChange} className="form-input">
                  <option value="">Select State</option>
                  {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {formData.role === 'asha_worker' && (
                <>
                  <div className="form-group">
                    <label>ASHA Worker ID</label>
                    <input type="text" name="ashaId" value={formData.ashaId} onChange={handleChange}
                      placeholder="Your ASHA worker ID" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Assigned Area</label>
                    <input type="text" name="assignedArea" value={formData.assignedArea} onChange={handleChange}
                      placeholder="Area/ward assigned to you" className="form-input" />
                  </div>
                </>
              )}
              <div className="form-btn-row">
                <button type="button" className="btn-back" onClick={() => setStep(1)}>← Back</button>
                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? <><span className="btn-spinner"></span> Creating...</> : 'Create Account ✓'}
                </button>
              </div>
            </form>
          )}

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
          <div className="auth-back"><Link to="/">← Back to Home</Link></div>
        </div>
      </div>
    </div>
  );
};

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh'
];

export default RegisterPage;
