"use client"
import { User, Bell, ShieldCheck, Calendar, Save, Loader2, Mail } from "lucide-react";
import { useAccount } from "../contexts/AccountProvider";

export default function SettingsPage() {
  const { user, loading } = useAccount();

  if (loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  // Formatage des dates (createdAt est un objet Date via Zod)
  const memberSince = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : "Date inconnue";

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Paramètres du compte</h2>
        <p className="text-gray-500 text-sm">Identifiant unique : <code className="bg-gray-100 px-1 rounded text-xs">{user?.id}</code></p>
      </div>

      <div className="space-y-6">
        {/* Section Identifiants */}
        <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b pb-4">
            <Mail className="text-indigo-600" size={20} />
            <h3 className="font-semibold text-gray-800">Identifiants</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Adresse Email</label>
              <input 
                type="email" 
                className="w-full p-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" 
                value={user?.email || ""} 
                disabled 
              />
              <p className="text-xs text-gray-400 italic">L'email ne peut pas être modifié pour le moment.</p>
            </div>
          </div>
        </section>

        {/* Section Sécurité (MFA) */}
        <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b pb-4">
            <ShieldCheck className="text-indigo-600" size={20} />
            <h3 className="font-semibold text-gray-800">Sécurité</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Double authentification (MFA)</p>
              <p className="text-sm text-gray-500">Ajoutez une couche de sécurité supplémentaire à votre compte.</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${user?.mfaEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {user?.mfaEnabled ? "ACTIVÉ" : "DÉSACTIVÉ"}
            </div>
          </div>
        </section>

        {/* Section Infos Compte */}
        <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b pb-4">
            <Calendar className="text-indigo-600" size={20} />
            <h3 className="font-semibold text-gray-800">Informations système</h3>
          </div>
          <div className="text-sm text-gray-600 space-y-2">
            <p>Membre depuis : <span className="font-medium text-gray-800">{memberSince}</span></p>
            <p>Dernière mise à jour : <span className="font-medium text-gray-800">
              {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('fr-FR') : "N/A"}
            </span></p>
          </div>
        </section>
      </div>
    </div>
  );
}