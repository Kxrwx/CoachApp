"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Users, Plus, Copy, Check, Activity, Calendar, Heart, Trophy, Target, BarChart3 } from 'lucide-react';
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
        const res = await api('/coaching/my-athletes');
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
  if (loading) return <div className="p-8 text-slate-500 font-medium pl-72">Chargement de l'équipe...</div>;

  return (
    // FIX 1 : On remplace ml-64 par un pl-64 propre pour la sidebar, et on isole le conteneur global
    <div className="pl-64 w-full min-h-screen bg-slate-50/30 overflow-x-hidden">
      <div className="p-8 max-w-6xl w-full mr-auto">
        
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
          // FIX 2 : Ajout de min-w-0 sur le parent flex pour forcer les enfants à respecter les limites de largeur
          <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 min-w-0 w-full animate-in fade-in slide-in-from-top-2 duration-200">
            {/* FIX 3 : min-w-0 et flex-1 ici permettent au bloc de texte de s'écraser correctement si l'écran est trop petit */}
            <div className="min-w-0 flex-1 w-full">
              <p className="text-xs text-indigo-800 font-bold uppercase tracking-wider mb-1">Lien généré (valide 7 jours) :</p>
              <code className="text-indigo-600 font-mono text-sm block truncate bg-white/60 p-2 rounded-lg border border-indigo-100/50 w-full select-all">
                {inviteToken}
              </code>
            </div>
            <button 
              onClick={copyToClipboard}
              className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2.5 rounded-xl hover:bg-indigo-50 font-semibold text-sm transition-colors shadow-sm shrink-0 w-full md:w-auto justify-center"
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
            <p className="text-slate-500 font-medium">Vous n'avez pas encore d'athlète sous votre aile.</p>
            <p className="text-slate-400 text-sm mt-1">Générez un lien d'invitation pour commencer le suivi.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {athletes.map((link) => (
              <div key={link.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all group flex flex-col justify-between">
                
                <div>
                  {/* Top: Avatar & Info */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0">
                      {link.athlete.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden min-w-0 flex-1">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {link.athlete.email}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Suivi depuis le {new Date(link.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Middle: Badges */}
                  <div className="mb-6 pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Accès autorisés :</p>
                    <div className="flex flex-wrap gap-1.5">
                      {link.shareActivities && (
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-indigo-100/50">
                          <Activity size={12} /> Activités
                        </span>
                      )}
                      {link.sharePhysiology && (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-rose-100/50">
                          <Heart size={12} /> Physio
                        </span>
                      )}
                      {link.shareRecords && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-amber-100/50">
                          <Trophy size={12} /> Records
                        </span>
                      )}
                      {link.shareObjectives && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-emerald-100/50">
                          <Target size={12} /> Objectifs
                        </span>
                      )}
                      {link.shareAnalytics && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-blue-100/50">
                          <BarChart3 size={12} /> Analyse
                        </span>
                      )}
                      
                      {!link.shareActivities && !link.sharePhysiology && !link.shareRecords && !link.shareObjectives && !link.shareAnalytics && (
                        <span className="text-xs text-slate-400 italic">Aucun accès accordé</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                  <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors">
                    <BarChart3 size={14} /> Consulter Data
                  </button>
                  <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors">
                    <Calendar size={14} /> Programme
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}