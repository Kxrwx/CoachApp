"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAccessToken } from '@/lib/api';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    pass: '',
  });

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  const endpoint = isLogin ? '/auth/signin' : '/auth/signup';

  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      credentials: 'include', // 🔥 CRUCIAL
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Une erreur est survenue');
    }


setAccessToken(data.access_token);

await fetch(`${BACKEND_URL}/auth/me`, {
  credentials: 'include',
}).then(res => res.json()).then(data => {
  window.dispatchEvent(new Event('auth-sync'));
});

router.push('/');
    router.refresh();

  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 font-sans text-slate-200">
      <div className="w-full max-w-md bg-[#1e293b] rounded-2xl shadow-2xl p-8 border border-slate-700/50">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {isLogin ? 'Connexion' : 'Inscription'}
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            {isLogin ? 'Accédez à votre espace coach' : 'Commencez votre entraînement aujourd\'hui'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-xs font-bold animate-pulse text-center">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1 tracking-wider">Email</label>
            <input
              type="email"
              required
              className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl p-3.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
              placeholder="votre@email.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1 tracking-wider">Mot de passe</label>
            <input
              type="password"
              required
              className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl p-3.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
              placeholder="••••••••"
              value={formData.pass}
              onChange={(e) => setFormData({...formData, pass: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Chargement...
              </span>
            ) : isLogin ? 'Se connecter' : "Créer mon compte"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            {isLogin ? "Nouveau ici ? " : "Déjà membre ? "}
            <span className="text-blue-400 font-bold ml-1 hover:underline underline-offset-4">
              {isLogin ? "Créer un compte" : "Se connecter"}
            </span>
          </button>
        </div>

      </div>
    </main>
  );
}