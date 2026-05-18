'use client';

import { api, triggerLogout } from '@/lib/api'; 

export default function ButtonLogout() {
  const handleLogout = async () => {
    try {
      const response = await api('/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erreur de réponse du serveur lors du logout');
      }
    } catch (error) {
      
      console.error('Échec de la déconnexion backend :', error);
    } finally {
     
      triggerLogout('MANUAL');
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
    >
      Logout
    </button>
  );
}