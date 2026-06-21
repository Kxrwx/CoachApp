"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { UserCheck, UserMinus, ShieldAlert, Activity, Heart, Trophy, Target, BarChart3, X, Save, Edit3 } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

export default function MyCoachPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [coachLink, setCoachLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPermissions, setEditPermissions] = useState({
    shareActivities: false,
    sharePhysiology: false,
    shareRecords: false,
    shareObjectives: false,
    shareAnalytics: false,
  });

  useEffect(() => {
    if (token) router.replace(`/invite/${token}`);
  }, [token, router]);

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
  const openEditModal = () => {
    setEditPermissions({
      shareActivities: coachLink.shareActivities,
      sharePhysiology: coachLink.sharePhysiology,
      shareRecords: coachLink.shareRecords,
      shareObjectives: coachLink.shareObjectives,
      shareAnalytics: coachLink.shareAnalytics,
    });
    setIsModalOpen(true);
  };

  const handleSavePermissions = async () => {
    try {
      await api(`/coaching/link/${coachLink.id}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify(editPermissions),
      });
      setCoachLink({ ...coachLink, ...editPermissions });
      setIsModalOpen(false);
    } catch (err) {
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleTerminate = async () => {
    if (!coachLink || !confirm("Êtes-vous sûr de vouloir rompre le suivi avec ce coach ?")) return;
    try {
      const res = await api(`/coaching/link/${coachLink.id}`, { method: 'DELETE' });
      if (res.ok) setCoachLink(null);
    } catch (err) {
      console.error("Erreur suppression", err);
    }
  };

  useEffect(() => { fetchMyCoach(); }, []);

 const PERMISSION_ITEMS = [
    { key: 'shareActivities', icon: Activity, label: 'Activités (Uploads)' },
    { key: 'sharePhysiology', icon: Heart, label: 'Données Physio' },
    { key: 'shareRecords', icon: Trophy, label: 'Records' },
    { key: 'shareObjectives', icon: Target, label: 'Objectifs' },
    { key: 'shareAnalytics', icon: BarChart3, label: 'Analyse (Stats)' },
  ];

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto ml-64">
      <h1 className="text-3xl font-black italic tracking-tight uppercase text-slate-900 mb-8 flex items-center gap-3">
        <UserCheck className="text-indigo-600" size={32} /> Mon Coach
      </h1>

      {coachLink ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            
            <div className="flex gap-4 items-center">
              <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                {coachLink.coach.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{coachLink.coach.email}</h2>
                <p className="text-sm text-slate-500">Suivi actif depuis le {new Date(coachLink.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={openEditModal} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors">
                <Edit3 size={16} /> Modifier
              </button>
              <button onClick={handleTerminate} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition-colors">
                <UserMinus size={16} /> Rompre
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Accès partagés :</h4>
            <div className="flex flex-wrap gap-2">
              {coachLink.shareActivities && <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium border border-indigo-100">Activités</span>}
              {coachLink.sharePhysiology && <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-medium border border-rose-100">Physiologie</span>}
              {coachLink.shareRecords && <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-medium border border-amber-100">Records</span>}
              {coachLink.shareObjectives && <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium border border-emerald-100">Objectifs</span>}
              {coachLink.shareAnalytics && <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-100">Analyse</span>}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <ShieldAlert className="text-slate-300 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold text-slate-900">Aucun suivi actif</h2>
            <p className="text-slate-500 mt-2">Votre coach doit vous inviter.</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Modifier les accès</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            
            <div className="space-y-3">
              {PERMISSION_ITEMS.map(({ key, icon: Icon, label }) => (
                <label key={key} className="flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:border-indigo-200">
                  <div className="flex items-center gap-3">
                    <Icon className="text-indigo-500" size={20} />
                    <span className="font-medium text-slate-700">{label}</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={editPermissions[key as keyof typeof editPermissions]}
                    onChange={(e) => setEditPermissions({...editPermissions, [key]: e.target.checked})}
                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              ))}
            </div>

            <button 
              onClick={handleSavePermissions}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Save size={18} /> Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}