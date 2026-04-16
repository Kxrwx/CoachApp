"use client";

import { useState, useEffect } from "react";
import { Loader2, LogOut } from "lucide-react";
import { faStrava } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

interface StravaButtonProps {
  userStrava?: any; 
  onSyncComplete?: () => void; 
}

export default function StravaButton({ userStrava, onSyncComplete }: StravaButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const code = searchParams.get("code");
    
    if (code) {
      const linkStravaAccount = async () => {
        setIsConnecting(true);
        try {
          const res = await api(`/strava/callback?code=${code}`);
          if (!res.ok) throw new Error("Erreur lors de la liaison");

          router.replace(pathname, { scroll: false });
          if (onSyncComplete) onSyncComplete();
          
        } catch (err) {
          setError("Échec de l'enregistrement Strava.");
        } finally {
          setIsConnecting(false);
        }
      };
      linkStravaAccount();
    }
  }, [searchParams, pathname, router, onSyncComplete]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await api('/strava/connect');
      if (!res.ok) throw new Error("Erreur");
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; 
      }
    } catch (err) {
      setError("Impossible de joindre Strava.");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Voulez-vous vraiment déconnecter votre compte Strava ?")) return;

    setIsDisconnecting(true);
    setError(null);
    try {
      const res = await api('/strava/disconnect', { method: 'DELETE' });
      if (!res.ok) throw new Error("Erreur lors de la déconnexion");

      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      setError("Erreur lors de la déconnexion de Strava.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 bg-slate-50/50">
      <div className="flex-1">
        <p className="font-bold text-slate-900">Strava Connect</p>
        <p className="text-sm text-slate-500 font-medium">
          {userStrava 
            ? "Synchronisation active et en temps réel." 
            : "Liez votre compte pour importer vos activités."}
        </p>
        {error && <p className="text-xs text-red-500 mt-2 font-bold">{error}</p>}
      </div>

      {userStrava ? (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Badge Profil */}
          <div className="flex items-center gap-4 bg-white p-3 pr-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative">
              <img 
                src={userStrava.profilePicture || userStrava.profile || "/default-avatar.png"} 
                className="w-10 h-10 rounded-full border-2 border-indigo-50 object-cover" 
                alt="Strava" 
              />
              <div className="absolute -bottom-1 -right-1 bg-[#FC4C02] text-white rounded-full p-1 border-2 border-white">
                <FontAwesomeIcon icon={faStrava} className="w-2 h-2" />
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 leading-none">
                {userStrava.firstname} {userStrava.lastname}
              </p>
              <p className="text-[10px] font-bold text-indigo-600 uppercase mt-1 tracking-tighter">Connecté</p>
            </div>
          </div>

          {/* Bouton Déconnexion */}
          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors p-2 text-sm font-bold"
            title="Déconnecter Strava"
          >
            {isDisconnecting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <LogOut size={18} />
                <span className="sm:hidden lg:inline">Déconnecter</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex items-center gap-2 bg-[#FC4C02] hover:bg-[#E34402] transition-colors text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-100 disabled:opacity-70"
        >
          {isConnecting ? <Loader2 className="animate-spin" size={16} /> : <FontAwesomeIcon icon={faStrava} size="lg" />}
          <span>{isConnecting ? "Connexion..." : "Connect Strava"}</span>
        </button>
      )}
    </div>
  );
}