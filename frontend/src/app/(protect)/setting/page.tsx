"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Calendar, Save, Loader2, Mail, CheckCircle2, KeyRound } from "lucide-react";
import { faStrava } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuth } from "@/app/context/AuthContext";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { user, loading, syncUser, logout } = useAuth();

  // États pour le MFA
  const [mfaEnabled, setMfaEnabled] = useState(false);
  
  // États pour le mot de passe
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // États globaux
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifications de changement
  const hasMfaChanged = user?.mfaEnabled !== mfaEnabled;
  const hasPasswordInput = newPassword.length > 0;
  const hasChanged = hasMfaChanged || hasPasswordInput;

  useEffect(() => {
    if (user) {
      setMfaEnabled(user.mfaEnabled || false);
    }
  }, [user]);

  if (loading) return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );

  const handleSave = async () => {
    if (!hasChanged) return;
    
    // Validation front-end
    if (hasPasswordInput && newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (hasPasswordInput && newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    
    setIsSaving(true);
    setError(null);

    try {
      // Construction du payload selon ce qui a été modifié
      const payload: { mfaEnabled?: boolean; password?: string } = {};
      if (hasMfaChanged) payload.mfaEnabled = mfaEnabled;
      if (hasPasswordInput) payload.password = newPassword;

      // Appel de ton nouvel endpoint backend
      const res = await api('/auth/update', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erreur lors de la mise à jour");

      const data = await res.json();

      // Si le backend demande une reconnexion (ex: changement de mot de passe)
      if (data.requiresLogin) {
        logout();
        return; // On arrête l'exécution ici car l'utilisateur va être redirigé
      }

      setShowSuccess(true);
      
      // Nettoyage des champs de mot de passe après succès
      setNewPassword("");
      setConfirmPassword("");
      
      // On resynchronise le user global
      await syncUser();
      
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setError("Impossible de sauvegarder les paramètres.");
    } finally {
      setIsSaving(false);
    }
  };

  // On extrait userStrava s'il existe dans l'objet user
  // @ts-ignore
  const userStrava = user?.userStrava;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header de page */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Paramètres</h2>
          <p className="text-slate-500 text-sm mt-1">Gérez la sécurité et les synchronisations de votre compte.</p>
        </div>
        <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
           <code className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">ID: {user?.id}</code>
        </div>
      </div>

      {/* Bouton de sauvegarde global flottant si des changements sont détectés */}
      {hasChanged && !error && (
         <div className="sticky top-4 z-50 mb-6 flex items-center justify-between gap-3 bg-indigo-50 p-4 rounded-xl border border-indigo-200 shadow-sm animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-bold text-indigo-800 tracking-tight">Vous avez des modifications non enregistrées.</span>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-100"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Enregistrer
            </button>
         </div>
      )}

      {showSuccess && (
        <div className="mb-6 flex items-center gap-3 bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold tracking-tight">Vos paramètres ont été mis à jour avec succès.</span>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Identifiants et Mot de passe */}
        <section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Mail size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Identifiants de connexion</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Adresse Email</label>
              <input
                type="email"
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 font-medium outline-none cursor-not-allowed"
                value={user?.email || ""}
                disabled
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <KeyRound size={12} /> Nouveau mot de passe
                </label>
                <input
                  type="password"
                  placeholder="Laisser vide pour ne pas changer"
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError(null);
                  }}
                />
              </div>
              
              {hasPasswordInput && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    placeholder="Répétez le mot de passe"
                    className={`w-full p-3 border rounded-xl text-slate-700 font-medium outline-none transition-all ${
                      confirmPassword && newPassword !== confirmPassword 
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' 
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                    }`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Sécurité */}
        <section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <ShieldCheck size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Sécurité du compte</h3>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex-1">
              <p className="font-bold text-slate-900">Double authentification (MFA)</p>
              <p className="text-sm text-slate-500 font-medium">Ajoutez une couche de sécurité additionnelle.</p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setMfaEnabled(!mfaEnabled)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  mfaEnabled ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${mfaEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Strava Section */}
        <section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
           <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-orange-50 rounded-lg text-[#FC4C02]">
                <FontAwesomeIcon icon={faStrava} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Synchronisation Apps</h3>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 bg-slate-50/50">
            <div className="flex-1">
              <p className="font-bold text-slate-900">Strava Connect</p>
              <p className="text-sm text-slate-500 font-medium">
                {userStrava ? "Synchronisation active et en temps réel." : "Liez votre compte pour importer vos activités."}
              </p>
            </div>

            {userStrava ? (
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative">
                  <img src={userStrava.profile} className="w-12 h-12 rounded-full border-2 border-indigo-50" alt="Strava" />
                  <div className="absolute -bottom-1 -right-1 bg-[#FC4C02] text-white rounded-full p-1 border-2 border-white">
                    <FontAwesomeIcon icon={faStrava} className="w-2 h-2" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 leading-none">{userStrava.firstname} {userStrava.lastname}</p>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase mt-1 tracking-tighter">Athlète Premium</p>
                </div>
              </div>
            ) : (
                <button className="bg-[#FC4C02] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-100">Connect Strava</button>
            )}
          </div>
        </section>

        {/* Système */}
        <section className="bg-slate-900 p-8 rounded-2xl text-white">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="text-indigo-400" size={20} />
            <h3 className="font-bold text-lg italic uppercase tracking-tight">Audit Système</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Membre depuis</p>
                <p className="text-sm font-bold text-indigo-300">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR", {month: 'long', year: 'numeric'}) : "N/A"}
                </p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dernière activité</p>
                <p className="text-sm font-bold text-indigo-300">
                  {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString("fr-FR") : "Aujourd'hui"}
                </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}