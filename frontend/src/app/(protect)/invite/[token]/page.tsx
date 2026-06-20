"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ShieldCheck, Activity, Heart, Trophy,Target, CheckCircle2, BarChart3 } from 'lucide-react';
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
    sharePhysiology: false, 
    shareRecords: false,
    shareObjectives: false,
    shareAnalytics: false,
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
        body: JSON.stringify({ token, ...permissions }),
      });

      if (res.ok) {
        router.push('/my-coach?success=true');
      } else {
        const data = await res.json();
        setError(data.message || "Une erreur est survenue.");
        setSaving(false);
      }
    } catch {
      setError("Erreur serveur.");
      setSaving(false);
    }
  };
  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Analyse du lien...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;

  const PERMISSION_ITEMS = [
    { key: 'shareActivities', icon: Activity, title: 'Activités (Uploads)', desc: 'Accès exclusif à vos séances importées.' },
    { key: 'sharePhysiology', icon: Heart, title: 'Données Physio', desc: 'FC Max, seuils, poids, FTP.' },
    { key: 'shareRecords', icon: Trophy, title: 'Records (PRs)', desc: 'Meilleurs temps et puissances max.' },
    { key: 'shareObjectives', icon: Target, title: 'Objectifs', desc: 'Vos courses et buts de la saison.' },
    { key: 'shareAnalytics', icon: BarChart3, title: 'Analyse de données', desc: 'Statistiques globales et charge d\'entraînement.' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        <div className="bg-indigo-600 p-8 text-center text-white">
          <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-black italic tracking-tight uppercase">Demande de Suivi</h1>
          <p className="mt-2 text-indigo-100">Le coach <strong>{invitation?.coach?.email}</strong> souhaite vous accompagner.</p>
        </div>

        <div className="p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Quelles données souhaitez-vous partager ?</h2>
          
          <div className="space-y-3">
            {PERMISSION_ITEMS.map(({ key, icon: Icon, title, desc }) => {
              const isChecked = permissions[key as keyof typeof permissions];
              return (
                <div 
                  key={key}
                  onClick={() => togglePermission(key as any)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
                >
                  <div className="flex items-center gap-4">
                    <Icon className={isChecked ? 'text-indigo-600' : 'text-slate-400'} size={24} />
                    <div>
                      <h3 className="font-bold text-slate-900">{title}</h3>
                      <p className="text-sm text-slate-500">{desc}</p>
                    </div>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${isChecked ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                    {isChecked && <CheckCircle2 size={16} className="text-white" />}
                  </div>
                </div>
              );
            })}
          </div>

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