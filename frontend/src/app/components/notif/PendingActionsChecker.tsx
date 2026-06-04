'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api'; 

interface PendingAction {
  id: string;
  type: string;
  payload: {
    metric: string;
    oldValue: number | null;
    newValue: number;
  };
}

export default function PendingActionsChecker({ userId }: { userId: string }) {
  const [action, setAction] = useState<PendingAction | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const WS_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  const fetchLatestAction = useCallback(async () => {
    try {
      // Plus besoin de gérer les headers ni le token, ton utilitaire fait tout !
      const res = await api('/pending-actions');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setAction(data[0]);
          setIsOpen(true);
        }
      }
    } catch (err) {
      console.error("Erreur fetch pending actions:", err);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchLatestAction();

    const socket: Socket = io(WS_URL, {
      query: { userId },
    });

    socket.on('NEW_PENDING_ACTION', (data) => {
      console.log('🔔 Événement WS reçu !', data);
      fetchLatestAction();
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, WS_URL, fetchLatestAction]);

  const handleResolve = async (status: 'ACCEPTED' | 'REJECTED') => {
    if (!action) return;
    try {
      const res = await api(`/pending-actions/${action.id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      
      if (res.ok) {
        setIsOpen(false);
        setAction(null);
      }
    } catch (err) {
      console.error("Erreur résolution action:", err);
    }
  };

  if (!isOpen || !action) return null;

  const isHr = action.payload.metric === 'maxHr';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] transition-opacity">
      <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          {isHr ? '❤️' : '⚡'} Nouveau record détecté !
        </h3>
        <p className="mt-3 text-sm text-gray-600">
          Ton profil physiologique a potentiellement évolué. Ta <strong>{isHr ? 'Fréquence Cardiaque Max' : 'FTP'}</strong> est passée de <span className="font-medium text-gray-400 line-through">{action.payload.oldValue ?? '??'}</span> à <span className="font-bold text-green-500">{action.payload.newValue}</span> !
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Veux-tu mettre à jour tes zones d'entraînement avec cette nouvelle valeur ?
        </p>
        
        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={() => handleResolve('REJECTED')}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Ignorer
          </button>
          <button 
            onClick={() => handleResolve('ACCEPTED')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
          >
            Mettre à jour
          </button>
        </div>
      </div>
    </div>
  );
}