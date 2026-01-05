
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

  const numericMarkers = max > 1000 
    ? [0, 500, 1000, 1500, 2000]
    : [0, 200, 400, 600, 800, 1000];
    
  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-sm">
      <svg className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 drop-shadow-[0_0_50px_rgba(0,0,0,0.9)]" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#0a0a10"
          strokeWidth="14"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={0}
          className="transform rotate-[135deg]"
          strokeLinecap="round"
        />

        {numericMarkers.map((m) => {
          const angle = (m / max) * 270 - 135;
          const textR = radius - 18;
          const tx = 100 + textR * Math.cos((angle - 90) * (Math.PI / 180));
          const ty = 100 + textR * Math.sin((angle - 90) * (Math.PI / 180));

          return (
            <text 
              key={m}
              x={tx} 
              y={ty} 
              fill="#4b5563" 
              fontSize="6" 
              textAnchor="middle" 
              alignmentBaseline="middle" 
              className="mono font-bold select-none"
            >
              {m}
            </text>
          );
        })}
        
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="14"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset + (circumference * 0.25)}
          className="transition-all duration-300 ease-out transform rotate-[135deg]"
          strokeLinecap="round"
          filter="url(#glow)"
        />

        <circle cx="100" cy="100" r="10" fill="#020617" stroke={color} strokeWidth="3" />

        <g 
          className="transition-transform duration-300 ease-out origin-center" 
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <path
            d="M96,100 L100,18 L104,100 Z"
            fill={color}
            filter="url(#glow)"
          />
          <circle cx="100" cy="100" r="4" fill="white" />
        </g>
      </svg>
      
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[-15px] md:-translate-y-[-25px] text-center w-full pointer-events-none">
        <div className="text-5xl md:text-7xl font-black mono tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
          {value > 99 ? Math.round(value) : value.toFixed(1)}
        </div>
        <div className="text-[10px] md:text-[14px] text-slate-500 font-black uppercase tracking-[0.6em] mt-2 md:mt-3">{unit}</div>
      </div>
      
      <div className={`mt-6 md:mt-8 px-8 md:px-12 py-2 md:py-3 rounded-full bg-black/80 border border-white/10 text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em] shadow-2xl transition-all duration-500`} style={{ borderColor: color, color }}>
        {label}
      </div>
    </div>
  );
};

export default Gauge;
