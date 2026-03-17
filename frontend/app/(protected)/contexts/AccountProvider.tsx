"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { User, UserStrava } from "../../../lib/shema";

interface AccountContextType {
  user: User | null;
  userStrava: UserStrava | null; // Correction du type ici
  loading: boolean;
  refreshUser: () => Promise<void>;
  setUserData: (user: User | null) => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userStrava, setUserStrava] = useState<UserStrava | null>(null); // Type corrigé
  const [loading, setLoading] = useState(true);

  // Fonction globale pour rafraîchir toutes les données
  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      // On lance les deux requêtes en parallèle pour gagner du temps
      const [userRes, stravaRes] = await Promise.allSettled([
        axios.get(`/api/me/user`, { withCredentials: true }),
        axios.get(`/api/me/strava/user`, { withCredentials: true }) 
      ]);

      if (userRes.status === "fulfilled") {
        setUser(userRes.value.data);
      } else {
        setUser(null);
      }

      if (stravaRes.status === "fulfilled") {
        setUserStrava(stravaRes.value.data);
      } else {
        setUserStrava(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const setUserData = (userData: User | null) => {
    setUser(userData);
  };

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AccountContext.Provider value={{ user, userStrava, loading, refreshUser, setUserData }}>
      {children}
    </AccountContext.Provider>
  );
}

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error("useAccount doit être utilisé à l'intérieur d'un AccountProvider");
  }
  return context;
};