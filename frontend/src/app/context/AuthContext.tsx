"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { api, setAccessToken } from '@/lib/api';

interface User { 
  id: string; 
  email: string; 
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  syncUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

const syncUser = useCallback(async () => {
  try {
    const res = await api('/auth/me');

    if (!res.ok) {
      setUser(null);
      return;
    }

    const data = await res.json();

    setUser(data.user);
  } catch {
    setUser(null);
  } finally {
    setLoading(false);
  }
}, []);


  const logout = useCallback(async () => {
  try {
  await api('/auth/logout', { method: 'POST' });
} catch {}

  setAccessToken(null);
  setUser(null);

  window.location.href = '/auth';
}, []);
  const handleGlobalLogout = useCallback((e: any) => {
    const reason = e.detail?.reason || 'session_ended';
    console.log(`AuthContext: Logout global déclenché (Raison: ${reason})`);
    
    setUser(null);
    window.location.href = `/auth?reason=${reason}`;
  }, []);

  useEffect(() => {
    syncUser();

    window.addEventListener('auth-sync', syncUser);

    window.addEventListener('auth-logout', handleGlobalLogout as EventListener);

    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('auth-sync', syncUser);
      window.removeEventListener('auth-logout', handleGlobalLogout as EventListener);
      window.removeEventListener('storage', syncUser);
    };
  }, [syncUser, handleGlobalLogout]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated: !!user, 
      logout, 
      syncUser 
    }}>
      {!loading ? children : (
        <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};