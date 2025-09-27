import React, { createContext, useContext, useState, useEffect } from 'react';

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    return Date.now() < payload.exp * 1000;
  } catch (e) {
    return false;
  }
}

interface AuthContextType {
  isLoggedIn: boolean;
  token: string | null;
  user: { email: string } | null;
  login: (token: string, userData?: { email: string }) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user_data');
    console.log('AuthContext: Checking stored token:', storedToken ? 'Present' : 'None');
    if (storedToken && isTokenValid(storedToken)) {
      setToken(storedToken);
      setIsLoggedIn(true);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse stored user data');
        }
      }
      console.log('AuthContext: User is logged in');
    } else {
      console.log('AuthContext: No valid token found, user not logged in');
      logout(); // Clear invalid/expired token
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, userData?: { email: string }) => {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
    setIsLoggedIn(true);
    if (userData) {
      setUser(userData);
      localStorage.setItem('user_data', JSON.stringify(userData));
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    sessionStorage.clear(); // Also clear session storage
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, token, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
