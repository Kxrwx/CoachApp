'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/app/context/AuthContext';

interface PendingAction {
  id: string;
  type: string;
  createdAt: string;
  payload: {
    metric: string;
    oldValue: number | null;
    newValue: number;
    activityId?: string;
  };
}

export default function NotificationsPage() {
  const { user } = useAuth();
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
    try {
      // Retrait optimiste de l'UI pour une sensation de rapidité
      setActions((prev) => prev.filter((action) => action.id !== id));
      
      await api(`/pending-actions/${id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error("Erreur lors de la résolution:", error);
      fetchActions();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Mes Notifications</h1>

      {actions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900">Tout est à jour !</h3>
          <p className="text-gray-500 mt-2">Tu n'as aucune action en attente pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((action) => {
            const isHr = action.payload.metric === 'maxHr';
            const date = new Date(action.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric'
            });

            return (
              <div key={action.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all hover:shadow-md">
                
                {/* Icône & Texte */}
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl flex-shrink-0 ${isHr ? 'bg-red-50 text-red-500' : 'bg-yellow-50 text-yellow-500'}`}>
                    {isHr ? '❤️' : '⚡'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Nouveau record de {isHr ? 'Fréquence Cardiaque Max' : 'FTP'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Es-tu d'accord pour mettre à jour ton profil physiologique ? Tu passeras de <span className="line-through text-gray-400">{action.payload.oldValue ?? '??'}</span> à <strong className="text-green-600">{action.payload.newValue}</strong>.
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Détecté le {date}</p>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-3 sm:flex-col lg:flex-row w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => handleResolve(action.id, 'REJECTED')}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Ignorer
                  </button>
                  <button
                    onClick={() => handleResolve(action.id, 'ACCEPTED')}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                  >
                    Mettre à jour
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}