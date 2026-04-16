import ButtonLogout from "../button/buttonLogout";
import { Activity } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b bg-white flex items-center justify-between px-8 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Logo Icon */}
        <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 rotate-3">
          <Activity size={20} strokeWidth={3} />
        </div>
        {/* App Name */}
        <h1 className="font-black text-xl tracking-tighter text-slate-900 uppercase italic">
          COACH<span className="text-indigo-600">DATA</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <ButtonLogout />
      </div>
    </header>
  );
}