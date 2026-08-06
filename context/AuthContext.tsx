'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  sendCode: (email: string, purpose?: 'SIGNUP' | 'LOGIN' | 'RESET_PASSWORD', name?: string, password?: string) => Promise<{ success: boolean; error?: string; message?: string; devCode?: string }>;
  verifyCode: (email: string, code: string, purpose?: 'SIGNUP' | 'LOGIN' | 'RESET_PASSWORD', name?: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to sign in' };
      }

      setUser(data.user);
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: message };
    }
  };

  const sendCode = async (
    email: string,
    purpose: 'SIGNUP' | 'LOGIN' | 'RESET_PASSWORD' = 'SIGNUP',
    name?: string,
    password?: string
  ) => {
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose, name, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to send verification code' };
      }

      return { success: true, message: data.message, devCode: data.devCode };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: message };
    }
  };

  const verifyCode = async (
    email: string,
    code: string,
    purpose: 'SIGNUP' | 'LOGIN' | 'RESET_PASSWORD' = 'SIGNUP',
    name?: string,
    password?: string
  ) => {
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, code, purpose, name, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to verify code' };
      }

      setUser(data.user);
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: message };
    }
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to reset password' };
      }

      setUser(data.user);
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        sendCode,
        verifyCode,
        resetPassword,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
