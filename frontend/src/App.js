import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MotherDashboard from './pages/MotherDashboard';
import HealthDataForm from './pages/HealthDataForm';
import RiskResultPage from './pages/RiskResultPage';
import AshaWorkerDashboard from './pages/AshaWorkerDashboard';
import PatientDetailPage from './pages/PatientDetailPage';

// Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f7ff' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ color: '#64748b', fontWeight: 500 }}>Loading JananiCare AI...</p>
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'asha_worker' ? '/asha-dashboard' : '/dashboard'} replace />;
  }
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={user.role === 'asha_worker' ? '/asha-dashboard' : '/dashboard'} /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={user.role === 'asha_worker' ? '/asha-dashboard' : '/dashboard'} /> : <RegisterPage />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['mother']}>
          <MotherDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/health-form" element={
        <ProtectedRoute allowedRoles={['mother']}>
          <HealthDataForm />
        </ProtectedRoute>
      } />
      
      <Route path="/risk-result" element={
        <ProtectedRoute allowedRoles={['mother']}>
          <RiskResultPage />
        </ProtectedRoute>
      } />
      
      <Route path="/asha-dashboard" element={
        <ProtectedRoute allowedRoles={['asha_worker']}>
          <AshaWorkerDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/patient/:id" element={
        <ProtectedRoute allowedRoles={['asha_worker']}>
          <PatientDetailPage />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
