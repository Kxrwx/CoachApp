"use client";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function PerformanceMixChart({ data }: { data: any[] }) {
  const chartData = [...data].reverse().slice(-12).map(m => ({
    name: new Date(2000, m.month - 1).toLocaleString("fr-FR", { month: "short" }),
    km: Math.round(m.distance),
    elevation: m.elevation,
  }));

  return (
    <div className="h-[400px] w-full rounded-[2.5rem] border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-zinc-400">Analyse Volume vs Vertical</h3>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="#e4e4e7" opacity={0.3} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f5', opacity: 0.4 }} />
          <Bar dataKey="km" fill="#f4f4f5" radius={[6, 6, 6, 6]} barSize={40}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#ea580c' : '#e4e4e7'} />
            ))}
          </Bar>
          <Line type="monotone" dataKey="elevation" stroke="#ea580c" strokeWidth={3} dot={{ r: 4, fill: '#ea580c', strokeWidth: 0 }} activeDot={{ r: 6 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload?.length) {
    return (
      <div className="rounded-2xl border border-zinc-100 bg-white/90 p-4 shadow-2xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90">
        <p className="text-[10px] font-black uppercase text-zinc-400 mb-2">{label}</p>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold text-zinc-900 dark:text-white">{payload[0].value} km</span>
          <span className="text-sm font-bold text-orange-600">+{payload[1].value} m d+</span>
        </div>
      </div>
    );
  }
  return null;
}