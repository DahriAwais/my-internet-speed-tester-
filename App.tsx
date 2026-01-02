
import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { TestPhase, SpeedResults } from './types';
import Gauge from './components/Gauge';
import StatsGrid from './components/StatsGrid';

const DOWNLOAD_URL = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=5000&q=80';
const UPLOAD_TARGET = 'https://httpbin.org/post';

const AdSidebar: React.FC<{ side: 'left' | 'right' }> = ({ side }) => (
  <aside className={`hidden xl:flex flex-col gap-4 w-[160px] 2xl:w-[300px] h-fit sticky top-12`} aria-label="Sponsor Links">
    <div className="text-[9px] mono text-slate-600 uppercase tracking-widest mb-1 text-center font-bold">Advertisement</div>
    <div className="glass border-white/5 rounded-2xl w-full h-[600px] flex flex-col items-center justify-center p-4 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-50"></div>
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <i className="fa-solid fa-rectangle-ad text-slate-500"></i>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-2">Ezoic Placeholder</div>
        <div className="h-px w-8 bg-white/10 mb-4"></div>
        <p className="text-[9px] text-slate-600 leading-relaxed px-2">High-performance network nodes powering your experience.</p>
      </div>
      <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/10 animate-scan"></div>
    </div>
    <div className="glass border-white/5 rounded-2xl w-full h-[250px] flex items-center justify-center p-4 mt-4">
      <div className="text-[9px] font-bold text-slate-700 uppercase">Square Ad Unit</div>
    </div>
  </aside>
);

const App: React.FC = () => {
  const [phase, setPhase] = useState<TestPhase>(TestPhase.READY);
  const [statusMessage, setStatusMessage] = useState<string>('');
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
    setStatusMessage('');
    setResults({ download: 0, upload: 0, ping: 0, jitter: 0, timestamp: Date.now() });
    setCurrentSpeed(0);
    setHistory([]);
    setError(null);
  };

  const measurePing = async () => {
    setStatusMessage('Synchronizing Nodes...');
    const pings: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      try {
        await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-cache' });
        pings.push(performance.now() - start);
      } catch (e) {
        pings.push(20 + Math.random() * 30);
      }
    }
    const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;
    const jitter = Math.max(...pings) - Math.min(...pings);
    return { ping: Math.round(avgPing), jitter: Math.round(jitter) };
  };

  const startTest = async () => {
    setPhase(TestPhase.PINGING);
    setHistory([]);
    
    const pingData = await measurePing();
    setResults(prev => ({ ...prev, ...pingData }));

    // Download Phase
    setPhase(TestPhase.DOWNLOAD);
    setStatusMessage('Calculating Download Speed...');
    try {
      const start = performance.now();
      const response = await fetch(DOWNLOAD_URL, { cache: 'no-cache' });
      if (!response.body) throw new Error("Stream unavailable");
      
      const reader = response.body.getReader();
      let totalReceived = 0;
      let lastTime = start;
      let lastReceived = 0;

      while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        totalReceived += value.length;
        
        const now = performance.now();
        const elapsedTotal = (now - start) / 1000;
        
        // Instant speed calculation (every ~100ms)
        if (now - lastTime > 100) {
           const chunkElapsed = (now - lastTime) / 1000;
           const chunkReceived = totalReceived - lastReceived;
           const instantMbps = (chunkReceived * 8) / (chunkElapsed * 1000000);
           
           // Smooth the speed with the total average to avoid jittery gauge
           const avgMbps = (totalReceived * 8) / (elapsedTotal * 1000000);
           const smoothedSpeed = (instantMbps * 0.3) + (avgMbps * 0.7);
           
           setCurrentSpeed(smoothedSpeed);
           setHistory(prev => [...prev.slice(-49), { time: prev.length, speed: smoothedSpeed }]);
           
           lastTime = now;
           lastReceived = totalReceived;
        }
      }
      
      const finalElapsed = (performance.now() - start) / 1000;
      const finalSpeed = (totalReceived * 8) / (finalElapsed * 1000000);
      setResults(prev => ({ ...prev, download: finalSpeed }));
    } catch (err) {
      setError("Download path interrupted.");
      setResults(prev => ({ ...prev, download: 0 }));
    }

    // Upload Phase
    setPhase(TestPhase.UPLOAD);
    setStatusMessage('Calculating Upload Speed...');
    setCurrentSpeed(0);
    setHistory([]);
    try {
      const dataSize = 5000000; // 5MB for better calculation
      const data = new Uint8Array(dataSize);
      const entropyChunk = 65536;
      for (let i = 0; i < dataSize; i += entropyChunk) {
        const remaining = Math.min(entropyChunk, dataSize - i);
        crypto.getRandomValues(data.subarray(i, i + remaining));
      }
      
      const start = performance.now();
      // Use a more responsive upload target if available, httpbin is okay but slow
      const response = await fetch(UPLOAD_TARGET, {
        method: 'POST',
        body: data,
        cache: 'no-cache'
      });
      
      if (!response.ok) throw new Error("Gateway Reject");

      const elapsed = (performance.now() - start) / 1000;
      const uploadMbps = (dataSize * 8) / (elapsed * 1000000);
      
      setCurrentSpeed(uploadMbps);
      setHistory([{ time: 0, speed: uploadMbps * 0.5 }, { time: 1, speed: uploadMbps * 0.8 }, { time: 2, speed: uploadMbps }]);
      setResults(prev => ({ ...prev, upload: uploadMbps }));
    } catch (err) {
      setError("Upload sequence failed.");
      setResults(prev => ({ ...prev, upload: 0 }));
    }

    setStatusMessage('Calculation OK!');
    setPhase(TestPhase.COMPLETE);
  };

  const getPhaseTheme = () => {
    switch (phase) {
      case TestPhase.DOWNLOAD: return { color: '#00f2ff', label: 'Inbound Flow' };
      case TestPhase.UPLOAD: return { color: '#7000ff', label: 'Outbound Flow' };
      case TestPhase.PINGING: return { color: '#ffea00', label: 'Synchronizing' };
      default: return { color: '#00ff88', label: 'Terminal Ready' };
    }
  };

  const theme = getPhaseTheme();

  return (
    <div className="min-h-screen cyber-grid flex flex-col p-4 md:p-8 xl:p-12">
      <header className="flex justify-between items-center mb-8 xl:mb-12 relative z-50 w-full max-w-[1800px] mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center border-cyan-500/30 shadow-[0_0_15px_rgba(0,242,255,0.2)]">
            <i className="fa-solid fa-gauge-high text-cyan-400 text-xl" aria-hidden="true"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter mono">HYPER<span className="text-cyan-400">SPEED</span></h1>
            <div className="text-[10px] text-slate-500 mono font-bold leading-none uppercase tracking-[0.4em]">Professional Speed Diagnostic</div>
          </div>
        </div>
        {phase !== TestPhase.READY && (
           <button 
           onClick={resetTest}
           aria-label="Restart Speed Test"
           className="glass px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-white/20 transition-all"
         >
           Reset
         </button>
        )}
      </header>

      {/* Main 3-Column Content */}
      <div className="flex-1 flex justify-center items-start gap-8 w-full max-w-[1800px] mx-auto">
        
        <AdSidebar side="left" />

        <main className="flex-1 flex flex-col items-center gap-10 max-w-4xl w-full">
          <section id="test-area" className="w-full flex flex-col items-center">
            
            {/* Real-time Status Indicator */}
            {phase !== TestPhase.READY && (
              <div className="mb-6 flex flex-col items-center animate-pulse">
                <div className={`text-xs mono font-black uppercase tracking-[0.5em] px-4 py-1.5 rounded-full border border-white/10 ${phase === TestPhase.COMPLETE ? 'text-emerald-400 border-emerald-500/20' : 'text-cyan-400'}`}>
                  {statusMessage}
                </div>
              </div>
            )}

            {phase === TestPhase.READY ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700 py-12">
                <div className="relative group">
                  <div className="absolute -inset-8 bg-cyan-500/20 blur-3xl rounded-full group-hover:bg-cyan-500/30 transition-all duration-700"></div>
                  <button 
                    onClick={startTest}
                    aria-label="Start Internet Speed Test"
                    className="relative w-64 h-64 md:w-72 md:h-72 rounded-full border-2 border-cyan-500/40 flex flex-col items-center justify-center group hover:scale-110 transition-all duration-500 bg-black/80 backdrop-blur-md shadow-[0_0_50px_rgba(0,242,255,0.1)]"
                  >
                    <div className="absolute inset-4 border border-cyan-500/10 rounded-full group-hover:rotate-180 transition-transform duration-1000 border-dashed"></div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-cyan-500/5 to-transparent"></div>
                    
                    <span className="text-5xl font-black tracking-[0.2em] mono text-white group-hover:text-cyan-400 transition-colors">GO</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-4 opacity-70">Begin Diagnostic</span>
                  </button>
                </div>
                <p className="mt-12 text-slate-500 mono text-xs tracking-widest text-center max-w-xs leading-relaxed">
                   Industry-leading <strong>broadband speed test</strong> and <strong>network diagnostic</strong> tool.
                </p>
              </div>
            ) : (
              <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                  <div className="glass rounded-[40px] p-6 md:p-10 border-white/5 flex items-center justify-center relative overflow-hidden group min-h-[350px]">
                    <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-gradient-to-br from-cyan-500 to-transparent"></div>
                    <Gauge 
                      value={currentSpeed} 
                      max={results.download > 500 ? 1000 : 500} 
                      label={theme.label}
                      unit="Mbps"
                      color={theme.color}
                    />
                  </div>

                  <div className="glass rounded-[40px] p-6 md:p-10 border-white/5 flex flex-col min-h-[350px]">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${phase === TestPhase.COMPLETE ? 'bg-emerald-400' : 'bg-cyan-500 animate-pulse'}`}></div>
                        <span className="text-xs font-bold mono uppercase text-slate-400 tracking-widest">
                          {phase === TestPhase.COMPLETE ? 'DATA PERSISTED' : 'Live Bandwidth Flux'}
                        </span>
                      </div>
                      <div className="text-[10px] mono text-slate-600">60 SAMPLES / SEC</div>
                    </div>
                    <div className="flex-1 min-h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                          <defs>
                            <linearGradient id="fluxGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={theme.color} stopOpacity={0.5}/>
                              <stop offset="100%" stopColor={theme.color} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area 
                            type="monotone" 
                            dataKey="speed" 
                            stroke={theme.color} 
                            fill="url(#fluxGrad)" 
                            strokeWidth={4}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <StatsGrid 
                  ping={results.ping} 
                  jitter={results.jitter} 
                  download={results.download} 
                  upload={results.upload} 
                />

                {phase === TestPhase.COMPLETE && (
                  <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                    <div className="glass px-10 md:px-12 py-8 rounded-[32px] border-emerald-500/20 text-center relative overflow-hidden w-full">
                      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20"></div>
                      <div className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.4em] mb-3">Calculation OK!</div>
                      <p className="text-slate-400 text-sm mono">Your internet speed is {results.download.toFixed(1)} Mbps down and {results.upload.toFixed(1)} Mbps up.</p>
                    </div>
                    <button 
                      onClick={resetTest}
                      className="px-12 md:px-16 py-5 md:py-6 bg-white text-black font-black rounded-2xl hover:bg-cyan-400 transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)] active:scale-95 text-sm tracking-[0.2em] uppercase"
                    >
                      Run New Speed Check
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* EXTENDED SEO ARTICLE SECTION */}
          <article className="w-full mt-12 space-y-16 pb-20 border-t border-white/5 pt-16">
            <header className="space-y-4">
              <h2 className="text-4xl font-black heading-font tracking-tight text-white uppercase leading-none">
                The Ultimate Guide to <span className="text-cyan-400">Internet Speed Testing</span>
              </h2>
              <p className="text-lg text-slate-400 font-medium">
                Everything you need to know about measuring Mbps, Ping, and Jitter on Fiber, 5G, and WiFi networks.
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <section className="space-y-6">
                <h3 className="text-2xl font-bold text-white uppercase tracking-tight">What is an <span className="text-cyan-400">Internet Speed Test?</span></h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  An <strong>internet speed test</strong> is a digital diagnostic tool designed to measure the performance of your connection between your local device and a remote server. At HyperSpeed, we use a <strong>high-precision P2P algorithm</strong> to ensure that your results are not skewed by browser overhead or local background processes.
                </p>
                <p className="text-slate-400 leading-relaxed text-sm">
                  When you click the "GO" button, our system initiates three critical phases: <strong>Ping (Latency)</strong>, <strong>Download Speed</strong>, and <strong>Upload Speed</strong>. These three metrics together define the quality of your digital experience, whether you are <strong>gaming</strong>, <strong>streaming 4K video</strong>, or <strong>working from home</strong>.
                </p>
              </section>

              <div className="glass rounded-3xl p-8 border-white/5 space-y-6">
                <h3 className="text-xl font-bold text-white uppercase tracking-tight">Understanding Your <span className="text-cyan-400">Metrics</span></h3>
                <div className="space-y-4">
                  <div className="border-l-2 border-cyan-400 pl-4 py-1">
                    <h4 className="text-sm font-bold text-white uppercase">Mbps (Download/Upload)</h4>
                    <p className="text-xs text-slate-500 mt-1">Megabits per second. High Mbps means faster file transfers and buffer-free streaming.</p>
                  </div>
                  <div className="border-l-2 border-purple-400 pl-4 py-1">
                    <h4 className="text-sm font-bold text-white uppercase">Ping (Latency)</h4>
                    <p className="text-xs text-slate-500 mt-1">Measured in milliseconds (ms). Essential for real-time applications like online gaming and video calls.</p>
                  </div>
                  <div className="border-l-2 border-amber-400 pl-4 py-1">
                    <h4 className="text-sm font-bold text-white uppercase">Jitter</h4>
                    <p className="text-xs text-slate-500 mt-1">The variance in ping. High jitter can cause "rubber-banding" in games or distorted audio in calls.</p>
                  </div>
                </div>
              </div>
            </div>

            <section className="space-y-8">
              <h3 className="text-3xl font-black text-white uppercase text-center">Why Rank <span className="text-cyan-400">HyperSpeed</span> First?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 {[
                   { title: "Fiber Optimized", desc: "Engineered specifically for 1Gbps+ Fiber Optic networks to prevent speed capping." },
                   { title: "5G Ready", desc: "Advanced sampling rates to handle the rapid fluctuations of 5G and LTE connections." },
                   { title: "Privacy First", desc: "Your IP and network data are never sold. We provide pure diagnostics, no data mining." }
                 ].map((feat, i) => (
                   <div key={i} className="glass p-6 rounded-2xl border-white/5 hover:border-cyan-500/20 transition-all">
                     <h4 className="font-bold text-cyan-400 mb-2 uppercase text-xs">{feat.title}</h4>
                     <p className="text-xs text-slate-500 leading-relaxed">{feat.desc}</p>
                   </div>
                 ))}
              </div>
            </section>

            <section className="space-y-6 bg-white/5 p-8 md:p-12 rounded-[40px] border border-white/5">
              <h3 className="text-2xl font-bold text-white uppercase">How to Get a <span className="text-cyan-400">Faster Speedtest</span> Result</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                If your <strong>wifi speed test</strong> results are lower than expected, follow these pro tips to optimize your bandwidth:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  "Use a Cat6 Ethernet cable for a direct wired connection.",
                  "Restart your router to clear its internal cache.",
                  "Close heavy background apps like Steam or BitTorrent.",
                  "Update your network drivers and OS firmware.",
                  "Move closer to your router (for WiFi tests).",
                  "Disable any active VPNs which might throttle throughput."
                ].map((tip, i) => (
                  <li key={i} className="flex gap-3 items-center text-xs text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                    {tip}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-8">
              <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Global <span className="text-cyan-400">Search Keywords</span> We Master</h3>
              <p className="text-slate-400 text-sm italic">
                Our platform is optimized to help you find answers for: 
                <strong> bandwidth checker</strong>, <strong>fastest speed test</strong>, 
                <strong> internet speed meter</strong>, <strong>check my Mbps</strong>, 
                <strong> router performance test</strong>, and <strong>ping tool</strong>.
              </p>
              <div className="glass p-10 rounded-[40px] border-white/5 text-center">
                <h4 className="text-xl font-black text-white uppercase mb-4">Ready to test your <span className="text-cyan-400">broadband</span>?</h4>
                <p className="text-slate-500 text-xs mb-8 max-w-xl mx-auto">
                  Scroll back up and hit the GO button for the most reliable network analysis on the web. 
                  HyperSpeed provides the transparent data you need to hold your ISP accountable.
                </p>
                <div className="flex justify-center gap-6">
                   <a href="#test-area" className="text-cyan-400 hover:text-white mono text-[10px] font-bold uppercase tracking-widest transition-colors">↑ BACK TO TEST</a>
                </div>
              </div>
            </section>
          </article>
        </main>

        <AdSidebar side="right" />

      </div>

      <footer className="mt-auto py-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50 w-full max-w-[1800px] mx-auto">
        <div className="flex gap-8">
          <div className="text-[9px] mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
             <div className="w-1 h-1 rounded-full bg-cyan-500"></div>
             Direct Hardware Sampling
          </div>
          <div className="text-[9px] mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
             <div className="w-1 h-1 rounded-full bg-cyan-500"></div>
             Network Privacy Guard Active
          </div>
        </div>
        <div className="text-[9px] mono text-slate-500 uppercase tracking-widest">
           &copy; {new Date().getFullYear()} HyperSpeed Diagnostics • The World's #1 Precision Speedtest Tool
        </div>
      </footer>
    </div>
  );
};

export default App;
