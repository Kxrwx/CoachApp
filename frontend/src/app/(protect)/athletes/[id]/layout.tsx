"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2, AlertTriangle, ChevronLeft } from 'lucide-react';

import AthleteHeader from '../../../components/layout/coach/Header'; 

interface AthleteInfo {
  athlete: { id: string; email: string };
  permissions: { shareActivities: boolean; sharePhysiology: boolean };
}

export default function AthleteDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const id = params.id as string; 
  
  const router = useRouter();
  
  const [athleteInfo, setAthleteInfo] = useState<AthleteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  // NOUVEAU : État pour capturer et afficher l'erreur
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchAthleteDetails = async () => {
      try {
        const res = await api(`/coaching/athletes/${id}`);
        
        if (res.ok) {
          const data = await res.json();
          setAthleteInfo(data);
        } else {
          // ON NE REDIRIGE PLUS. On lit l'erreur renvoyée par le serveur.
          const errorData = await res.json().catch(() => ({}));
          console.error("Détail de l'erreur API :", errorData);
          setErrorMsg(`Erreur ${res.status} : La requête a échoué. La route backend existe-t-elle ?`);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération de l'athlète", err);
        setErrorMsg("Impossible de contacter le serveur (Crash ou problème réseau).");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchAthleteDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-500 font-medium">Chargement du tableau de bord...</p>
      </div>
    );
  }

  // AFFICHAGE DE L'ERREUR À L'ÉCRAN
  if (errorMsg) {
    return (
      <div className="max-w-3xl mx-auto w-full p-4 mt-20">
        <button 
          onClick={() => router.push('/athletes')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6"
        >
          <ChevronLeft size={16} /> Retour aux athlètes
        </button>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Impossible de charger l'athlète</h2>
          <p className="text-red-700 mb-4">{errorMsg}</p>
          <div className="text-left bg-white p-4 rounded-xl border border-red-100 text-sm text-slate-600 font-mono">
            Vérifiez dans votre console (F12) ou l'onglet "Réseau". <br/>
            L'URL appelée est : <strong>GET /coaching/athletes/{id}</strong>
          </div>
        </div>
      </div>
    );
  }

  if (!athleteInfo) return null;

  return (
    <div className="max-w-7xl mx-auto w-full p-4 pb-20">
      <AthleteHeader 
        id={id} 
        athlete={athleteInfo.athlete} 
        permissions={athleteInfo.permissions} 
      />
      <div className="animate-in fade-in duration-200">
        {children}
      </div>
    </div>
  );
}