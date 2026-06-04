'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/app/context/AuthContext';

// --- Hook de compte à rebours ---
function useCountdown(expiresAt: string) {
  const calculateTimeLeft = () => Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, isExpired: timeLeft <= 0 };
}

// --- Interface ---
interface PendingAction {
  id: string;
  type: string;
  createdAt: string;
  expiresAt: string;
  payload: {
    metric: string;
    oldValue: number | null;
    newValue: number;
    activityId?: string;
  };
}

// --- Composant Ligne Individuelle ---
function NotificationItem({ action, onResolve }: { action: PendingAction, onResolve: (id: string, status: 'ACCEPTED' | 'REJECTED') => void }) {
  const { hours, minutes, seconds, isExpired } = useCountdown(action.expiresAt);
  const isHr = action.payload.metric === 'maxHr';

  if (isExpired) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl flex-shrink-0 ${isHr ? 'bg-red-50 text-red-500' : 'bg-yellow-50 text-yellow-500'}`}>
          {isHr ? '❤️' : '⚡'}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">
            Nouveau record de {isHr ? 'Fréquence Cardiaque Max' : 'FTP'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Mise à jour : <span className="line-through text-gray-400">{action.payload.oldValue ?? '??'}</span> → 
            <strong className="text-green-600 ml-1">{action.payload.newValue}</strong>
          </p>
          <p className="mt-2 text-xs font-mono font-bold text-red-500 bg-red-50 px-2 py-1 rounded inline-block">
            ⏳ {hours}h {minutes}m {seconds}s restants
          </p>
        </div>
      </div>

      <div className="flex gap-3 sm:flex-col lg:flex-row w-full sm:w-auto shrink-0">
        <button
          onClick={() => onResolve(action.id, 'REJECTED')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
        >
          Ignorer
        </button>
        <button
          onClick={() => onResolve(action.id, 'ACCEPTED')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  );
}

// --- Page Principale ---
export default function NotificationsPage() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api('/pending-actions');
      if (res.ok) {
        const data = await res.json();
        setActions(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const handleResolve = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    setActions((prev) => prev.filter((action) => action.id !== id));
    try {
      await api(`/pending-actions/${id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error("Erreur résolution:", error);
      fetchActions();
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Mes Notifications</h1>
      {actions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900">Tout est à jour !</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((action) => (
            <NotificationItem key={action.id} action={action} onResolve={handleResolve} />
          ))}
        </div>
      )}
    </div>
  );
}