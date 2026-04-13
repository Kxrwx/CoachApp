"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

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

  const syncUser = useCallback(() => {
    const token = Cookies.get('access_token');
    
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(
  decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  )
);

      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        console.warn("AuthContext: Token expiré");
        setUser(null);
      } else {
        setUser({ 
          id: payload.sub, 
          email: payload.email 
        });
      }
    } catch (error) {
      console.error("AuthContext: Erreur de décodage token", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);


  const logout = useCallback(() => {
    Cookies.remove('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    window.location.href = '/auth?reason=manual_logout';
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