"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { 
  Users, Plus, Copy, Check, Activity, Calendar, BarChart3, 
  Heart, Trophy, Target, AlertCircle, BatteryWarning, 
  CheckCircle2, ActivitySquare, HeartPulse, Flame 
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AthletesPage() {
  const { isCoach } = useAuth();
  const router = useRouter();
  
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isCoach) {
      router.push('/');
      return;
    }

    const fetchAthletes = async () => {
      try {
        // Route mise à jour pour récupérer le résumé complet
        const res = await api('/coaching/my-athletes-summary');
        if (res.ok) {
          const data = await res.json();
          setAthletes(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAthletes();
  }, [isCoach, router]);

  const generateLink = async () => {
    try {
      const res = await api('/coaching/invitations', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const fullLink = `${window.location.origin}/my-coach?token=${data.token}`;
        setInviteToken(fullLink);
      }
    } catch (err) {
      console.error("Erreur lors de la génération du lien", err);
    }
  };

  const copyToClipboard = () => {
    if (inviteToken) {
      navigator.clipboard.writeText(inviteToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isCoach) return null;
  if (loading) return <div className="text-slate-500 font-medium">Chargement de l'équipe...</div>;

  return (
    <div className="max-w-7xl mx-auto w-full p-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-black italic tracking-tight uppercase text-slate-900 flex items-center gap-3">
          <Users className="text-indigo-600" size={32} />
          Mes Athlètes
        </h1>
        
        <button 
          onClick={generateLink}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200 text-sm shrink-0"
        >
          <Plus size={18} />
          Nouveau lien d'invitation
        </button>
      </div>

      {/* Zone d'affichage du lien généré */}
      {inviteToken && (
        <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 min-w-0 w-full animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="min-w-0 flex-1 w-full">
            <p className="text-xs text-indigo-800 font-bold uppercase tracking-wider mb-1">Lien généré (valide 7 jours) :</p>
            <code className="text-indigo-600 font-mono text-sm block truncate bg-white/60 p-2.5 rounded-lg border border-indigo-100/50 w-full select-all">
              {inviteToken}
            </code>
          </div>
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-5 py-2.5 rounded-xl hover:bg-indigo-50 font-semibold text-sm transition-colors shadow-sm shrink-0 w-full md:w-auto justify-center"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
      )}

      {/* Grille des athlètes */}
      {athletes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
          <Users className="text-slate-300 mx-auto mb-3" size={40} />
          <p className="text-slate-500 font-medium text-lg">Vous n'avez pas encore d'athlète sous votre aile.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {athletes.map((data) => (
            <div key={data.linkId} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all flex flex-col justify-between">
              
              {/* Top: Avatar & Etat */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0">
                    {data.athlete.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 truncate">{data.athlete.email}</h3>
                  </div>
                </div>

                {/* Badge d'état (Si permission Physio ok) */}
                {data.permissions.sharePhysiology && data.stats.physio?.state && (
                  <div>
                    {data.stats.physio.state === 'INJURED' && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100"><AlertCircle size={10}/> Blessé</span>}
                    {data.stats.physio.state === 'PAIN' && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100"><ActivitySquare size={10}/> Douleur</span>}
                    {data.stats.physio.state === 'FATIGUED' && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100"><BatteryWarning size={10}/> Fatigué</span>}
                    {data.stats.physio.state === 'NORMAL' && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100"><CheckCircle2 size={10}/> OK</span>}
                  </div>
                )}
              </div>

              {/* Stats & Physio */}
              <div className="space-y-4 mb-6">
                <div className="flex gap-4">
                    <div className="flex-1 bg-slate-50 p-3 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Distance</p>
                        <p className="font-bold text-slate-900">{data.stats.weeklyDistance ?? 0} km</p>
                    </div>
                    <div className="flex-1 bg-slate-50 p-3 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Dernière act.</p>
                        <p className="font-bold text-slate-900 text-xs mt-1">{data.stats.lastActivityDate ? new Date(data.stats.lastActivityDate).toLocaleDateString() : 'Aucune'}</p>
                    </div>
                </div>

                {data.permissions.sharePhysiology && data.stats.physio && (
                  <div className="flex flex-wrap gap-2">
                    {data.stats.physio.ftp && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200"><Flame size={12} className="text-amber-500"/> {data.stats.physio.ftp}w</span>
                    )}
                    {data.stats.physio.restingHr && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200"><HeartPulse size={12} className="text-rose-500"/> {data.stats.physio.restingHr}bpm</span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors">
                  <BarChart3 size={14} /> Data
                </button>
                <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors">
                  <Calendar size={14} /> Planning
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}