"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, BarChart3, Settings, GraduationCap } from 'lucide-react';
import Link from 'next/link';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { name: 'Mes Athlètes', icon: Users, href: '/athletes' },
  { name: 'Analyses Data', icon: BarChart3, href: '/analyses' },
  { name: 'Programmes', icon: GraduationCap, href: '/programmes' },
  { name: 'Paramètres', icon: Settings, href: '/setting' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 border-r border-slate-100 bg-white z-20">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black transition-all duration-200 uppercase tracking-tight italic ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 -rotate-1 scale-[1.02]' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon 
                size={20} 
                strokeWidth={isActive ? 3 : 2}
                className={isActive ? 'text-indigo-100' : 'group-hover:text-indigo-600'} 
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}