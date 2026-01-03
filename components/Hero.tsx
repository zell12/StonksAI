
import React, { useState, useRef, useEffect } from 'react';
import { Activity, ArrowRight, ShieldCheck, Zap, Globe, Cpu, Terminal, Filter, Crosshair, BarChart2, Lock, Hexagon, Power, ChevronLeft, ChevronRight, Radar, Brain, Layers, Hash, Coffee, Youtube, MessageCircle, Linkedin, ExternalLink, PlayCircle, Wifi } from 'lucide-react';
import BrandLogo from './BrandLogo';
import CompanyLogo from './CompanyLogo';

interface HeroProps {
  onLoginClick: () => void;
  onOpenCoffee: () => void;
}

// --- UTILS: TEXT SCRAMBLER ---
const TextScramble = ({ phrases }: { phrases: string[] }) => {
  const [index, setIndex] = useState(0);
  const [output, setOutput] = useState(phrases[0]);
  const frameRequest = useRef<number>(0);
  const chars = '!<>-_\\/[]{}—=+*^?#________';
  
  useEffect(() => {
    let counter = 0;
    const nextPhrase = phrases[index % phrases.length];
    const oldPhrase = output;
    
    const update = () => {
      setOutput((prev) => {
        let result = '';
        const length = Math.max(oldPhrase.length, nextPhrase.length);
        
        for (let i = 0; i < length; i++) {
          if (i < Math.floor(counter)) {
            result += nextPhrase[i] || '';
          } else {
            result += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        return result;
      });

      counter += 0.4; // Speed of scramble

      if (counter < nextPhrase.length) {
        frameRequest.current = requestAnimationFrame(update);
      } else {
        setOutput(nextPhrase);
        // Wait before next word
        setTimeout(() => {
            setIndex(prev => prev + 1);
        }, 3000);
      }
    };

    update();

    return () => cancelAnimationFrame(frameRequest.current);
  }, [index]);

  return <span className="font-mono text-emerald-400">{output}</span>;
};

// --- PULSING STATUS COMPONENT ---
const PulsingStatus = () => {
  const texts = ["MARKET :: LIVE", "AGENT :: READY"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, 2000); // 2 seconds per text for readability
    return () => clearInterval(interval);
  }, []);

  return (
    <span key={index} className="font-mono tracking-widest text-emerald-400 animate-[fadeInOut_2s_infinite]">
      {texts[index]}
    </span>
  );
};

// --- SUBCOMPONENTS (Ticker, Logs, Chart) ---

const Ticker = () => {
  const tickers = [
    "NVDA", "AAPL", "SPY", "QQQ", "TSLA", "AMD", "MSFT", "BRK.B", "ASTS", "MSTR", "PLTR", "SOFI", "HOOD", "GME", "GOOGL", "META", "AMZN"
  ];

  return (
    <div className="w-full bg-[#020202] border-b border-emerald-900/30 overflow-hidden h-14 flex items-center relative z-20">
      {/* Vignette */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#020202] via-[#020202]/80 to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#020202] via-[#020202]/80 to-transparent z-10"></div>
      
      {/* Scrolling Train */}
      <div className="flex animate-ticker w-max hover:[animation-play-state:paused]">
        {/* Repeating the list 3 times to ensure smooth loop (33.33% shift) */}
        {[...tickers, ...tickers, ...tickers].map((t, i) => (
          <div key={i} className="flex items-center gap-3 px-6 py-2 border-r border-emerald-900/10">
            <div className="relative group cursor-pointer">
                 <div className="absolute inset-0 bg-emerald-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <CompanyLogo symbol={t} size="sm" className="relative z-10 grayscale group-hover:grayscale-0 transition-all duration-300" />
            </div>
            
            <div className="flex flex-col">
                <span className="text-sm font-bold font-mono tracking-widest text-emerald-600/80 group-hover:text-emerald-400 transition-colors">
                  {t}
                </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SystemLogs = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const messages = [
    "Scanning dark pools...",
    "Correlating bond yields...",
    "Detecting gamma squeeze...",
    "Analyst sentiment: BULLISH",
    "Volatility index normalizing...",
    "Options flow arbitrage found...",
    "Executing alpha protocol...",
    "Encryption handshake...",
    "Syncing global nodes...",
    "Cache hit: IMMEDIATE_TIER...",
    "LEAPS strategy verification...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + "." + Math.floor(Math.random() * 999);
      setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 8));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full bg-black/40 border-r border-gray-800 p-4 font-mono text-[10px] overflow-hidden flex flex-col">
       <div className="flex items-center gap-2 mb-3 text-gray-500 border-b border-gray-800 pb-2">
         <Terminal size={12} />
         <span className="uppercase tracking-widest">System Output</span>
       </div>
       <div className="flex-1 space-y-2 relative">
         {logs.map((log, i) => (
           <div key={i} className={`truncate transition-all duration-300 ${i === 0 ? 'text-emerald-400' : 'text-gray-600 opacity-60'}`}>
             {i === 0 && <span className="inline-block w-1.5 h-1.5 bg-emerald-500 mr-2 animate-pulse"></span>}
             {log}
           </div>
         ))}
         <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
       </div>
    </div>
  );
};

const LiveChart = () => {
  const [data, setData] = useState<number[]>([]);
  const [cursor, setCursor] = useState({ x: 0, y: 0, active: false });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generateInitialData = () => {
      const points = [];
      let value = 150;
      for (let i = 0; i < 60; i++) {
        value += (Math.random() - 0.48) * 3; 
        points.push(value);
      }
      return points;
    };
    setData(generateInitialData());

    const interval = setInterval(() => {
      setData(prev => {
        const last = prev[prev.length - 1];
        const start = prev[0];
        let trendBias = 0.02; 
        if (last < start) trendBias = 0.20; 
        else if (last > start * 1.10) trendBias = -0.15; 
        const change = (Math.random() - 0.5 + trendBias) * 4; 
        const next = last + change;
        return [...prev.slice(1), next];
      });
    }, 100); 

    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCursor({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true
      });
    }
  };

  const width = 100;
  const height = 50;
  const min = Math.min(...data) - 5;
  const max = Math.max(...data) + 5;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPath = `${points} ${width},${height} 0,${height}`;
  const cursorIndex = containerRef.current 
    ? Math.min(data.length - 1, Math.max(0, Math.floor((cursor.x / containerRef.current.clientWidth) * data.length)))
    : 0;
  const cursorValue = data[cursorIndex];

  const startPrice = data[0];
  const currentPrice = data[data.length - 1];
  const isPositive = currentPrice >= startPrice;
  const priceChange = currentPrice - startPrice;
  const percentChange = (priceChange / startPrice) * 100;
  
  const themeColor = isPositive ? '#10b981' : '#ef4444'; 
  const themeTailwindText = isPositive ? 'text-emerald-400' : 'text-red-400';
  const themeTailwindBg = isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20';
  const themeTailwindBorder = isPositive ? 'border-emerald-500/30' : 'border-red-500/30';

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full overflow-hidden cursor-crosshair group select-none transition-colors duration-500"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setCursor(prev => ({ ...prev, active: false }))}
    >
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="h-full w-full" style={{ 
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}></div>
      </div>

      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        preserveAspectRatio="none" 
        className="absolute inset-0 h-full w-full z-10 transition-transform duration-300 ease-out"
        style={{ transform: cursor.active ? 'scale(1.02)' : 'scale(1)' }}
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={themeColor} stopOpacity="0.3" className="transition-all duration-500" />
            <stop offset="100%" stopColor={themeColor} stopOpacity="0" className="transition-all duration-500" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <path d={`M${areaPath} Z`} fill="url(#chartFill)" className="transition-all duration-500 ease-linear" />
        <path d={`M${points}`} fill="none" stroke={themeColor} strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" className="transition-all duration-500 ease-linear" />
        <circle cx="100" cy={height - ((data[data.length-1] - min) / (max - min)) * height} r="1" fill="#fff" className="animate-pulse shadow-[0_0_10px_#fff]" />
      </svg>

      {cursor.active && (
        <div className="absolute top-0 bottom-0 w-px bg-white/30 z-20 pointer-events-none border-r border-dashed border-white/20 backdrop-blur-sm" style={{ left: cursor.x }}>
            <div className="absolute text-black text-[10px] font-bold px-2 py-1 rounded shadow-[0_0_15px_rgba(255,255,255,0.3)] -translate-x-1/2 -translate-y-full mb-3 whitespace-nowrap z-30 transition-colors duration-300" style={{ top: cursor.y, backgroundColor: themeColor }}>
                {cursorValue?.toFixed(2)}
            </div>
            <div className="absolute w-2 h-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_#fff]" style={{ top: cursor.y }}></div>
        </div>
      )}

      <div className={`absolute top-4 left-4 z-20 transition-opacity duration-300 ${cursor.active ? 'opacity-20' : 'opacity-100'}`}>
         <div className="text-xs text-gray-500 font-mono mb-1">ASSET: STONKS</div>
         <div className="text-3xl font-bold text-white flex items-center gap-3">
            {data[data.length - 1]?.toFixed(2)}
            <span className={`text-sm px-2 py-0.5 rounded border font-mono transition-colors duration-500 ${themeTailwindBg} ${themeTailwindText} ${themeTailwindBorder}`}>
               {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({percentChange.toFixed(2)}%)
            </span>
         </div>
      </div>
    </div>
  );
};

// --- CAROUSEL MODULE COMPONENT ---
interface TacticalModuleProps {
    id: string;
    title: string;
    icon: React.ReactNode;
    color: 'blue' | 'emerald' | 'violet' | 'orange' | 'cyan' | 'rose';
    desc: string;
    gauges: { label: string; percent: number }[];
    isActive: boolean;
    offset: number; // -2, -1, 0, 1, 2
    onClick: () => void;
}

const TacticalModule: React.FC<TacticalModuleProps> = ({ id, title, icon, color, desc, gauges, isActive, offset, onClick }) => {
  const colorStyles = {
    blue: { text: "text-blue-400", bg: "bg-blue-500", border: "border-blue-500", glow: "shadow-blue-500/50" },
    emerald: { text: "text-emerald-400", bg: "bg-emerald-500", border: "border-emerald-500", glow: "shadow-emerald-500/50" },
    violet: { text: "text-violet-400", bg: "bg-violet-500", border: "border-violet-500", glow: "shadow-violet-500/50" },
    orange: { text: "text-orange-400", bg: "bg-orange-500", border: "border-orange-500", glow: "shadow-orange-500/50" },
    cyan: { text: "text-cyan-400", bg: "bg-cyan-500", border: "border-cyan-500", glow: "shadow-cyan-500/50" },
    rose: { text: "text-rose-400", bg: "bg-rose-500", border: "border-rose-500", glow: "shadow-rose-500/50" },
  };

  const theme = colorStyles[color];
  const absOffset = Math.abs(offset);

  return (
    <div 
      onClick={onClick}
      className={`absolute top-0 left-1/2 -translate-x-1/2 w-[340px] h-[480px] bg-gray-900/90 backdrop-blur-xl border rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ease-out select-none flex flex-col
        ${isActive ? `z-30 border-gray-600 shadow-2xl ${theme.glow} scale-100 opacity-100` : ''}
        ${absOffset === 1 ? 'z-20 border-gray-800 scale-90 opacity-60 blur-[1px]' : ''}
        ${absOffset >= 2 ? 'z-10 border-gray-900 scale-75 opacity-20 blur-[3px]' : ''}
      `}
      style={{
        transform: `translateX(calc(-50% + ${offset * 65}%)) scale(${isActive ? 1 : absOffset === 1 ? 0.9 : 0.8}) rotateY(${offset * 15}deg)`,
      }}
    >
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-800 flex items-center justify-between ${isActive ? 'bg-white/5' : 'bg-black/40'}`}>
            <div className="flex items-center gap-2">
                <Hexagon size={16} className={theme.text} />
                <span className="text-sm font-mono text-gray-500 uppercase tracking-widest">MOD_{id}</span>
            </div>
            {isActive && <div className={`w-2.5 h-2.5 rounded-full ${theme.bg} animate-pulse shadow-[0_0_8px_currentColor]`} />}
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col">
            <div className={`flex-1 flex flex-col items-center justify-center text-center transition-all duration-500 ${isActive ? 'translate-y-0' : 'translate-y-4'}`}>
                {/* BIG ICON: w-24 h-24 */}
                <div className={`w-24 h-24 rounded-3xl bg-gray-950 border border-gray-800 flex items-center justify-center mb-6 ${theme.text} ${isActive ? 'scale-110 shadow-lg' : ''}`}>
                    {icon}
                </div>
                {/* BIG TITLE: text-3xl */}
                <h3 className={`text-3xl font-black text-white mb-3 ${isActive ? 'opacity-100' : 'opacity-80'}`}>{title}</h3>
                {/* BIG DESCRIPTION: text-base */}
                <p className={`text-base text-gray-400 leading-relaxed max-w-[280px] ${isActive ? 'opacity-100' : 'opacity-60'}`}>{desc}</p>
            </div>

            {/* FILL GAUGES (Only visibly active on center card) */}
            <div className={`space-y-5 mt-8 transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4'}`}>
                {gauges.map((g, i) => (
                    <div key={i}>
                        <div className="flex justify-between items-end mb-2">
                            {/* Larger Labels: text-xs */}
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{g.label}</span>
                            <span className={`text-xs font-mono font-bold ${theme.text}`}>{g.percent}%</span>
                        </div>
                        {/* Thicker Bar: h-2.5 */}
                        <div className="h-2.5 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-800/50">
                            <div 
                                className={`h-full ${theme.bg} rounded-full transition-all duration-1000 ease-out relative`}
                                style={{ width: isActive ? `${g.percent}%` : '0%' }}
                            >
                                {isActive && <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Footer */}
        <div className="h-2 w-full bg-gray-800">
             <div className={`h-full ${theme.bg} transition-all duration-500`} style={{ width: isActive ? '100%' : '0%' }}></div>
        </div>
    </div>
  );
};

// --- INTEGRATION GRID COMPONENT (COMPACT TICKER) ---
const IntegrationGrid = () => {
  const partners = [
    { 
      name: "Google Gemini", 
      role: "Reasoning Engine", 
      icon: <Brain size={16} />, 
      color: "text-blue-400", 
      bg: "bg-blue-500",
      glow: "to-blue-500/5",
      logo: (
        <div className="flex items-center gap-2">
           <img src="https://brandlogo.org/wp-content/uploads/2024/06/Gemini-Icon.png" className="w-5 h-5 object-contain" alt="Gemini" />
           <span className="text-sm font-bold text-white tracking-tight">Gemini<span className="text-blue-400">Pro</span></span>
        </div>
      )
    },
    { 
      name: "FinancialDatasets.ai", 
      role: "Fundamentals Core", 
      icon: <Activity size={16} />, 
      color: "text-emerald-400",
      bg: "bg-emerald-500",
      glow: "to-emerald-500/5",
      logo: (
         <div className="flex items-center gap-1.5">
           <div className="p-0.5 bg-emerald-500/20 rounded">
             <Activity size={16} className="text-emerald-400" />
           </div>
           <div className="flex flex-col leading-none">
             <span className="text-[10px] font-bold text-white">Financial</span>
             <span className="text-[8px] text-emerald-400 tracking-wider">DATASETS.AI</span>
           </div>
         </div>
      ) 
    },
    { 
      name: "Polygon.io", 
      role: "Historical Price Data", 
      icon: <Hexagon size={16} />, 
      color: "text-violet-400", 
      bg: "bg-violet-500",
      glow: "to-violet-500/5",
      logo: (
         <div className="flex items-center gap-2">
            <img src="https://cdn-1.webcatalog.io/catalog/polygon-io/polygon-io-icon-filled-256.png" className="w-5 h-5 rounded-md" alt="Polygon" />
            <span className="text-sm font-bold text-white tracking-tight">polygon.io</span>
         </div>
      )
    },
    { 
      name: "Twelve Data", 
      role: "Real-time Quotes", 
      icon: <Zap size={16} />, 
      color: "text-sky-400", 
      bg: "bg-sky-500",
      glow: "to-sky-500/5",
      logo: (
         <div className="flex items-center gap-2">
            <img src="https://rapidapi-prod-apis.s3.amazonaws.com/56b6b106-8e1d-4f31-9611-10ba18a7acfe.png" className="w-5 h-5 rounded-md" alt="Twelve Data" />
            <span className="text-sm font-bold text-white font-mono">twelve<span className="text-sky-400">data</span></span>
         </div>
      )
    },
    { 
      name: "NewsAPI.org", 
      role: "Global Sentiment Stream", 
      icon: <Globe size={16} />, 
      color: "text-indigo-400", 
      bg: "bg-indigo-500",
      glow: "to-indigo-500/5",
      logo: (
         <div className="flex items-center gap-2">
            <img src="https://tools4coda.io/wp-content/uploads/News-API-Icon.png" className="w-5 h-5 object-contain" alt="NewsAPI" />
            <span className="text-sm font-bold text-white tracking-tight">News<span className="font-light text-gray-400">API</span></span>
         </div>
      )
    },
    { 
      name: "Qandle.ai", 
      role: "Alternative Data", 
      icon: <Radar size={16} />, 
      color: "text-cyan-400", 
      bg: "bg-cyan-500",
      glow: "to-cyan-500/5",
      logo: (
         <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">
                <span className="font-black text-cyan-400 text-[10px]">Q</span>
            </div>
            <span className="text-sm font-bold text-white">Qandle<span className="text-cyan-400">.ai</span></span>
         </div>
      )
    }
  ];

  return (
    <div className="w-full py-12 relative overflow-hidden">
        {/* Section Header */}
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between mb-8">
             <div className="flex items-center gap-4">
                <div className="h-px w-12 bg-gray-800"></div>
                <div className="flex items-center gap-2 text-gray-400">
                    <Layers size={16} className="text-blue-500" />
                    <span className="text-sm font-bold tracking-[0.2em] uppercase">Tactical Integrations</span>
                </div>
                <div className="h-px w-32 bg-gray-800"></div>
             </div>
        </div>

        {/* Scroll Container */}
        <div className="relative w-full">
            {/* Vignettes for smooth fade on edges */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#050505] to-transparent z-20 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#050505] to-transparent z-20 pointer-events-none"></div>

            <div className="flex animate-ticker w-max hover:[animation-play-state:paused]">
                {/* Tripling the list to ensure the -33.33% ticker animation loops seamlessly */}
                {[...partners, ...partners, ...partners].map((p, i) => (
                    <div key={i} className="w-[260px] mx-3 group relative bg-gray-900/30 border border-gray-800/50 hover:border-gray-600 rounded-xl overflow-hidden transition-all duration-300 hover:bg-gray-800/60">
                        {/* Hover Glow */}
                        <div className={`absolute inset-0 bg-gradient-to-br from-transparent ${p.glow} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                        
                        <div className="p-4 relative z-10">
                            <div className="flex justify-between items-center mb-3">
                                {/* LOGO */}
                                <div className="transition-transform group-hover:scale-105 origin-left">
                                    {p.logo}
                                </div>
                                
                                {/* Status Dot */}
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${p.bg} animate-pulse`}></span>
                                </div>
                            </div>
                            
                            <div className="space-y-1.5">
                                <div className="h-px w-full bg-gray-800/50 group-hover:bg-gray-700 transition-colors"></div>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${p.color} flex items-center gap-1.5`}>
                                    {p.icon} {p.role}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

// --- HERO FOOTER COMPONENT (COMPACT) ---
const HeroFooter = () => {
    return (
        <div className="w-full bg-[#020202] border-t border-gray-900 py-8 text-gray-400 text-sm">
            <div className="container mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                
                {/* Brand & Copyright */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <BrandLogo size="xs" />
                        <span className="font-bold text-gray-200">StonksAI</span>
                    </div>
                    <p className="text-xs text-gray-600 font-mono">
                        &copy; {new Date().getFullYear()} StonksAI. All Rights Reserved.
                    </p>
                </div>

                {/* Links - Compact List */}
                <div className="flex flex-col md:flex-row gap-8 md:gap-16">
                    {/* Media */}
                    <div className="flex flex-col gap-4">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                            <Youtube size={12} className="text-red-500" /> Media
                        </h5>
                        <div className="flex flex-col gap-3">
                            <a href="https://www.youtube.com/@russelalfeche" target="_blank" rel="noreferrer" className="flex items-start gap-3 group">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">RussYouTrust</span>
                                    <span className="text-[10px] text-gray-600 group-hover:text-gray-500">Tech, Coding & AI Tutorials</span>
                                </div>
                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 mt-0.5" />
                            </a>
                            <a href="https://www.youtube.com/@wanderwheels-scenicdrives" target="_blank" rel="noreferrer" className="flex items-start gap-3 group">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">Wander Wheels</span>
                                    <span className="text-[10px] text-gray-600 group-hover:text-gray-500">AI Voice & Scenic Drives</span>
                                </div>
                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 mt-0.5" />
                            </a>
                        </div>
                    </div>

                    {/* Socials */}
                    <div className="flex flex-col gap-4">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                            <MessageCircle size={12} className="text-blue-500" /> Connect
                        </h5>
                        <div className="flex gap-4">
                            <a href="https://discord.gg/9ZgpndRp" target="_blank" rel="noreferrer" className="p-2 bg-gray-900 rounded-lg text-[#5865F2] hover:bg-[#5865F2] hover:text-white transition-all border border-gray-800 hover:border-[#5865F2]" title="Discord">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                            </a>
                            <a href="https://linkedin.com/in/russel-alfeche" target="_blank" rel="noreferrer" className="p-2 bg-gray-900 rounded-lg text-[#0077b5] hover:bg-[#0077b5] hover:text-white transition-all border border-gray-800 hover:border-[#0077b5]" title="LinkedIn">
                                <Linkedin size={16} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const Hero: React.FC<HeroProps> = ({ onLoginClick, onOpenCoffee }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Rotating Headline State - Updated to concrete verbs
  const phrases = ["Dominate it.", "Decode it.", "Hack it.", "Win it."];

  // Carousel State
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; 
    const y = e.clientY - rect.top; 
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * 5; 
    const rotateX = ((y - centerY) / centerY) * -5;
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 }); 
  };

  const modules = [
    {
      id: "01",
      title: "Alpha Hunter",
      icon: <Filter size={40} />, // Bigger Icon (40)
      color: "blue" as const,
      desc: "Agentic semantic scanner finding hidden patterns.",
      gauges: [
        { label: "Scan Velocity", percent: 98 },
        { label: "Market Coverage", percent: 100 }
      ]
    },
    {
      id: "02",
      title: "Market X-Ray",
      icon: <Activity size={40} />, // Bigger Icon (40)
      color: "emerald" as const,
      desc: "Multi-modal synthesis of price & sentiment.",
      gauges: [
        { label: "Data Fusion", percent: 92 },
        { label: "Signal Clarity", percent: 88 }
      ]
    },
    {
      id: "03",
      title: "Strategy Lab",
      icon: <Zap size={40} />, // Bigger Icon (40)
      color: "violet" as const,
      desc: "Optimized options spreads for volatility arb.",
      gauges: [
        { label: "Profit Potential", percent: 95 },
        { label: "Risk Efficiency", percent: 90 }
      ]
    },
    {
      id: "04",
      title: "Risk Guardian",
      icon: <ShieldCheck size={40} />, // Bigger Icon (40)
      color: "orange" as const,
      desc: "Macro-event scenario modeling & correlation detection.",
      gauges: [
        { label: "Protection Level", percent: 100 },
        { label: "Threat Detection", percent: 94 }
      ]
    },
    {
      id: "05",
      title: "Sentiment Core",
      icon: <Brain size={40} />, // Bigger Icon (40)
      color: "rose" as const,
      desc: "Real-time parsing of global news impact.",
      gauges: [
        { label: "Processing Speed", percent: 99 },
        { label: "NLP Accuracy", percent: 94 }
      ]
    },
    {
      id: "06",
      title: "Nexus Prime",
      icon: <Layers size={40} />, // Bigger Icon (40)
      color: "cyan" as const,
      desc: "Centralized execution and automated alerts.",
      gauges: [
        { label: "Uptime", percent: 100 },
        { label: "Execution Latency", percent: 98 }
      ]
    }
  ];

  const handleNext = () => {
    setActiveModuleIndex((prev) => (prev + 1) % modules.length);
  };

  const handlePrev = () => {
    setActiveModuleIndex((prev) => (prev - 1 + modules.length) % modules.length);
  };

  // Auto-rotate carousel slowly
  useEffect(() => {
      const timer = setInterval(handleNext, 5000);
      return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden flex flex-col relative">
      {/* GLITCH CSS INJECTION */}
      <style>{`
        .glitch-text {
          position: relative;
          display: inline-block;
          color: #10b981;
        }
        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #050505;
          color: #10b981;
        }
        .glitch-text::before {
          left: 2px;
          text-shadow: -2px 0 #10b981;
          clip-path: inset(0 0 0 0);
          animation: glitch-anim-1 1s infinite linear alternate-reverse;
        }
        .glitch-text::after {
          left: -2px;
          text-shadow: -2px 0 #8b5cf6;
          clip-path: inset(0 0 0 0);
          animation: glitch-anim-2 1s infinite linear alternate-reverse;
        }
        
        @keyframes glitch-anim-1 {
          0% { clip-path: inset(20% 0 80% 0); transform: translate(-2px, 1px); }
          10% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -1px); }
          20% { clip-path: inset(40% 0 50% 0); transform: translate(-2px, 2px); }
          30% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -2px); }
          40% { clip-path: inset(10% 0 60% 0); transform: translate(-1px, 0); }
          50% { clip-path: inset(0 0 0 0); transform: translate(0, 0); opacity: 0; }
          100% { clip-path: inset(0 0 0 0); transform: translate(0, 0); opacity: 0; }
        }
        
        @keyframes glitch-anim-2 {
          0% { clip-path: inset(10% 0 60% 0); transform: translate(2px, -1px); }
          10% { clip-path: inset(80% 0 5% 0); transform: translate(-2px, 2px); }
          20% { clip-path: inset(30% 0 20% 0); transform: translate(1px, 1px); }
          30% { clip-path: inset(15% 0 80% 0); transform: translate(-1px, -2px); }
          40% { clip-path: inset(55% 0 10% 0); transform: translate(2px, 0); }
          50% { clip-path: inset(0 0 0 0); transform: translate(0, 0); opacity: 0; }
          100% { clip-path: inset(0 0 0 0); transform: translate(0, 0); opacity: 0; }
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; text-shadow: 0 0 8px #10b981; }
        }
      `}</style>

      {/* Background FX */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 warp-bg"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full mix-blend-screen"></div>
      </div>

      <Ticker />

      {/* Navigation */}
      <nav className="relative z-50 container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" animated={true} />
          <span className="text-xl font-bold tracking-tight">StonksAI</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <button 
             onClick={onOpenCoffee}
             className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
          >
             <Coffee size={16} className="text-orange-500" />
             <span className="hidden md:inline">Fuel Algo</span>
          </button>
          <div className="w-px h-6 bg-gray-800"></div>
          <button 
            onClick={onLoginClick}
            className="group bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all backdrop-blur-sm shadow-lg hover:shadow-emerald-500/10 flex items-center gap-2"
          >
            Launch Terminal
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </nav>

      {/* Hero Content */}
      <section className="relative z-10 flex-1 flex flex-col items-center pt-12 perspective-1000">
        
        <div className="px-4 text-center mb-12 relative max-w-4xl mx-auto flex flex-col items-center">
          
          {/* UPDATED: Dynamic Concrete Status Badge with PULSING STATUS */}
          <div className="mb-8 relative group cursor-crosshair inline-block">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 rounded-full blur opacity-20 group-hover:opacity-60 transition duration-500"></div>
            <div className="relative flex items-center gap-3 px-6 py-2 bg-[#0b0f19] rounded-full border border-emerald-500/20 shadow-2xl shadow-emerald-500/10 backdrop-blur-sm">
                <div className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <div className="flex items-center text-xs font-bold w-[130px] justify-center">
                    <PulsingStatus />
                </div>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-none text-white">
            The Market is a <span className="glitch-text font-black text-emerald-500" data-text="Game">Game</span>. <br />
            {/* Scramble Text Effect */}
            <TextScramble phrases={phrases} />
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
            Stop gambling. Start executing with algorithmic precision. 
            <span className="text-white font-medium"> StonksAI </span> gives you the institutional edge.
          </p>
        </div>

        {/* 3D Dashboard Interface */}
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full max-w-5xl h-[400px] mb-24 px-4 relative transform-style-3d transition-transform duration-100 ease-out"
          style={{ 
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          }}
        >
          {/* Glowing Backlight */}
          <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] -z-10 rounded-full opacity-40"></div>

          {/* Main Glass Panel */}
          <div className="relative h-full bg-[#0b0f19]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/5 group flex flex-col">
             
             {/* Scanner Line Effect */}
             <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-50 animate-beam z-20"></div>

             {/* Top Bar */}
             <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4 bg-black/40 shrink-0">
                <div className="flex items-center gap-2">
                   <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                   </div>
                </div>
                <div className="text-[10px] font-mono text-gray-500 flex items-center gap-4">
                   <span className="flex items-center gap-1"><Cpu size={10} /> CPU: 12%</span>
                   <span className="text-emerald-500 font-bold">CONNECTED</span>
                </div>
             </div>

             <div className="flex-1 grid md:grid-cols-12 overflow-hidden">
                <div className="hidden md:block md:col-span-3 h-full border-r border-gray-800">
                   <SystemLogs />
                </div>
                <div className="col-span-12 md:col-span-9 relative bg-gradient-to-b from-gray-900/0 to-emerald-900/5">
                   <LiveChart />
                </div>
             </div>
          </div>
        </div>

        {/* STRATEGIC CAROUSEL SECTION */}
        <div className="w-full max-w-7xl mx-auto px-4 overflow-hidden mb-12">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-16">
                 <div className="flex items-center gap-4">
                    <div className="h-px w-12 bg-gray-800"></div>
                    <div className="flex items-center gap-2 text-gray-400">
                        <Crosshair size={16} className="text-emerald-500" />
                        <span className="text-sm font-bold tracking-[0.2em] uppercase">Strategic Modules</span>
                    </div>
                    <div className="h-px w-32 bg-gray-800"></div>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={handlePrev} className="p-3 rounded-full border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={handleNext} className="p-3 rounded-full border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                        <ChevronRight size={20} />
                    </button>
                 </div>
            </div>

            {/* The 3D Carousel Stage */}
            <div className="relative h-[550px] w-full perspective-1000 flex items-center justify-center">
                {modules.map((m, i) => {
                    let offset = (i - activeModuleIndex);
                    if (offset > modules.length / 2) offset -= modules.length;
                    if (offset < -modules.length / 2) offset += modules.length;

                    return (
                       <TacticalModule 
                          key={i}
                          {...m}
                          isActive={i === activeModuleIndex}
                          offset={offset}
                          onClick={() => setActiveModuleIndex(i)}
                       />
                    );
                })}
            </div>
            
            {/* Pagination Dots */}
            <div className="flex justify-center gap-2 mt-4">
                {modules.map((_, i) => (
                    <button 
                       key={i}
                       onClick={() => setActiveModuleIndex(i)}
                       className={`h-1.5 rounded-full transition-all duration-300 ${i === activeModuleIndex ? 'w-8 bg-emerald-500' : 'w-2 bg-gray-800 hover:bg-gray-600'}`}
                    />
                ))}
            </div>

        </div>

        {/* INTEGRATION GRID SECTION */}
        <IntegrationGrid />

        {/* FOOTER */}
        <HeroFooter />

      </section>
    </div>
  );
};

export default Hero;
