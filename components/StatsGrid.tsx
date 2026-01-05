
import React from 'react';

interface StatProps {
  label: string;
  value: string | number;
  unit: string;
  icon: string;
  color: string;
}

const StatBox: React.FC<StatProps> = ({ label, value, unit, icon, color }) => (
  <div className="glass group border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6 transition-all relative overflow-hidden flex flex-col justify-center items-start">
    <div className="flex items-center gap-2 mb-2 md:mb-4">
        <div className="w-6 h-6 md:w-10 md:h-10 rounded-lg flex items-center justify-center border border-white/5" style={{ color }}>
            <i className={`${icon} text-xs md:text-lg`}></i>
        </div>
        <span className="text-[8px] md:text-[11px] text-slate-500 font-black uppercase tracking-widest">{label}</span>
    </div>
    <div className="flex items-baseline gap-1 md:gap-2">
      <span className="text-2xl md:text-4xl font-black mono text-white leading-tight">{value}</span>
      <span className="text-[8px] md:text-[12px] text-slate-500 font-bold uppercase">{unit}</span>
    </div>
  </div>
);

const StatsGrid: React.FC<{ ping: number; jitter: number; download: number; upload: number }> = ({ 
  ping, jitter, download, upload 
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full">
      <StatBox label="Latency" value={ping || '--'} unit="ms" icon="fa-solid fa-gauge" color="#f59e0b" />
      <StatBox label="Jitter" value={jitter || '--'} unit="ms" icon="fa-solid fa-wave-square" color="#8b5cf6" />
      <StatBox label="Down" value={download > 0 ? (download > 100 ? download.toFixed(0) : download.toFixed(1)) : '--'} unit="Mbps" icon="fa-solid fa-circle-arrow-down" color="#06b6d4" />
      <StatBox label="Up" value={upload > 0 ? (upload > 100 ? upload.toFixed(0) : upload.toFixed(1)) : '--'} unit="Mbps" icon="fa-solid fa-circle-arrow-up" color="#d946ef" />
    </div>
  );
};

export default StatsGrid;
