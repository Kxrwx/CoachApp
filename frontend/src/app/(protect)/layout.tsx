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
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
