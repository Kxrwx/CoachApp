"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ShieldCheck, Activity, Heart, Calendar, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

export default function InviteConsentPage() {
  const { token } = useParams();
  const router = useRouter();
  const { user } = useAuth(); // On suppose que l'utilisateur est connecté

  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // État des consentements
  const [permissions, setPermissions] = useState({
    shareActivities: true,
    sharePhysiology: false, // Sensible, désactivé par défaut
    shareCalendar: true,
  });

  useEffect(() => {
    // Si l'utilisateur n'est pas connecté, on le redirige vers l'auth
    // avec un paramètre pour revenir ici après connexion
    if (!user) {
      router.push(`/auth?returnTo=/invite/${token}`);
      return;
    }

    const fetchInviteDetails = async () => {
      try {
        const res = await api(`/coaching/invitations/${token}`);
        if (res.ok) {
          const data = await res.json();
          setInvitation(data);
        } else {
          setError("Lien d'invitation invalide, expiré ou déjà utilisé.");
        }
      } catch {
        setError("Erreur de connexion serveur.");
      } finally {
        setLoading(false);
      }
    };

    fetchInviteDetails();
  }, [token, user, router]);

 const handleAccept = async () => {
    setSaving(true);
    try {
      const res = await api('/coaching/invitations/consume', {
        method: 'POST',
        body: JSON.stringify({ 
          token, 
          ...permissions
        }),
      });

      if (res.ok) {
        router.push('/my-coach?success=true');
      } else {
        const data = await res.json();
        setError(data.message || "Une erreur est survenue.");
        setSaving(false);
      }
    } catch {
      setError("Erreur de connexion serveur.");
      setSaving(false);
    }
  };
  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Analyse du lien d'invitation...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Header Carte */}
        <div className="bg-indigo-600 p-8 text-center text-white">
          <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-black italic tracking-tight uppercase">Demande de Suivi</h1>
          <p className="mt-2 text-indigo-100">
            Le coach <strong>{invitation.coach.email}</strong> souhaite vous accompagner.
          </p>
        </div>

        {/* Section Consentement */}
        <div className="p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Quelles données souhaitez-vous partager avec ce coach ?</h2>
          
          <div className="space-y-4">
            {/* Toggle Activités */}
            <div 
              onClick={() => togglePermission('shareActivities')}
              className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${permissions.shareActivities ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
            >
              <div className="flex items-center gap-4">
                <Activity className={permissions.shareActivities ? 'text-indigo-600' : 'text-slate-400'} size={24} />
                <div>
                  <h3 className="font-bold text-slate-900">Activitées (Strava, Uploads)</h3>
                  <p className="text-sm text-slate-500">Distance, puissance, GPS, chronos.</p>
                </div>
              </div>
              <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${permissions.shareActivities ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                {permissions.shareActivities && <CheckCircle2 size={16} className="text-white" />}
              </div>
            </div>

            {/* Toggle Calendrier */}
            <div 
              onClick={() => togglePermission('shareCalendar')}
              className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${permissions.shareCalendar ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
            >
              <div className="flex items-center gap-4">
                <Calendar className={permissions.shareCalendar ? 'text-indigo-600' : 'text-slate-400'} size={24} />
                <div>
                  <h3 className="font-bold text-slate-900">Calendrier & Objectifs</h3>
                  <p className="text-sm text-slate-500">Permet au coach de planifier des séances.</p>
                </div>
              </div>
              <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${permissions.shareCalendar ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                {permissions.shareCalendar && <CheckCircle2 size={16} className="text-white" />}
              </div>
            </div>

            {/* Toggle Physio (Données sensibles) */}
            <div 
              onClick={() => togglePermission('sharePhysiology')}
              className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${permissions.sharePhysiology ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
            >
              <div className="flex items-center gap-4">
                <Heart className={permissions.sharePhysiology ? 'text-indigo-600' : 'text-slate-400'} size={24} />
                <div>
                  <h3 className="font-bold text-slate-900">Données Physiologiques</h3>
                  <p className="text-sm text-slate-500">Poids, Fréquence Cardiaque max, FTP.</p>
                </div>
              </div>
              <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${permissions.sharePhysiology ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                {permissions.sharePhysiology && <CheckCircle2 size={16} className="text-white" />}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-6 text-center">
            Vous pourrez modifier ces accès à tout moment depuis les paramètres de votre compte.
          </p>

          <button 
            onClick={handleAccept}
            disabled={saving}
            className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Validation en cours...' : 'Accepter & Partager'}
          </button>
        </div>
      </div>
    </div>
  );
}