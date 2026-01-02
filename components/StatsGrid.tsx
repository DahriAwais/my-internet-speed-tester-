
import React from 'react';

interface StatProps {
  label: string;
  value: string | number;
  unit: string;
  icon: string;
  color: string;
}

const StatBox: React.FC<StatProps> = ({ label, value, unit, icon, color }) => (
  <div className="glass group border-white/5 rounded-3xl p-5 transition-all hover:bg-white/10 hover:translate-y-[-2px] relative overflow-hidden">
    <div className={`absolute top-0 right-0 w-16 h-16 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity`}>
        <i className={`${icon} text-6xl`}></i>
    </div>
    <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-white/10`} style={{ color }}>
            <i className={`${icon} text-sm`}></i>
        </div>
        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{label}</span>
    </div>
    <div className="flex items-baseline gap-1.5">
      <span className="text-3xl font-black mono heading-font text-white">{value}</span>
      <span className="text-[10px] text-slate-500 font-bold uppercase">{unit}</span>
    </div>
  </div>
);

const StatsGrid: React.FC<{ ping: number; jitter: number; download: number; upload: number }> = ({ 
  ping, jitter, download, upload 
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      <StatBox 
        label="Latency" 
        value={ping || '--'} 
        unit="ms" 
        icon="fa-solid fa-gauge" 
        color="#f59e0b"
      />
      <StatBox 
        label="Jitter" 
        value={jitter || '--'} 
        unit="ms" 
        icon="fa-solid fa-wave-square" 
        color="#8b5cf6"
      />
      <StatBox 
        label="Download" 
        value={download > 0 ? (download > 100 ? download.toFixed(0) : download.toFixed(1)) : '--'} 
        unit="Mbps" 
        icon="fa-solid fa-circle-arrow-down" 
        color="#06b6d4"
      />
      <StatBox 
        label="Upload" 
        value={upload > 0 ? (upload > 100 ? upload.toFixed(0) : upload.toFixed(1)) : '--'} 
        unit="Mbps" 
        icon="fa-solid fa-circle-arrow-up" 
        color="#d946ef"
      />
    </div>
  );
};

export default StatsGrid;
