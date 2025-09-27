import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from './config/apiConfig';

interface LoginProps {
  onBack: () => void;
  onGoToRegister: () => void;
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onBack, onGoToRegister, onLoginSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      const res = await api.login(formData);
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || 'Login failed');
        setIsLoading(false);
        return;
      }
      // Store the JWT token
      const data = await res.json();
      login(data.access_token, { email });
      setIsLoading(false);
      onLoginSuccess();
    } catch (err) {
      setError('Network error');
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-form" style={{ position: 'relative', overflow: 'visible' }}>
        {/* Login Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #ff6b6b 100%)',
            borderRadius: '50%',
            width: 72,
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(76,205,196,0.10)',
          }}>
            <svg width="36" height="36" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10,17 15,12 10,7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>
        </div>
        <h2 style={{ marginBottom: 8, fontSize: 28 }}>Sign in to your account</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Email */}
          <div className="input-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              id="login-email"
              autoComplete="username"
            />
            <span className="input-icon">
              <svg width="18" height="18" fill="none" stroke="#667eea" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="none"/><path d="M22 6l-10 7L2 6" /></svg>
            </span>
          </div>
          {/* Password */}
          <div className="input-group" style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              id="login-password"
              autoComplete="current-password"
            />
            <span className="input-icon">
              <svg width="18" height="18" fill="none" stroke="#667eea" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            </span>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#667eea',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg width="18" height="18" fill="none" stroke="#667eea" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M1 1l22 22" />
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7.5a11.09 11.09 0 0 1 5.17-5.61" />
                  <path d="M9.53 9.53A3 3 0 0 0 12 15a3 3 0 0 0 2.47-5.47" />
                  <path d="M21 21l-2.12-2.12" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" stroke="#667eea" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M1 12C2.73 7.61 7 4.5 12 4.5s9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {/* Error */}
          {error && <div style={{ color: '#ff6b6b', fontSize: 14, marginBottom: -12 }}>{error}</div>}
          {/* Login Button */}
          <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: 8 }}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
          {/* Register Link */}
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span style={{ color: '#aaa', fontSize: 14 }}>Don't have an account? </span>
            <button
              type="button"
              onClick={onGoToRegister}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'underline'
              }}
            >
              Sign up
            </button>
          </div>
          {/* Back Button */}
          <button type="button" onClick={onBack} className="btn-secondary" style={{ marginTop: 18 }}>
            Back
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
