"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, BarChart3, Calendar, Target, User, FileCode } from 'lucide-react';

interface AthleteHeaderProps {
  id: string;
  athlete: { id: string; email: string };
  permissions: { shareActivities: boolean; sharePhysiology: boolean };
  allAthletes: any[];
}

export default function AthleteHeader({ id, athlete, permissions, allAthletes }: AthleteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
  { name: 'Vue Globale', href: `/athletes/${id}`, icon: User, allowed: true },
  { name: 'Données / Data', href: `/athletes/${id}/data`, icon: BarChart3, allowed: permissions.shareActivities },
  { name: 'Activités', href: `/athletes/${id}/activities`, icon: FileCode, allowed: permissions.shareActivities }, // Ajouté ici
  { name: 'Planning', href: `/athletes/${id}/planning`, icon: Calendar, allowed: permissions.shareActivities },
  { name: 'Objectifs', href: `/athletes/${id}/goals`, icon: Target, allowed: true },
];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/athletes')} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
          <ChevronLeft size={16} /> Retour
        </button>

        <select 
          value={id}
          onChange={(e) => router.push(`/athletes/${e.target.value}`)}
          className="bg-white border border-slate-200 text-sm font-bold py-2 px-4 rounded-xl shadow-sm outline-none cursor-pointer"
        >
          {allAthletes.map((link) => (
            <option key={link.athleteId} value={link.athleteId}>{link.athlete.email}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-lg">
          {athlete.email.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-xl font-bold text-slate-900">{athlete.email}</h1>
      </div>

      <div className="border-b border-slate-200 mb-8 overflow-x-auto whitespace-nowrap">
        <nav className="flex gap-6">
          {tabs.filter(t => t.allowed).map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link key={tab.name} href={tab.href} className={`flex items-center gap-2 pb-4 font-bold text-sm border-b-2 -mb-[2px] ${isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>
                <Icon size={16} /> {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}