"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, BarChart3, Calendar, Target, User } from 'lucide-react';

interface AthleteHeaderProps {
  id: string;
  athlete: {
    id: string;
    email: string;
  };
  permissions: {
    shareActivities: boolean;
    sharePhysiology: boolean;
  };
}

export default function AthleteHeader({ id, athlete, permissions }: AthleteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Configuration dynamique des onglets selon les autorisations
  const tabs = [
    { name: 'Vue Globale', href: `/athletes/${id}`, icon: User, allowed: true },
    { name: 'Données / Data', href: `/athletes/${id}/data`, icon: BarChart3, allowed: permissions.shareActivities },
    { name: 'Planning', href: `/athletes/${id}/planning`, icon: Calendar, allowed: permissions.shareActivities },
    { name: 'Objectifs', href: `/athletes/${id}/goals`, icon: Target, allowed: true },
  ];

  return (
    <>
      {/* Retour en arrière */}
      <button 
        onClick={() => router.push('/athletes')}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6 group"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> 
        Retour aux athlètes
      </button>

      {/* Profil Mini-Header */}
      <div className="flex items-center gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-lg shadow-inner">
          {athlete.email.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{athlete.email}</h1>
          <p className="text-xs text-slate-400">Suivi actif de l'athlète</p>
        </div>
      </div>

      {/* Header Onglets Navigation */}
      <div className="border-b border-slate-200 mb-8 overflow-x-auto whitespace-nowrap scrollbar-none">
        <nav className="flex gap-6">
          {tabs.filter(tab => tab.allowed).map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center gap-2 pb-4 font-bold text-sm tracking-wide transition-all border-b-2 relative -mb-[2px] ${
                  isActive 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={16} />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}