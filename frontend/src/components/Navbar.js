import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import logo from '../logo.png';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { language, switchLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => navigate(user?.role === 'asha_worker' ? '/asha-dashboard' : '/dashboard')}>
          <img src={logo} alt="JananiCare AI Logo" className="nav-logo-img" />
          <span className="nav-logo-text">JananiCare <span className="nav-ai">AI</span></span>
        </div>

        {/* Desktop Nav Links */}
        <div className="navbar-links">
          {user?.role === 'mother' ? (
            <>
              <button className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>
                🏠 {t('dashboard')}
              </button>
              <button className={`nav-link ${isActive('/health-form') ? 'active' : ''}`} onClick={() => navigate('/health-form')}>
                📋 {t('healthAssessment')}
              </button>
              <button className={`nav-link ${isActive('/risk-result') ? 'active' : ''}`} onClick={() => navigate('/risk-result')}>
                🤖 {t('riskResult')}
              </button>
            </>
          ) : (
            <>
              <button className={`nav-link ${isActive('/asha-dashboard') ? 'active' : ''}`} onClick={() => navigate('/asha-dashboard')}>
                📊 {t('dashboard')}
              </button>
            </>
          )}
        </div>

        {/* Language Switcher */}
        <div className="lang-switcher">
          <button
            className={`lang-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => switchLanguage('en')}
          >EN</button>
          <button
            className={`lang-btn ${language === 'kn' ? 'active' : ''}`}
            onClick={() => switchLanguage('kn')}
          >ಕನ್ನಡ</button>
        </div>

        {/* User Menu */}
        <div className="navbar-user">
          <div className="user-info" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name?.split(' ')[0]}</span>
              <span className="user-role">{user?.role === 'asha_worker' ? 'ASHA Worker' : 'Mother'}</span>
            </div>
            <span className="dropdown-arrow">▾</span>
          </div>

          {menuOpen && (
            <div className="user-dropdown">
              <div className="dropdown-header">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
                <span className="dropdown-role-badge">{user?.role === 'asha_worker' ? '👩‍⚕️ ASHA Worker' : '🤱 Mother'}</span>
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" onClick={() => { setMenuOpen(false); navigate(user?.role === 'asha_worker' ? '/asha-dashboard' : '/dashboard'); }}>
                🏠 Dashboard
              </button>
              {user?.role === 'mother' && (
                <button className="dropdown-item" onClick={() => { setMenuOpen(false); navigate('/health-form'); }}>
                  📋 New Assessment
                </button>
              )}
              <div className="dropdown-divider"></div>
              <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {user?.role === 'mother' ? (
            <>
              <button onClick={() => { navigate('/dashboard'); setMenuOpen(false); }}>🏠 Dashboard</button>
              <button onClick={() => { navigate('/health-form'); setMenuOpen(false); }}>📋 Health Assessment</button>
            </>
          ) : (
            <button onClick={() => { navigate('/asha-dashboard'); setMenuOpen(false); }}>📊 Dashboard</button>
          )}
          <button className="mobile-logout" onClick={handleLogout}>🚪 Sign Out</button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
