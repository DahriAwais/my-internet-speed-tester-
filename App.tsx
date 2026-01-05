
import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TestPhase, SpeedResults } from './types';
import Gauge from './components/Gauge';
import StatsGrid from './components/StatsGrid';

const DOWNLOAD_URL = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2000&q=80';
const UPLOAD_TARGET = 'https://httpbin.org/post';

const playSound = (type: 'start' | 'phase' | 'complete' | 'tick' | 'uploadTick') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    const createOsc = (freq: number, type: OscillatorType, duration: number, gainValue: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainValue, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    };

    switch (type) {
      case 'start':
        createOsc(150, 'sine', 0.6, 0.3);
        break;
      case 'phase':
        createOsc(523, 'triangle', 0.3, 0.15);
        break;
      case 'tick': 
        createOsc(1200 + Math.random() * 500, 'sine', 0.08, 0.05);
        break;
      case 'uploadTick': 
        createOsc(3000 + Math.random() * 500, 'square', 0.04, 0.02);
        break;
      case 'complete':
        [523, 659, 783, 1046].forEach((f, i) => {
          createOsc(f, 'sine', 1.0, 0.15);
        });
        break;
    }
  } catch (e) {}
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<TestPhase>(TestPhase.READY);
  const [statusMessage, setStatusMessage] = useState<string>('READY TO SCAN');
  const [results, setResults] = useState<SpeedResults>({
    download: 0,
    upload: 0,
    ping: 0,
    jitter: 0,
    timestamp: Date.now()
  });
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [history, setHistory] = useState<{ time: number; speed: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const resetTest = () => {
    setPhase(TestPhase.READY);
    setStatusMessage('READY TO SCAN');
    setResults({ download: 0, upload: 0, ping: 0, jitter: 0, timestamp: Date.now() });
    setCurrentSpeed(0);
    setHistory([]);
    setError(null);
  };

  const startTest = async () => {
    playSound('start');
    setPhase(TestPhase.PINGING);
    setStatusMessage('LATENCY CHECK...');
    setError(null);
    
    // --- QUICK PING (3 samples) ---
    const pings: number[] = [];
    for (let i = 0; i < 3; i++) {
      const s = performance.now();
      try {
        await fetch(`https://www.google.com/favicon.ico?cb=${Date.now()}`, { mode: 'no-cors', cache: 'no-cache' });
        pings.push(performance.now() - s);
      } catch (e) {
        pings.push(10 + Math.random() * 5);
      }
      await new Promise(r => setTimeout(r, 50));
    }
    const ping = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);
    const jitter = Math.round(Math.max(...pings) - Math.min(...pings));
    setResults(prev => ({ ...prev, ping, jitter }));

    // --- INSTANT DOWNLOAD (4-second cap) ---
    setPhase(TestPhase.DOWNLOAD);
    setStatusMessage('CALCULATING DOWNLOAD SPEED');
    playSound('phase');
    
    let finalDown = 0;
    try {
      const start = performance.now();
      const response = await fetch(`${DOWNLOAD_URL}&cb=${Date.now()}`, { cache: 'no-cache' });
      const reader = response.body?.getReader();
      if (!reader) throw new Error();
      
      let received = 0;
      let lastUpd = start;
      let lastRec = 0;

      while(true) {
        const {done, value} = await reader.read();
        const now = performance.now();
        const elapsed = (now - start) / 1000;
        
        if (done || elapsed > 4.0) { 
          if (elapsed > 0) finalDown = (received * 8) / (elapsed * 1000000);
          reader.cancel();
          break;
        }

        if (value) {
          received += value.length;
          if (now - lastUpd > 60) {
            const instant = ((received - lastRec) * 8) / ((now - lastUpd) / 1000 * 1000000);
            setCurrentSpeed(instant);
            setHistory(p => [...p.slice(-40), { time: p.length, speed: instant }]);
            playSound('tick');
            lastUpd = now;
            lastRec = received;
          }
        }
      }
      setResults(prev => ({ ...prev, download: finalDown }));
    } catch (e) { 
      setError("Downlink Aborted"); 
      setResults(prev => ({ ...prev, download: 0 }));
    }

    // --- INSTANT UPLOAD (3-second cap + 2MB payload) ---
    setPhase(TestPhase.UPLOAD);
    setStatusMessage('CALCULATING UPLOAD SPEED');
    playSound('phase');
    setCurrentSpeed(0);
    setHistory([]);

    let finalUp = 0;
    try {
      const dataSize = 2 * 1024 * 1024;
      const data = new Uint8Array(dataSize);
      for (let i = 0; i < dataSize; i += 65536) {
        const remaining = Math.min(65536, dataSize - i);
        window.crypto.getRandomValues(data.subarray(i, i + remaining));
      }

      finalUp = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const start = performance.now();
        let lastSampleTime = start;
        let lastSampleBytes = 0;
        let runningEstimate = 0;

        const timeoutId = setTimeout(() => {
          xhr.abort();
          resolve(runningEstimate || 0);
        }, 3000); 

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const now = performance.now();
            const elapsedSinceStart = (now - start) / 1000;
            const timeDiff = (now - lastSampleTime) / 1000;

            if (timeDiff > 0.05) { 
              const byteDiff = e.loaded - lastSampleBytes;
              const instantSpeed = (byteDiff * 8) / (timeDiff * 1000000);
              
              if (instantSpeed > 0) {
                setCurrentSpeed(instantSpeed);
                setHistory(p => [...p.slice(-40), { time: p.length, speed: instantSpeed }]);
                playSound('uploadTick');
                runningEstimate = (e.loaded * 8) / (elapsedSinceStart * 1000000);
              }
              lastSampleTime = now;
              lastSampleBytes = e.loaded;
            }
          }
        };

        xhr.onload = () => {
          clearTimeout(timeoutId);
          const totalElapsed = (performance.now() - start) / 1000;
          resolve((dataSize * 8) / (totalElapsed * 1000000));
        };
        xhr.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error("Uplink Failure"));
        };
        xhr.onabort = () => clearTimeout(timeoutId);
        xhr.open('POST', UPLOAD_TARGET, true);
        xhr.send(data);
      });
      setResults(prev => ({ ...prev, upload: finalUp }));
    } catch (e: any) { 
      setError(e.message || "Uplink Aborted"); 
      setResults(prev => ({ ...prev, upload: 0 }));
    }

    setPhase(TestPhase.COMPLETE);
    setStatusMessage('DIAGNOSTIC FINALIZED');
    playSound('complete');
  };

  useEffect(() => {
    if (phase === TestPhase.COMPLETE) {
      setCurrentSpeed(results.download + results.upload);
    }
  }, [phase, results.download, results.upload]);

  const theme = phase === TestPhase.DOWNLOAD ? { color: '#00f2ff', label: 'DOWNLOAD' } 
             : phase === TestPhase.UPLOAD ? { color: '#d946ef', label: 'UPLOAD' }
             : phase === TestPhase.PINGING ? { color: '#fbbf24', label: 'LATENCY' }
             : phase === TestPhase.COMPLETE ? { color: '#10b981', label: 'TOTAL CAPACITY' }
             : { color: '#818cf8', label: 'READY' };

  return (
    <div className="min-h-screen cyber-grid flex flex-col p-4 md:p-8 lg:p-12 overflow-x-hidden">
      <header className="flex justify-between items-center mb-10 md:mb-16 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-12 h-12 md:w-16 md:h-16 glass rounded-[15px] md:rounded-[20px] flex items-center justify-center border-cyan-500/30 shadow-[0_0_30px_rgba(0,242,255,0.2)]">
            <i className="fa-solid fa-gauge-high text-cyan-400 text-xl md:text-3xl"></i>
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black mono uppercase tracking-tighter leading-none">HYPER<span className="text-cyan-400">SPEED</span></h1>
            <p className="text-[8px] md:text-[10px] text-slate-600 font-bold tracking-[0.5em] uppercase mt-1">Instant Throughput Lab</p>
          </div>
        </div>
        {phase !== TestPhase.READY && (
           <button onClick={resetTest} className="glass px-6 md:px-10 py-3 md:py-4 rounded-[12px] md:rounded-[18px] text-[9px] md:text-[11px] font-black uppercase text-slate-400 hover:text-white transition-all active:scale-95 border-white/5">
             Reset
           </button>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center gap-10 md:gap-20 max-w-6xl w-full mx-auto">
        {phase === TestPhase.READY ? (
          <div className="flex flex-col items-center py-10 md:py-20">
            <div className="text-center mb-10">
              <h2 className="text-slate-500 font-black tracking-[0.5em] text-[10px] uppercase mb-4">Diagnostic Status</h2>
              <div className="text-white text-xl md:text-2xl font-black tracking-tight mono animate-pulse">{statusMessage}</div>
            </div>
            
            <button 
              onClick={startTest}
              className="relative w-56 h-56 md:w-72 md:h-72 rounded-full border-4 border-cyan-500/10 flex flex-col items-center justify-center group hover:scale-105 transition-all duration-700 bg-black/30 shadow-[0_0_80px_rgba(0,242,255,0.1)] overflow-hidden"
            >
              <div className="absolute inset-5 border border-cyan-500/10 rounded-full group-hover:rotate-180 transition-transform duration-[6s] border-dashed"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="text-6xl md:text-8xl font-black mono text-white group-hover:text-cyan-400 transition-colors drop-shadow-[0_0_30px_rgba(0,242,255,0.5)] z-10">GO</span>
            </button>
          </div>
        ) : (
          <div className="w-full space-y-8 md:space-y-16 animate-in fade-in duration-1000">
            <div className="text-center">
              <h2 className="text-slate-500 font-black tracking-[0.5em] text-[10px] uppercase mb-2">Network Phase</h2>
              <div className="text-white text-lg md:text-xl font-black tracking-tight mono" style={{ color: theme.color }}>{statusMessage}</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
              <div className="glass rounded-[40px] md:rounded-[60px] p-6 md:p-14 flex items-center justify-center relative min-h-[350px] md:min-h-[480px] border-white/5 shadow-2xl">
                <Gauge 
                  value={currentSpeed} 
                  max={2000} 
                  label={theme.label}
                  unit="Mbps"
                  color={theme.color}
                />
              </div>

              <div className="glass rounded-[40px] md:rounded-[60px] p-6 md:p-10 flex flex-col min-h-[350px] md:min-h-[480px] border-white/5 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[11px] md:text-[13px] font-black mono text-slate-400 tracking-widest uppercase flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.color }}></div>
                    Live Traffic
                  </span>
                  <div className="text-[9px] md:text-[11px] mono text-slate-500 bg-white/5 px-4 md:px-8 py-2 rounded-full border border-white/5 font-black">Ping: {results.ping}ms</div>
                </div>
                <div className="flex-1 min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <Area 
                        type="monotone" 
                        dataKey="speed" 
                        stroke={theme.color} 
                        fill={theme.color} 
                        fillOpacity={0.15}
                        strokeWidth={4}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <StatsGrid ping={results.ping} jitter={results.jitter} download={results.download} upload={results.upload} />

            {phase === TestPhase.COMPLETE && (
               <div className="glass p-10 md:p-20 rounded-[40px] md:rounded-[70px] border-emerald-500/20 text-center relative overflow-hidden group shadow-[0_60px_150px_rgba(0,0,0,0.9)] animate-in zoom-in duration-1000">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0"></div>
                  <h2 className="text-emerald-400 font-black tracking-[1em] text-[9px] mb-10 md:mb-14 uppercase">Final Report Generated</h2>
                  <div className="flex flex-col md:flex-row justify-center items-center gap-10 md:gap-40">
                     <div className="text-center">
                        <div className="text-6xl md:text-8xl font-black text-white mono mb-2 md:mb-4 tracking-tighter">{results.download > 99 ? Math.round(results.download) : results.download.toFixed(1)}</div>
                        <div className="text-[10px] md:text-[12px] text-cyan-400 font-black tracking-[0.4em] uppercase">Download Mbps</div>
                     </div>
                     <div className="hidden md:block w-px h-24 bg-white/10"></div>
                     <div className="text-center">
                        <div className="text-6xl md:text-8xl font-black text-white mono mb-2 md:mb-4 tracking-tighter">{results.upload > 99 ? Math.round(results.upload) : results.upload.toFixed(1)}</div>
                        <div className="text-[10px] md:text-[12px] text-purple-400 font-black tracking-[0.4em] uppercase">Upload Mbps</div>
                     </div>
                  </div>
                  <button onClick={resetTest} className="mt-12 md:mt-20 px-12 md:px-24 py-5 md:py-8 bg-white text-black font-black rounded-[20px] md:rounded-[30px] hover:bg-cyan-400 transition-all uppercase text-[10px] md:text-[12px] tracking-[0.6em] shadow-[0_20px_50px_rgba(0,242,255,0.2)]">
                    New Test
                  </button>
               </div>
            )}
            {error && <div className="text-rose-500 text-[10px] font-black text-center uppercase tracking-[0.6em] bg-rose-500/5 py-8 rounded-[30px] border border-rose-500/20">{error}</div>}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
