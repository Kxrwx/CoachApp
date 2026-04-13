"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { icon: "🏠", label: "Dashboard", href: "/" },
    { icon: "🏋️", label: "Séances", href: "/workouts" },
    { icon: "📈", label: "Statistiques", href: "/stats" },
    { icon: "👤", label: "Profil", href: "/profile" },
  ];

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-20'} bg-[#1e293b] border-r border-slate-700/50 transition-all duration-300 flex flex-col`}>
      <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
        <div className="bg-blue-600 p-1.5 rounded-lg mr-3">⚡</div>
        {isOpen && <span className="text-xl font-black text-white tracking-tighter">COACH<span className="text-blue-500">APP</span></span>}
      </div>
      
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex items-center p-3 rounded-xl transition-all group ${
                isActive ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-xl min-w-[30px]">{item.icon}</span>
              {isOpen && <span className="ml-3 font-semibold">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700/50">
        <button className="flex items-center w-full p-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all font-semibold">
          <span className="text-xl min-w-[30px]">🚪</span>
          {isOpen && <span className="ml-3">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}