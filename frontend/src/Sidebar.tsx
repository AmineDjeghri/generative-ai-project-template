import React from 'react';
import { useLocation } from 'react-router-dom';

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
};

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', desc: 'Overview', section: 'Main', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { key: 'analytics', label: 'Analytics', icon: '📈', desc: 'Usage', section: 'Main', gradient: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)' },
  { key: 'products', label: 'Products', icon: '👕', desc: 'Catalogue', section: 'Main', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { key: 'widget', label: 'Widget', icon: '🔧', desc: 'Customize', section: 'Settings', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { key: 'integration', label: 'Integration', icon: '🔑', desc: 'API & Embed', section: 'Settings', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { key: 'subscription', label: 'Subscription', icon: '💳', desc: 'Billing & Credits', section: 'Settings', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { key: 'logout', label: 'Logout', icon: '🚪', desc: 'Sign out', section: 'Settings', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)' },
];

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen, onNavigate, onLogout }) => {
  const location = useLocation();
  const getActivePage = () => {
    if (location.pathname.startsWith('/dashboard')) return 'dashboard';
    if (location.pathname.startsWith('/analytics')) return 'analytics';
    if (location.pathname.startsWith('/products')) return 'products';
    if (location.pathname.startsWith('/widget')) return 'widget';
    if (location.pathname.startsWith('/integration')) return 'integration';
    if (location.pathname.startsWith('/subscription')) return 'subscription';
    return '';
  };
  const activePage = getActivePage();
  const sections = Array.from(new Set(navItems.map(i => i.section)));
  return (
    <aside style={{
      width: sidebarOpen ? 280 : 80,
      background: 'rgba(15, 17, 25, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
      color: 'white',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      minHeight: 'calc(100vh - 70px)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 70,
      left: 0,
      bottom: 0,
      zIndex: 1001,
      overflow: 'hidden',
    }}>
      {/* Toggle Button */}
      <div style={{
        display: 'flex',
        justifyContent: sidebarOpen ? 'flex-end' : 'center',
        padding: '20px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: 20,
      }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: '#8fa7ff',
            fontSize: '18px',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(10px)',
          }}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>
      {/* Navigation Items by section */}
      <div style={{
        padding: '0 16px',
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
      }}>
        {sections.map(section => (
          <div key={section} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px',
              opacity: sidebarOpen ? 1 : 0,
              transition: 'opacity 0.3s ease',
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(-20px)',
            }}>{section}</div>
            {navItems.filter(i => i.section === section).map(item => (
              <div
                key={item.key}
                onClick={() => {
                  if (item.key === 'logout' && onLogout) onLogout();
                  else onNavigate(item.key);
                }}
                style={{
                  display: 'flex',
                  flexDirection: sidebarOpen ? 'row' : 'column',
                  alignItems: 'center',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  width: sidebarOpen ? '100%' : 56,
                  height: 56,
                  background: activePage === item.key ? item.gradient : 'rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  marginBottom: 12,
                  cursor: 'pointer',
                  border: activePage === item.key ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  padding: 0,
                  paddingLeft: sidebarOpen ? 12 : 0,
                  boxShadow: activePage === item.key ? '0 4px 16px #667eea33' : undefined,
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  background: item.gradient,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
                  marginRight: sidebarOpen ? 16 : 0,
                }}>{item.icon}</div>
                {sidebarOpen && (
                  <div style={{ transition: 'opacity 0.3s ease', opacity: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'white' }}>{item.label}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>{item.desc}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
