"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { User } from "../../../lib/shema";


interface AccountContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  setUserData: (user: User | null) => void; 
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/me/user`, { withCredentials: true });
      setUser(res.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const setUserData = (userData: User | null) => {
    setUser(userData);
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <AccountContext.Provider value={{ user, loading, refreshUser: fetchUser, setUserData }}>
      {children}
    </AccountContext.Provider>
  );
}

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    return { 
      user: null, 
      loading: false, 
      setUserData: () => {}, 
      refreshUser: async () => {} 
    };
  }
  return context;
};