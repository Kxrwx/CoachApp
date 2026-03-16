"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Settings, SquareChartGantt, Calendar, Upload} from "lucide-react";

// Liste d'objets pour tes menus
const MENU_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Objectif", href: "/objectifs", icon: Target },
  { label: "Activités", href: "/activites", icon: SquareChartGantt },
  { label: "Entrainement", href: "/entrainement", icon: Calendar },
  { label: "Upload", href: "/upload", icon: Upload },
  { label: "Réglage", href: "/reglage", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-white h-full flex-shrink-0 flex flex-col">
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-indigo-50 text-indigo-700 font-semibold" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
                  `}
                >
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}