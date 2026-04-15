"use client";
import React, { useEffect, useState } from 'react';
import Sidebar from '@/app/components/layout/Sidebar';
import Header from '@/app/components/layout/Header';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { user, loading } = useAuth();
const router = useRouter();

useEffect(() => {
  if (!loading && !user) {
    router.replace('/auth');
  }
}, [loading, user]);

if (loading) {
  return null; 
}

if (!user) {
  return null;
}

  return (
    <div className="flex h-screen bg-[#0f172a] overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />

        <main className="flex-1 overflow-y-auto p-6 bg-[#0f172a] custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}