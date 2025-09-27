import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import './App.css';
import Login from './Login';
import Register from './Register';
import HeaderBar from './HeaderBar';
import Sidebar from './Sidebar';
import { AuthProvider, useAuth } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from './DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import WidgetPage from './pages/WidgetPage';
import IntegrationPage from './pages/IntegrationPage';
import SubscriptionPage from './pages/SubscriptionPage';
import Landing from './Landing';
import DemoStorePage from './pages/DemoStorePage';
import AnalyticsPage from './pages/AnalyticsPage';


const AppContent: React.FC = () => {
  const { isLoggedIn, loading } = useAuth();

  // Add debugging
  console.log('AppContent - isLoggedIn:', isLoggedIn, 'loading:', loading);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <div className="animated-bg"></div>
      <div className="floating-orbs">
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
      </div>
      <Routes>
        <Route path="/" element={<Landing isLoggedIn={isLoggedIn} />} />
        <Route path="/demo-store" element={<DemoStorePage isLoggedIn={isLoggedIn} />} />
        <Route path="/login" element={<LoginWithNav />} />
        <Route path="/register" element={<RegisterWithNav />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
        </Route>
        <Route path="/analytics" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<AnalyticsPage />} />
        </Route>
        <Route path="/products" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<ProductsPage />} />
        </Route>
        <Route path="/widget" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<WidgetPage />} />
        </Route>
        <Route path="/integration" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<IntegrationPage />} />
        </Route>
        <Route path="/subscription" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<SubscriptionPage />} />
        </Route>
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

// Wrappers to use useNavigate in Login/Register
const LoginWithNav: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Login
      onBack={() => navigate('/')}
      onGoToRegister={() => navigate('/register')}
      onLoginSuccess={() => navigate('/dashboard')}
    />
  );
};

const RegisterWithNav: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Register
      onBack={() => navigate('/')}
      onGoToLogin={() => navigate('/login')}
      onRegisterSuccess={() => navigate('/dashboard')}
    />
  );
};

export default App;
