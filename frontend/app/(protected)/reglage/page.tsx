"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Calendar, Save, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { faStrava } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAccount } from "../contexts/AccountProvider";
import axios from "axios";
import ButtonStravaConnect from "../components/button/buttonStravaConnect";

export default function SettingsPage() {
  const { user, userStrava,  loading } = useAccount();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanged = user?.mfaEnabled !== mfaEnabled;

  useEffect(() => {
    if (user) {
      setMfaEnabled(user.mfaEnabled || false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  const handleSave = async () => {
    if (!hasChanged) return;

    try {
      setIsSaving(true);
      setError(null);

      const res = await axios.post(
        "/api/me/setting/global",
        { mfaEnabled },
        { withCredentials: true }
      );

      if (res.status === 200) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde :", err);
      setError(err.response?.data?.message || "Erreur lors de la mise à jour.");
    } finally {
      setIsSaving(false);
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : "Date inconnue";

  return (
    <div className="max-w-4xl mx-auto pb-10">
  <div className="mb-8">
    <h2 className="text-2xl font-bold text-gray-800">Paramètres du compte</h2>
    <p className="text-gray-500 text-sm">
      Identifiant unique : <code className="bg-gray-100 px-1 rounded text-xs">{user?.id}</code>
    </p>
  </div>

  {showSuccess && (
    <div className="mb-6 flex items-center gap-2 bg-green-50 text-green-700 p-4 rounded-lg border border-green-200 animate-in fade-in slide-in-from-top-2">
      <CheckCircle2 size={18} />
      <span>Vos paramètres ont été mis à jour avec succès.</span>
    </div>
  )}

  {error && (
    <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm">
      {error}
    </div>
  )}

  <div className="space-y-6">
    {/* Section Identifiants (Lecture seule) */}
    <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b pb-4">
        <Mail className="text-indigo-600" size={20} />
        <h3 className="font-semibold text-gray-800">Identifiants</h3>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Adresse Email</label>
        <input
          type="email"
          className="w-full p-2 border rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed outline-none"
          value={user?.email || ""}
          disabled
        />
      </div>
    </section>

    {/* Section Sécurité */}
    <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b pb-4">
        <ShieldCheck className="text-indigo-600" size={20} />
        <h3 className="font-semibold text-gray-800">Sécurité</h3>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-gray-700">Double authentification (MFA)</p>
          <p className="text-sm text-gray-500">Sécurisez votre compte avec une étape de validation.</p>
        </div>

        <div className="flex items-center gap-6">
          {hasChanged && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all shadow-sm"
            >
              {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Enregistrer
            </button>
          )}

          <button
            onClick={() => setMfaEnabled(!mfaEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              mfaEnabled ? "bg-indigo-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                mfaEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </section>

    {/* SECTION STRAVA */}
<section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
  <div className="flex items-center gap-3 mb-6 border-b pb-4">
    <FontAwesomeIcon icon={faStrava} className="text-[#FC4C02] text-xl" />
    <h3 className="font-semibold text-gray-800">Applications tierces</h3>
  </div>

  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
    <div className="flex-1">
      <p className="font-medium text-gray-700">Strava</p>
      <p className="text-sm text-gray-500">
        {userStrava 
          ? "Votre compte est lié. Vos activités sont automatiquement synchronisées." 
          : "Synchronisez vos activités sportives et vos statistiques en temps réel."}
      </p>
    </div>

    {userStrava ? (
      <div className="group relative flex items-center gap-4 bg-orange-50/50 p-4 rounded-2xl border border-orange-100 min-w-[300px] transition-all hover:bg-orange-50">
        <div className="relative">
          <img 
            src={userStrava.profile} 
            alt="Profil Strava" 
            className="w-12 h-12 rounded-full border-2 border-white shadow-md"
          />
          <div className="absolute -bottom-1 -right-1 bg-[#FC4C02] text-white rounded-full p-0.5 border-2 border-white">
            <FontAwesomeIcon icon={faStrava} className="w-2 h-2" />
          </div>
        </div>
        
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 leading-none mb-1">
            {userStrava.firstname} {userStrava.lastname}
          </span>
          <span className="text-xs text-gray-600 mb-1">
            {userStrava.city}, {userStrava.country}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-orange-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
            Synchro le {new Date(userStrava.syncedAt).toLocaleDateString("fr-FR")}
          </span>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-4">
        <ButtonStravaConnect />
      </div>
    )}
  </div>

  {userStrava && (
    <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-50">
      <div className="flex gap-4">
         <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Sexe</p>
            <p className="text-sm font-semibold text-gray-700">{userStrava.sex === 'M' ? 'Homme' : 'Femme'}</p>
         </div>
         <div className="w-px h-8 bg-gray-100"></div>
         <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Région</p>
            <p className="text-sm font-semibold text-gray-700">{userStrava.state}</p>
         </div>
      </div>
      
      <button 
        onClick={() => {/* Ta fonction de déconnexion */}}
        className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
      >
        Dissocier le compte
      </button>
    </div>
  )}
</section>

    {/* Section Infos Système */}
    <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b pb-4">
        <Calendar className="text-indigo-600" size={20} />
        <h3 className="font-semibold text-gray-800">Informations système</h3>
      </div>
      <div className="text-sm text-gray-600 space-y-2">
        <p>Membre depuis : <span className="font-medium text-gray-800">{memberSince}</span></p>
        <p>Dernière mise à jour : <span className="font-medium text-gray-800">
          {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString("fr-FR") : "N/A"}
        </span></p>
      </div>
    </section>
  </div>
</div>
  );
}