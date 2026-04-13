"use client";

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  return (
    <header className="h-16 bg-[#1e293b]/50 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-6 z-10">
      <button 
        onClick={toggleSidebar}
        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-white">Coach Max</p>
          <p className="text-xs text-slate-400">Premium Plan</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center border border-slate-600 shadow-lg font-bold text-white">
          MX
        </div>
      </div>
    </header>
  );
}