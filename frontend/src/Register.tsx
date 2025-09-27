import React, { useState } from 'react';
import { api } from './config/apiConfig';
import { useAuth } from './AuthContext';

interface RegisterProps {
  onBack: () => void;
  onGoToLogin: () => void;
  onRegisterSuccess: () => void;
}

const Register: React.FC<RegisterProps> = ({ onBack, onGoToLogin, onRegisterSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.register({ username: email, password });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || 'Registration failed');
        setIsLoading(false);
        return;
      }
      // Automatically log in after successful registration
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      const loginRes = await api.login(formData);
      if (!loginRes.ok) {
        setError('Registration succeeded, but login failed. Please sign in.');
        setIsLoading(false);
        onRegisterSuccess();
        return;
      }
      const loginData = await loginRes.json();
      login(loginData.access_token, { email });
      setIsLoading(false);
      onRegisterSuccess();
    } catch (err) {
      setError('Network error');
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-form" style={{ position: 'relative', overflow: 'visible' }}>
        {/* Registration Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            background: 'linear-gradient(135deg, #4ecdc4 0%, #ff6b6b 100%)',
            borderRadius: '50%',
            width: 72,
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(76,205,196,0.10)',
          }}>
            {/* User Plus Icon */}
            <svg width="36" height="36" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" />
              <path d="M16 16v2a4 4 0 0 1-8 0v-2" />
              <line x1="20" y1="12" x2="20" y2="18" />
              <line x1="17" y1="15" x2="23" y2="15" />
            </svg>
          </div>
        </div>
        <h2 style={{ marginBottom: 8, fontSize: 28 }}>Create your account</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="input-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              id="register-email"
              autoComplete="username"
            />
            <span className="input-icon">
              <svg width="18" height="18" fill="none" stroke="#4ecdc4" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="none"/><path d="M22 6l-10 7L2 6" /></svg>
            </span>
          </div>
          <div className="input-group" style={{ position: 'relative' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              id="register-password"
              autoComplete="new-password"
            />
            <span className="input-icon">
              <svg width="18" height="18" fill="none" stroke="#4ecdc4" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            </span>
          </div>
          <div className="input-group" style={{ position: 'relative' }}>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              id="register-confirm"
              autoComplete="new-password"
            />
            <span className="input-icon">
              <svg width="18" height="18" fill="none" stroke="#4ecdc4" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            </span>
          </div>
          {/* Error */}
          {error && <div style={{ color: '#ff6b6b', fontSize: 14, marginBottom: -12 }}>{error}</div>}
          <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: 8 }}>
            {isLoading ? 'Registering...' : 'Register'}
          </button>
          {/* Login Link */}
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span style={{ color: '#aaa', fontSize: 14 }}>Already have an account? </span>
            <button
              type="button"
              onClick={onGoToLogin}
              style={{
                background: 'none',
                border: 'none',
                color: '#4ecdc4',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'underline'
              }}
            >
              Sign in
            </button>
          </div>
          <button type="button" onClick={onBack} className="btn-secondary" style={{ marginTop: 18 }}>
            Back
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
