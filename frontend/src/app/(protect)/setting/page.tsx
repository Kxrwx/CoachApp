"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Calendar, Save, Loader2, Mail, CheckCircle2, KeyRound, Activity, RotateCcw, Sparkles } from "lucide-react";
import { faStrava } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuth } from "@/app/context/AuthContext";
import { api } from "@/lib/api";
import StravaButton from "@/app/components/button/buttonStrava";

export default function SettingsPage() {
  const { user, userStrava, loading, syncUser, logout } = useAuth();

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [physioData, setPhysioData] = useState({
    restingHr: "",
    maxHr: "",
    ftp: "",
    weight: "",
    height: "",
    state: "NORMAL"
  });
  const [initialPhysio, setInitialPhysio] = useState<any>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPhysio, setIsSavingPhysio] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [showPhysioSuccess, setShowPhysioSuccess] = useState(false);
  const [physioSuccessMessage, setPhysioSuccessMessage] = useState("");
  const [physioError, setPhysioError] = useState<string | null>(null);

  const hasMfaChanged = user?.mfaEnabled !== mfaEnabled;
  const hasPasswordInput = newPassword.length > 0;
  const hasSecurityChanged = hasMfaChanged || hasPasswordInput;
  
  const hasPhysioChanged = initialPhysio !== null && (
    physioData.restingHr !== initialPhysio.restingHr ||
    physioData.maxHr !== initialPhysio.maxHr ||
    physioData.ftp !== initialPhysio.ftp ||
    physioData.weight !== initialPhysio.weight ||
    physioData.height !== initialPhysio.height ||
    physioData.state !== initialPhysio.state
  );

  useEffect(() => {
    const fetchPhysio = async () => {
      try {
        const res = await api('/physiology', { method: 'GET' });
        
        if (res.ok) {
          const text = await res.text();
          const data = text ? JSON.parse(text) : {};

          const formattedData = {
            restingHr: data?.restingHr?.toString() || "",
            maxHr: data?.maxHr?.toString() || "",
            ftp: data?.ftp?.toString() || "",
            weight: data?.weight?.toString() || "",
            height: data?.height?.toString() || "",
            state: data?.state || "NORMAL"
          };
          
          setPhysioData(formattedData);
          setInitialPhysio(formattedData);
        } else {
          setInitialPhysio({
            restingHr: "", maxHr: "", ftp: "", weight: "", height: ""
          });
        }
      } catch (err) {
        console.error("Erreur de récupération de la physiologie", err);
        setInitialPhysio({
            restingHr: "", maxHr: "", ftp: "", weight: "", height: ""
        });
      }
    };

    if (user) {
      setMfaEnabled(user.mfaEnabled || false);
      fetchPhysio();
    }
  }, [user]);

  if (loading) return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );

  const handleResyncPhysio = () => {
    if (initialPhysio) {
      setPhysioData({ ...initialPhysio });
    }
  };

  const handleCalculatePhysio = async () => {
    setIsCalculating(true);
    setPhysioError(null);
    try {
      const res = await api('/physiology/calculate', { method: 'GET' });
      if (!res.ok) throw new Error();
      
      const data = await res.json();
      
      setPhysioData({
        ...physioData,
        restingHr: data?.restingHr?.toString() || physioData.restingHr,
        maxHr: data?.maxHr?.toString() || physioData.maxHr,
        ftp: data?.ftp?.toString() || physioData.ftp,
      });

      setPhysioSuccessMessage("Métriques estimées. N'oubliez pas d'enregistrer !");
      setShowPhysioSuccess(true);
      setTimeout(() => setShowPhysioSuccess(false), 4000);
    } catch (err) {
      setPhysioError("Impossible de calculer les métriques depuis l'historique.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSavePhysio = async () => {
  if (!hasPhysioChanged) return;

  setIsSavingPhysio(true);
  setPhysioError(null);

  try {
    const physioPayload = {
      restingHr: physioData.restingHr ? parseInt(physioData.restingHr, 10) : null,
      maxHr: physioData.maxHr ? parseInt(physioData.maxHr, 10) : null,
      ftp: physioData.ftp ? parseFloat(physioData.ftp) : null,
      weight: physioData.weight ? parseFloat(physioData.weight) : null,
      height: physioData.height ? parseFloat(physioData.height) : null,
      state: physioData.state || "NORMAL", 
    };

    const physioRes = await api('/physiology', {
      method: 'POST',
      body: JSON.stringify(physioPayload),
    });

    if (!physioRes.ok) throw new Error();
    
    setInitialPhysio(physioData); 
    setPhysioSuccessMessage("Vos métriques physiologiques ont été enregistrées.");
    setShowPhysioSuccess(true);
    setTimeout(() => setShowPhysioSuccess(false), 3000);
  } catch (err) {
    setPhysioError("Impossible de sauvegarder les métriques.");
  } finally {
    setIsSavingPhysio(false);
  }
};
  const handleSaveSecurity = async () => {
    if (!hasSecurityChanged) return;
    
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
      const payload: { mfaEnabled?: boolean; password?: string } = {};
      if (hasMfaChanged) payload.mfaEnabled = mfaEnabled;
      if (hasPasswordInput) payload.password = newPassword;

      const res = await api('/auth/update', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      if (data.requiresLogin) {
        logout();
        return;
      }

      setSuccessMessage("Vos paramètres de sécurité ont été mis à jour.");
      setShowSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      await syncUser();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setError("Impossible de sauvegarder les paramètres de sécurité.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Paramètres</h2>
          <p className="text-slate-500 text-sm mt-1">Gérez la sécurité et les synchronisations de votre compte.</p>
        </div>
        <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
           <code className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">ID: {user?.id}</code>
        </div>
      </div>

      {hasSecurityChanged && !error && (
         <div className="sticky top-4 z-50 mb-6 flex items-center justify-between gap-3 bg-indigo-50 p-4 rounded-xl border border-indigo-200 shadow-sm animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-bold text-indigo-800 tracking-tight">Modifications de sécurité non enregistrées.</span>
            <button
              onClick={handleSaveSecurity}
              disabled={isSaving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-100"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Enregistrer la sécurité
            </button>
         </div>
      )}

      {showSuccess && (
        <div className="mb-6 flex items-center gap-3 bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold tracking-tight">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="space-y-8">
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

<section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
          <Activity size={20} />
      </div>
      <h3 className="font-bold text-slate-900 text-lg">Métriques Physiologiques</h3>
    </div>

    <button
      onClick={handleCalculatePhysio}
      disabled={isCalculating}
      className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-indigo-100"
    >
      {isCalculating ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
      Calculer via l'historique
    </button>
  </div>

  {showPhysioSuccess && (
    <div className="mb-6 flex items-center gap-3 bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 animate-in fade-in">
      <CheckCircle2 size={18} />
      <span className="text-sm font-bold tracking-tight">{physioSuccessMessage}</span>
    </div>
  )}

  {physioError && (
    <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm font-bold animate-in fade-in">
      {physioError}
    </div>
  )}
  
  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
    <div>
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">FC Repos (bpm)</label>
      <input
        type="number"
        className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
        value={physioData.restingHr || ''}
        onChange={(e) => setPhysioData({ ...physioData, restingHr: e.target.value })}
        placeholder="ex: 50"
      />
    </div>
    <div>
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">FC Max (bpm)</label>
      <input
        type="number"
        className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
        value={physioData.maxHr || ''}
        onChange={(e) => setPhysioData({ ...physioData, maxHr: e.target.value })}
        placeholder="ex: 195"
      />
    </div>
    <div>
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">FTP (Watts)</label>
      <input
        type="number"
        className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
        value={physioData.ftp || ''}
        onChange={(e) => setPhysioData({ ...physioData, ftp: e.target.value })}
        placeholder="ex: 250"
      />
    </div>
    <div>
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Poids (kg)</label>
      <input
        type="number"
        step="0.1"
        className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
        value={physioData.weight || ''}
        onChange={(e) => setPhysioData({ ...physioData, weight: e.target.value })}
        placeholder="ex: 70.5"
      />
    </div>
    <div>
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Taille (cm)</label>
      <input
        type="number"
        className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
        value={physioData.height || ''}
        onChange={(e) => setPhysioData({ ...physioData, height: e.target.value })}
        placeholder="ex: 180"
      />
    </div>
    <div>
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">État actuel</label>
      <select
        className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
        value={physioData.state || "NORMAL"}
        onChange={(e) => setPhysioData({ ...physioData, state: e.target.value })}
      >
        <option value="NORMAL">Normal</option>
        <option value="FATIGUED">Fatigué</option>
        <option value="PAIN">Douleur</option>
        <option value="INJURED">Blessé</option>
      </select>
    </div>
  </div>

  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
    <button
      onClick={handleResyncPhysio}
      disabled={!hasPhysioChanged}
      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
        hasPhysioChanged 
          ? "text-slate-700 bg-slate-200 hover:bg-slate-300 cursor-pointer" 
          : "text-slate-400 bg-slate-100 cursor-not-allowed opacity-70"
      }`}
    >
      <RotateCcw size={14} />
      Revenir (Anciennes data)
    </button>
    <button
      onClick={handleSavePhysio}
      disabled={isSavingPhysio || !hasPhysioChanged}
      className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
        hasPhysioChanged 
          ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer" 
          : "bg-rose-300 text-rose-50 cursor-not-allowed"
      }`}
    >
      {isSavingPhysio ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
      Enregistrer
    </button>
  </div>
</section>

        <section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
           <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-orange-50 rounded-lg text-[#FC4C02]">
                <FontAwesomeIcon icon={faStrava} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Synchronisation Apps</h3>
          </div>
          <StravaButton 
            userStrava={userStrava} 
            onSyncComplete={() => syncUser()} 
          />
        </section>

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