"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { UserCheck, UserMinus, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

export default function MyCoachPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [coachLink, setCoachLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Redirection automatique si un token est présent dans l'URL
  useEffect(() => {
    if (token) {
      router.replace(`/invite/${token}`);
    }
  }, [token, router]);

  // 2. Récupération du coach actuel
  const fetchMyCoach = async () => {
    try {
      const res = await api('/coaching/my-coach');
      
      if (res.status === 204 || res.status === 404) {
        setCoachLink(null);
        return;
      }

      const text = await res.text();
      if (!text) {
        setCoachLink(null);
        return;
      }

      const data = JSON.parse(text);
      setCoachLink(data);
    } catch (err) {
      console.error("Erreur lors de la récupération du coach :", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminate = async () => {
  if (!coachLink || !confirm("Êtes-vous sûr de vouloir rompre le suivi avec ce coach ?")) return;

  try {
    const res = await api(`/coaching/link/${coachLink.id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setCoachLink(null);
    }
  } catch (err) {
    console.error("Erreur lors de la rupture du suivi", err);
  }
};

  useEffect(() => {
    fetchMyCoach();
  }, []);

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto ml-64">
      <h1 className="text-3xl font-black italic tracking-tight uppercase text-slate-900 mb-8 flex items-center gap-3">
        <UserCheck className="text-indigo-600" size={32} />
        Mon Coach
      </h1>

      {coachLink ? (
        // --- Affichage si Coach lié ---
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
          <div className="flex gap-6 items-center">
            <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
              {coachLink.coach.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{coachLink.coach.email}</h2>
              <p className="text-slate-500 mt-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Statut : Actif depuis le {new Date(coachLink.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <button 
  onClick={handleTerminate}
  className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition-colors"
>
  <UserMinus size={18} />
  Rompre le suivi
</button>
        </div>
      ) : (
        // --- Affichage si AUCUN Coach ---
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center max-w-lg mx-auto mt-12">
          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="text-slate-400" size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Vous n'êtes suivi par aucun coach</h2>
          <p className="text-slate-500">
            Votre coach doit vous envoyer un lien d'invitation personnel pour que vous puissiez lier vos comptes.
          </p>
        </div>
      )}
    </div>
  );
}