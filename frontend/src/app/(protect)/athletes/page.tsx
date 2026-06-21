"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { 
  Users, Plus, Copy, Check, Calendar, BarChart3, 
  AlertCircle, BatteryWarning, CheckCircle2, 
  ActivitySquare, HeartPulse, Flame, Loader2 
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';

interface PhysioData {
  state?: 'NORMAL' | 'FATIGUED' | 'PAIN' | 'INJURED';
  ftp?: number | null;
  restingHr?: number | null;
}

interface AthleteStats {
  weeklyDistance: number | null;
  lastActivityDate: string | null;
  physio?: PhysioData | null;
}

interface AthleteSummary {
  linkId: string;
  athlete: {
    id: string;
    email: string;
  };
  permissions: {
    shareActivities: boolean;
    sharePhysiology: boolean;
  };
  stats: AthleteStats;
}

const AthleteCard = ({ data }: { data: AthleteSummary }) => {
  const router = useRouter();
  const { athlete, permissions, stats } = data;
  const { physio } = stats;

  return (
    <div 
      onClick={() => router.push(`/athletes/${athlete.id}`)}
      className="group bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md hover:border-indigo-100 transition-all flex flex-col justify-between cursor-pointer"
    >
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-lg shadow-inner shrink-0">
            {athlete.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 truncate" title={athlete.email}>
              {athlete.email.split('@')[0]}
            </h3>
            <p className="text-xs text-slate-400 truncate">{athlete.email}</p>
          </div>
        </div>

        {permissions.sharePhysiology && physio?.state && (
          <div className="shrink-0 ml-2">
            {physio.state === 'INJURED' && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100"><AlertCircle size={10}/> Blessé</span>}
            {physio.state === 'PAIN' && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100"><ActivitySquare size={10}/> Douleur</span>}
            {physio.state === 'FATIGUED' && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100"><BatteryWarning size={10}/> Fatigué</span>}
            {physio.state === 'NORMAL' && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100"><CheckCircle2 size={10}/> OK</span>}
          </div>
        )}
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex gap-3">
          <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100/50 group-hover:bg-indigo-50/30 transition-colors">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distance</p>
            <p className="font-bold text-slate-900 mt-0.5">{stats.weeklyDistance ?? 0} <span className="text-xs text-slate-500 font-medium">km</span></p>
          </div>
          <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100/50 group-hover:bg-indigo-50/30 transition-colors">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dernière Act.</p>
            <p className="font-bold text-slate-900 mt-0.5 text-sm">
              {stats.lastActivityDate ? new Date(stats.lastActivityDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '--'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
        <button 
          onClick={(e) => {
            e.stopPropagation(); 
            router.push(`/athletes/${athlete.id}/data`);
          }}
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <BarChart3 size={14} /> Data
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/athletes/${athlete.id}/planning`);
          }}
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <Calendar size={14} /> Planning
        </button>
      </div>
    </div>
  );
};


export default function AthletesPage() {
  const { isCoach } = useAuth();
  const router = useRouter();
  
  const [athletes, setAthletes] = useState<AthleteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isCoach) {
      router.push('/');
      return;
    }

    const fetchAthletes = async () => {
      try {
        setError(null);
        const res = await api('/coaching/my-athletes-summary');
        if (!res.ok) throw new Error("Impossible de charger les athlètes");
        
        const data = await res.json();
        setAthletes(data);
      } catch (err) {
        console.error(err);
        setError("Une erreur est survenue lors du chargement de vos athlètes.");
      } finally {
        setLoading(false);
      }
    };

    fetchAthletes();
  }, [isCoach, router]);

  const generateLink = async () => {
    setIsGenerating(true);
    try {
      const res = await api('/coaching/invitations', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const fullLink = `${window.location.origin}/my-coach?token=${data.token}`;
        setInviteToken(fullLink);
      }
    } catch (err) {
      console.error("Erreur lors de la génération du lien", err);
    } finally {
      setIsGenerating(false);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-500 font-medium animate-pulse">Chargement de votre équipe...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full p-4 pb-20">
      
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight uppercase text-slate-900 flex items-center gap-3">
            <Users className="text-indigo-600" size={32} />
            Mes Athlètes
          </h1>
          <p className="text-slate-500 text-sm mt-1">Supervisez l'entraînement et la physiologie de votre équipe.</p>
        </div>
        
        <button 
          onClick={generateLink}
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200 text-sm shrink-0 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          Nouveau lien d'invitation
        </button>
      </div>

      {inviteToken && (
        <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 min-w-0 w-full animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm">
          <div className="min-w-0 flex-1 w-full">
            <p className="text-[11px] text-indigo-800 font-black uppercase tracking-widest mb-2">Lien généré (valide 7 jours)</p>
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-indigo-100 w-full">
              <code className="text-indigo-600 font-mono text-sm block truncate w-full pl-2 select-all">
                {inviteToken}
              </code>
            </div>
          </div>
          <button 
            onClick={copyToClipboard}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm shrink-0 w-full md:w-auto justify-center mt-6 md:mt-0 ${
              copied 
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 border-transparent' 
                : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copié !' : 'Copier le lien'}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="font-bold text-sm">{error}</p>
        </div>
      )}

      {!error && athletes.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-slate-300" size={32} />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-1">Aucun athlète</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">Générez un lien d'invitation ci-dessus et envoyez-le à vos athlètes pour commencer le suivi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {athletes.map((data) => (
            <AthleteCard key={data.linkId} data={data} />
          ))}
        </div>
      )}
    </div>
  );
}