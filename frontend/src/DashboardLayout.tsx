import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import HeaderBar from './HeaderBar';
import Sidebar from './Sidebar';
import { useAuth } from './AuthContext';

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getActivePage = () => {
    if (location.pathname.startsWith('/dashboard')) return 'dashboard';
    if (location.pathname.startsWith('/products')) return 'products';
    if (location.pathname.startsWith('/widget')) return 'widget';
    if (location.pathname.startsWith('/integration')) return 'integration';
    return '';
  };

  const handleSidebarNav = (page: string) => {
    navigate(`/${page}`);
    if (page === 'logout') {
      logout();
      navigate('/');
    }
  };

  return (
    <>
      <HeaderBar
        isLoggedIn={true}
        onLogoClick={() => navigate('/')}
        onLoginClick={() => navigate('/login')}
        onLogout={handleLogout}
        user={user}
      />
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onNavigate={handleSidebarNav}
        onLogout={handleLogout}
      />
      <div
        style={{
          width: `calc(100vw - ${sidebarOpen ? 280 : 80}px)`,
          marginLeft: sidebarOpen ? 280 : 80,
          marginTop: 70,
          minHeight: 'calc(100vh - 70px)',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Outlet />
      </div>
    </>
  );
};

export default DashboardLayout;
