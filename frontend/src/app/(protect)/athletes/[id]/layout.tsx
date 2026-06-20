"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2, AlertTriangle } from 'lucide-react';
import AthleteHeader from '../../../components/layout/coach/Header'; 

export default function AthleteDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const id = params.id as string; 
  
  const [allAthletes, setAllAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api(`/coaching/my-athletes`);
        
        if (res.ok) {
          const data = await res.json();
          setAllAthletes(data);
        } else {
          setErrorMsg("Impossible de charger la liste des athlètes.");
        }
      } catch (err) {
        setErrorMsg("Erreur serveur lors de la récupération des données.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );

  if (errorMsg) return (
    <div className="max-w-3xl mx-auto w-full p-4 mt-20">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-red-900 mb-2">Erreur</h2>
        <p className="text-red-700">{errorMsg}</p>
      </div>
    </div>
  );

  const currentAthleteLink = allAthletes.find(link => link.athleteId === id);

  if (!currentAthleteLink) {
    return (
      <div className="text-center py-20 text-slate-500">
        Athlète introuvable.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full p-4 pb-20">
      <AthleteHeader 
        id={id} 
        athlete={currentAthleteLink.athlete} 
        permissions={{
            shareActivities: currentAthleteLink.shareActivities ?? true, 
            sharePhysiology: currentAthleteLink.sharePhysiology ?? true
        }} 
        allAthletes={allAthletes}
      />
      <div className="animate-in fade-in duration-200">
        {children}
      </div>
    </div>
  );
}