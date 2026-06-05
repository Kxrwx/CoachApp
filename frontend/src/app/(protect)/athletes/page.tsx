"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Users, Plus, Copy, Check, Activity, Calendar } from 'lucide-react';
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
    // Sécurité front-end (à doubler côté back bien sûr)
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
        // Construit le lien complet vers ta future page /join ou /my-coach
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

  if (!isCoach) return null; // Évite un clignotement avant la redirection
  if (loading) return <div className="p-8">Chargement de l'équipe...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto ml-64">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black italic tracking-tight uppercase text-slate-900 flex items-center gap-3">
          <Users className="text-indigo-600" size={32} />
          Mes Athlètes
        </h1>
        
        <button 
          onClick={generateLink}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-200"
        >
          <Plus size={20} />
          Nouveau lien d'invitation
        </button>
      </div>

      {/* Zone d'affichage du lien généré */}
      {inviteToken && (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-indigo-800 font-semibold mb-1">Lien généré (valide 7 jours) :</p>
            <code className="text-indigo-600 select-all">{inviteToken}</code>
          </div>
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
      )}

      {/* Grille des athlètes */}
      {athletes.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-lg">Vous n'avez pas encore d'athlète sous votre aile.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {athletes.map((link) => (
            <div key={link.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow group cursor-pointer">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-inner">
                  {link.athlete.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {link.athlete.email}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md">
                    Actif
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                  <Activity size={16} /> Data
                </button>
                <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                  <Calendar size={16} /> Programme
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}