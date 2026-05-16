
import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function StatCard({ icon, label, value, unit, color = "text-slate-900" }: any) {
  return (
    <div className="bg-white border border-slate-200/60 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
      <div className="text-slate-400 mb-4">{icon}</div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-black italic tracking-tighter uppercase ${color}`}>{value}</span>
          {unit && <span className="text-[10px] font-black text-slate-400 uppercase">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

export function DataRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-xs">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}

export function MetaRow({ label, value, color = "text-slate-800" }: any) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <span className={`text-[10px] font-mono ${color}`}>{value}</span>
    </div>
  );
}

export function MiniStat({ label, value, unit }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
      <p className="text-lg font-black text-slate-900">
        {value} <span className="text-[10px] text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

export function MetricChart({ title, data, color = "#6366f1" }: any) {
  if (!data?.length) return null;
  return (
    <div className="bg-white border border-slate-200/60 rounded-[2.2rem] p-6 shadow-sm h-[300px] w-full flex flex-col">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{title}</h3>
      <div className="flex-1 w-full -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="timestamp" hide />
            <YAxis 
              domain={['dataMin - 1', 'dataMax + 1']} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }}
              axisLine={false}
              tickLine={false}
              width={40}
            /> 
            <Tooltip 
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ display: 'none' }}
              itemStyle={{ color: color, fontWeight: '900', fontSize: '14px' }}
              formatter={(value: any) => [Number(value).toFixed(1), ""]}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}