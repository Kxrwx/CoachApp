"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAccessToken } from '@/lib/api';

interface User { 
    id: string; 
    email: string; 
    mfaEnabled?: boolean;
    createdAt: Date;
    updatedAt: Date;
    integrations?: any[]; 
}
interface UserStrava {
    id: string;
    integrationId: string;
    stravaAuth: string;
    firstname: string;
    lastname: string;
    profilePicture: string;
    city: string;
    state: string;
    country: string;
    sex: string;
  } ;
  


interface AuthContextType {
  user: User | null;
  userStrava?: UserStrava | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  syncUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userStrava, setUserStrava] = useState<UserStrava | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

const syncUser = useCallback(async () => {
  try {
    const res = await api('/auth/me');

    if (!res.ok) {
      setUser(null);
      setUserStrava(null);
      return;
    }

    const data = await res.json();

    setUser(data.user);
    const stravaInfo = data.user.integrations?.find(
  (i: any) => i.usersStrava !== null
)?.usersStrava;

setUserStrava(stravaInfo || null);
  } catch {
    setUser(null);
    setUserStrava(null);
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
  setUserStrava(null);

  window.location.href = '/auth';
}, []);
const handleGlobalLogout = useCallback((e: any) => {
  const reason = e.detail?.reason || 'session_ended';

  const isAuthPage = window.location.pathname.startsWith('/auth');

  setUser(null);
  setUserStrava(null);

  if (!isAuthPage) {
    window.location.href = `/auth?reason=${reason}`;
  }
}, []);

  useEffect(() => {
  const isAuthPage = window.location.pathname.startsWith('/auth');

  if (!isAuthPage) {
    syncUser();
  } else {
    setLoading(false);
  }


  window.addEventListener('auth-sync', syncUser);
  window.addEventListener('auth-logout', handleGlobalLogout as EventListener);

  return () => {
    window.removeEventListener('auth-sync', syncUser);
    window.removeEventListener('auth-logout', handleGlobalLogout as EventListener);
  };
}, [syncUser, handleGlobalLogout]);
  return (
    <AuthContext.Provider value={{ 
      user, 
      userStrava,
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