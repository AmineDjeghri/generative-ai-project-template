import React, { useState } from 'react';

type HeaderBarProps = {
  isLoggedIn: boolean;
  onLoginClick?: () => void;
  onLogoClick?: () => void;
  onLogout?: () => void;
  user?: { email: string } | null;
};

const HeaderBar: React.FC<HeaderBarProps> = ({ isLoggedIn, onLoginClick, onLogoClick, onLogout, user }) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  return (
    <header style={{
      background: 'rgba(10,10,10,0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      height: 64,
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
    }}>
      <nav className="container" style={{ display: 'flex', alignItems: 'center', height: '100%', minHeight: 64, padding: 0, justifyContent: 'flex-start', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <button className="logo" onClick={onLogoClick} style={{ fontSize: '2rem', fontWeight: 800, color: 'white', letterSpacing: 1, background: 'none', border: 'none', cursor: 'pointer' }}>VirtualFit</button>
          {!isLoggedIn && (
            <ul className="nav-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#integration">Integration</a></li>
              <li><a href="#testimonials">Testimonials</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="/demo-store">Demo Store</a></li>
            </ul>
          )}
        </div>
        <div style={{ flex: 1 }} />
        {!isLoggedIn ? (
          <button className="cta-button" onClick={onLoginClick}>Login</button>
        ) : (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: '12px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>Account</span>
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="white"
                strokeWidth="2"
                viewBox="0 0 24 24"
                style={{
                  transform: showProfileDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              >
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </button>

            {showProfileDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                background: 'rgba(20,22,35,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                minWidth: 160,
                zIndex: 1001,
                overflow: 'hidden'
              }}>
                <div style={{ padding: '8px' }}>
                  <button
                    onClick={() => {
                      onLogout?.();
                      setShowProfileDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(255,107,107,0.1)',
                      border: '1px solid rgba(255,107,107,0.3)',
                      color: '#ff6b6b',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,107,107,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16,17 21,12 16,7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Click outside to close dropdown */}
      {showProfileDropdown && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowProfileDropdown(false)}
        />
      )}
    </header>
  );
};

export default HeaderBar;
