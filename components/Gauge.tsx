
import React from 'react';

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  secondaryColor?: string;
}

const Gauge: React.FC<GaugeProps> = ({ value, max, label, unit, color, secondaryColor = '#8b5cf6' }) => {
  const radius = 85;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(value, max);
  const progress = (clampedValue / max) * 0.75; 
  const dashOffset = circumference * (1 - progress);
  
  const rotation = (clampedValue / max) * 270 - 135;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg className="w-72 h-72 lg:w-80 lg:h-80 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Subtle background glow */}
        <circle cx="100" cy="100" r="95" fill={`url(#gaugeGradient)`} opacity="0.03" />

        {/* Track */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth="10"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={0}
          className="transform rotate-[135deg]"
          strokeLinecap="round"
        />
        
        {/* Progress */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset + (circumference * 0.25)}
          className="transition-all duration-300 ease-out transform rotate-[135deg]"
          strokeLinecap="round"
          filter="url(#glow)"
        />

        {/* Needle Hub */}
        <circle cx="100" cy="100" r="8" fill="#1e293b" stroke="#334155" strokeWidth="1" />
        <circle cx="100" cy="100" r="4" fill={color} />

        {/* Needle */}
        <g className="transition-transform duration-300 ease-out origin-center" style={{ transform: `rotate(${rotation}deg)` }}>
          <path
            d="M98,100 L100,25 L102,100 Z"
            fill={color}
            filter="url(#glow)"
          />
        </g>
      </svg>
      
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[-15px] text-center w-full">
        <div className="text-5xl font-extrabold mono tracking-tighter glow-text leading-none">
          {value > 100 ? value.toFixed(0) : value.toFixed(1)}
        </div>
        <div className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-2 opacity-80">{unit}</div>
      </div>
      
      <div className="mt-4 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-sm font-bold text-slate-300 heading-font uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
};

export default Gauge;
