'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { Calendar, Dumbbell, Clock, Heart, Zap, Target, TrendingUp } from 'lucide-react';

interface PendingAction {
  id: string;
  type: 'TRAINING_PROPOSAL' | 'GOAL_PROPOSAL' | 'METRIC_UPDATE';
  payload: any;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function PendingActionsChecker({ userId }: { userId: string }) {
  const [action, setAction] = useState<PendingAction | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const WS_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  const fetchLatestAction = useCallback(async () => {
    try {
      const res = await api('/pending-actions');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setAction(data[0]);
          setIsOpen(true);
        }
      }
    } catch (err) {
      console.error('Erreur fetch pending actions:', err);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchLatestAction();
    const socket: Socket = io(WS_URL, { query: { userId } });
    socket.on('NEW_PENDING_ACTION', () => fetchLatestAction());
    return () => { socket.disconnect(); };
  }, [userId, WS_URL, fetchLatestAction]);

  // Ignorer : ferme le popup, reste PENDING en base
  const handleDismiss = () => setIsOpen(false);

  // Refuser ou Accepter : appel API + ferme
  const handleResolve = async (status: 'ACCEPTED' | 'REJECTED') => {
    if (!action) return;
    try {
      const res = await api(`/pending-actions/${action.id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setIsOpen(false);
        setAction(null);
      }
    } catch (err) {
      console.error('Erreur résolution action:', err);
    }
  };

  if (!isOpen || !action) return null;

  const { type, payload } = action;
  const isTraining = type === 'TRAINING_PROPOSAL';
  const isGoal = type === 'GOAL_PROPOSAL';
  const isHr = payload.metric === 'maxHr';
  const target = payload.targets?.[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] transition-opacity">
      <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200">

        {/* HEADER */}
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          {isTraining && <Dumbbell className="text-indigo-600" size={22} />}
          {isGoal && <Target className="text-emerald-600" size={22} />}
          {!isTraining && !isGoal && (isHr ? <Heart className="text-red-500" size={22} /> : <Zap className="text-yellow-500" size={22} />)}

          {isTraining && 'Nouvelle séance proposée'}
          {isGoal && 'Nouvel objectif proposé'}
          {!isTraining && !isGoal && 'Nouveau record détecté !'}
        </h3>

        {/* CONTENU */}
        <div className="mt-4">
          {isTraining && (
            <div className="space-y-3">
              <p className="text-gray-700 font-bold">{payload.title}</p>
              <div className="bg-gray-50 p-3 rounded-xl text-sm space-y-2">
                <p className="flex items-center gap-2 text-gray-600">
                  <Calendar size={16} /> {formatDate(payload.scheduledDate)}
                </p>
                {payload.duration && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Clock size={16} /> {payload.duration} minutes
                  </p>
                )}
              </div>
            </div>
          )}

          {isGoal && (
            <div className="space-y-3">
              <p className="text-gray-700 font-bold">{payload.name}</p>
              <div className="bg-emerald-50 p-3 rounded-xl text-sm space-y-2">
                <p className="flex items-center gap-2 text-gray-600">
                  <Calendar size={16} />
                  {formatDate(payload.startDate)} → {formatDate(payload.endDate)}
                </p>
                {target && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <TrendingUp size={16} />
                    Cible : <strong className="text-emerald-700 ml-1">{target.targetValue}</strong>
                  </p>
                )}
              </div>
              {payload.description && (
                <p className="text-sm text-gray-500 italic">{payload.description}</p>
              )}
            </div>
          )}

          {!isTraining && !isGoal && (
            <p className="text-sm text-gray-600">
              Ton profil physiologique a potentiellement évolué. Ta{' '}
              <strong>{isHr ? 'Fréquence Cardiaque Max' : 'FTP'}</strong> est passée de{' '}
              <span className="font-medium text-gray-400 line-through">{payload.oldValue ?? '??'}</span>{' '}
              à <span className="font-bold text-green-500">{payload.newValue}</span> !
            </p>
          )}
        </div>

        {/* BOUTONS */}
        <div className="mt-6 flex justify-end gap-3">
          {/* Ignorer : reste PENDING, ferme juste le popup */}
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Ignorer
          </button>

          {/* Refuser : REJECTED persisté en base — uniquement pour les propositions */}
          {(isTraining || isGoal) && (
            <button
              onClick={() => handleResolve('REJECTED')}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              Refuser
            </button>
          )}

          {/* Accepter */}
          <button
            onClick={() => handleResolve('ACCEPTED')}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
          >
            {isTraining && 'Accepter la séance'}
            {isGoal && "Accepter l'objectif"}
            {!isTraining && !isGoal && 'Mettre à jour'}
          </button>
        </div>
      </div>
    </div>
  );
}