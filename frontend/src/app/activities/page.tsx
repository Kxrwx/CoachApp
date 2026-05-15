"use client";

import { useState, useEffect } from "react";
import { Activity as ActivityIcon, ArrowUpRight, FileCode, Calendar, Clock, Loader2, Plus } from "lucide-react";
import { faStrava } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await api("/activities");
        if (res.ok) setActivities(await res.json());
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchActivities();
  }, []);

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Activités</h2>
          <p className="text-slate-500 text-sm mt-1">Historique de vos performances multi-sources.</p>
        </div>
        <Link href="/activities/upload" className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
          <Plus size={16} /> Importer
        </Link>
      </div>

      <div className="grid gap-4">
        {activities.map((activity) => (
          <Link 
            key={activity.id} 
            href={`/activities/${activity.id}`}
            className="group relative bg-white border border-slate-100 p-6 rounded-[2rem] hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex items-center gap-5">
              <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <ActivityIcon size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                    {format(new Date(activity.startDate), "HH:mm")}
                  </span>
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    {format(new Date(activity.startDate), "EEEE dd MMMM yyyy", { locale: fr })}
                  </p>
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                  {activity.stravaDetail?.name || "Activité manuelle"}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="hidden sm:flex gap-6">
                {activity.idStrava && (
                   <div className="text-right">
                     <p className="text-[10px] font-black text-slate-300 uppercase">Distance</p>
                     <p className="text-sm font-bold text-slate-700">12.5 km</p>
                   </div>
                )}
                <div className="flex items-center gap-3 border-l border-slate-100 pl-6">
                   {activity.idStrava && <FontAwesomeIcon icon={faStrava} className="text-orange-500" />}
                   {activity.idUpload && <FileCode className="text-indigo-500" size={18} />}
                </div>
              </div>
              <div className="p-2 bg-slate-50 rounded-full text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
                <ArrowUpRight size={20} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}