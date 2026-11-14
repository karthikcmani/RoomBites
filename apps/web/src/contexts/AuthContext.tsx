import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, CustomerProfile } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  profile: CustomerProfile | null;
  token: string | null;
  isLoading: boolean;
  requestOtp: (email: string) => Promise<{ success: boolean }>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  updateProfile: (data: { fullName: string; roomNumber: string; phoneNumber: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(api.getToken());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    if (!api.getToken()) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.auth.getProfile();
      if (res.profile) {
        setProfile(res.profile);
        setUser(prev => prev ? { ...prev, profile: res.profile! } : null);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('roombites_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        if (parsed.profile) setProfile(parsed.profile);
      } catch {}
    }
    refreshProfile();
  }, [token]);

  const requestOtp = async (email: string) => {
    const res = await api.auth.requestOtp(email);
    return { success: res.success };
  };

  const verifyOtp = async (email: string, code: string) => {
    const res = await api.auth.verifyOtp(email, code);
    setToken(res.token);
    setUser(res.user);
    if (res.user.profile) {
      setProfile(res.user.profile);
    }
    localStorage.setItem('roombites_user', JSON.stringify(res.user));
  };

  const updateProfile = async (data: { fullName: string; roomNumber: string; phoneNumber: string }) => {
    const res = await api.auth.updateProfile(data);
    setProfile(res.profile);
    setUser(prev => {
      const updated = prev ? { ...prev, profile: res.profile } : null;
      if (updated) localStorage.setItem('roombites_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    api.setToken(null);
    setToken(null);
    setUser(null);
    setProfile(null);
    localStorage.removeItem('roombites_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        isLoading,
        requestOtp,
        verifyOtp,
        updateProfile,
        refreshProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
