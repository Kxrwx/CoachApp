'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Calendar, Dumbbell, Clock, Heart, Zap, Target, TrendingUp } from 'lucide-react';

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

interface PendingAction {
  id: string;
  type: 'TRAINING_PROPOSAL' | 'GOAL_PROPOSAL' | 'METRIC_UPDATE';
  createdAt: string;
  expiresAt: string;
  payload: any;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function ActionIcon({ type, metric }: { type: PendingAction['type']; metric?: string }) {
  if (type === 'TRAINING_PROPOSAL') {
    return <div className="p-3 rounded-xl flex-shrink-0 bg-indigo-50 text-indigo-600"><Dumbbell size={24} /></div>;
  }
  if (type === 'GOAL_PROPOSAL') {
    return <div className="p-3 rounded-xl flex-shrink-0 bg-emerald-50 text-emerald-600"><Target size={24} /></div>;
  }
  const isHr = metric === 'maxHr';
  return (
    <div className={`p-3 rounded-xl flex-shrink-0 ${isHr ? 'bg-red-50 text-red-500' : 'bg-yellow-50 text-yellow-500'}`}>
      {isHr ? <Heart size={24} /> : <Zap size={24} />}
    </div>
  );
}

function ActionContent({ action }: { action: PendingAction }) {
  const { type, payload } = action;

  if (type === 'TRAINING_PROPOSAL') {
    return (
      <>
        <h3 className="font-semibold text-gray-900">{payload.title}</h3>
        <div className="text-sm text-gray-600 mt-1 space-y-1">
          <p className="flex items-center gap-2">
            <Calendar size={14} />
            {formatDate(payload.scheduledDate)}
          </p>
          {payload.duration && (
            <p className="flex items-center gap-2">
              <Clock size={14} /> {payload.duration} minutes
            </p>
          )}
        </div>
      </>
    );
  }

  if (type === 'GOAL_PROPOSAL') {
    const target = payload.targets?.[0];
    return (
      <>
        <h3 className="font-semibold text-gray-900">{payload.name}</h3>
        <div className="text-sm text-gray-600 mt-1 space-y-1">
          <p className="flex items-center gap-2">
            <Calendar size={14} />
            {formatDate(payload.startDate)} → {formatDate(payload.endDate)}
          </p>
          {target && (
            <p className="flex items-center gap-2">
              <TrendingUp size={14} />
              Cible : <strong className="text-gray-800 ml-1">{target.targetValue}</strong>
            </p>
          )}
          {payload.description && (
            <p className="text-gray-500 italic text-xs mt-1">{payload.description}</p>
          )}
        </div>
      </>
    );
  }

  const isHr = payload.metric === 'maxHr';
  return (
    <>
      <h3 className="font-semibold text-gray-900">
        Nouveau record de {isHr ? 'Fréquence Cardiaque Max' : 'FTP'}
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        Mise à jour :{' '}
        <span className="line-through text-gray-400">{payload.oldValue ?? '??'}</span>
        {' → '}
        <strong className="text-green-600">{payload.newValue}</strong>
      </p>
    </>
  );
}

function getActionLabels(type: PendingAction['type']) {
  if (type === 'TRAINING_PROPOSAL') return { accept: 'Accepter', reject: 'Refuser' };
  if (type === 'GOAL_PROPOSAL') return { accept: "Accepter l'objectif", reject: 'Refuser' };
  return { accept: 'Mettre à jour', reject: 'Ignorer' };
}

function NotificationItem({
  action,
  onResolve,
}: {
  action: PendingAction;
  onResolve: (id: string, status: 'ACCEPTED' | 'REJECTED') => void;
}) {
  const { hours, minutes, seconds, isExpired } = useCountdown(action.expiresAt);
  if (isExpired) return null;

  const labels = getActionLabels(action.type);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all hover:shadow-md">
      <div className="flex items-start gap-4">
        <ActionIcon type={action.type} metric={action.payload?.metric} />
        <div>
          <ActionContent action={action} />
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
          {labels.reject}
        </button>
        <button
          onClick={() => onResolve(action.id, 'ACCEPTED')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
        >
          {labels.accept}
        </button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api('/pending-actions');
      if (res.ok) setActions(await res.json());
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
    setActions((prev) => prev.filter((a) => a.id !== id));
    try {
      const res = await api(`/pending-actions/${id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Erreur serveur');
    } catch (error) {
      console.error('Erreur résolution:', error);
      fetchActions();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Mes Notifications</h1>

      {actions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900">Tout est à jour !</h3>
          <p className="text-gray-500 mt-2">Aucune action en attente pour le moment.</p>
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