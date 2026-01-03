
import React, { useEffect, useState } from 'react';
import { getMarketSentiment } from '../services/gemini';
import { MarketSentiment, ViewState } from '../types';
import { handleAndLogError, FriendlyError } from '../services/errorLogging';
import { checkUsageLimit, incrementUsage } from '../services/usageService';
import { ArrowUp, RefreshCw, Zap, Activity, Flame, Skull, Target, Award, Filter, TrendingUp, Globe, Radio, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import LimitReachedModal from './LimitReachedModal';

interface DashboardProps {
    onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  // Error state for manual refreshes
  const [errorState, setErrorState] = useState<FriendlyError | null>(null);
  
  // Fun animation state for the score
  const [displayScore, setDisplayScore] = useState(0);

  // Loading Animation State
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Establishing Secure Uplink...",
    "Syncing with Global Exchanges...",
    "Ingesting Real-time Macro Data...",
    "Analyzing Social Sentiment Streams...",
    "Calibrating Fear & Greed Models...",
    "Finalizing Situation Report..."
  ];

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 800);
      return () => clearInterval(interval);
    } else {
      setLoadingStep(0);
    }
  }, [loading]);

  // Fetch Logic: Accepts force flag
  const fetchSentiment = async (force: boolean = false) => {
    // Check Limits only on FORCE refresh (Initial load usually cached)
    if (force) {
        const usageCheck = await checkUsageLimit('sentiment');
        if (!usageCheck.allowed) {
            setShowLimitModal(true);
            return;
        }
    }

    setLoading(true);
    setErrorState(null);
    // Only clear previous data if we are forcing a refresh (improves UX on mount)
    if (force) setSentiment(null); 
    
    try {
        const data = await getMarketSentiment(force);
        setSentiment(data);
        
        // Increment usage if successful and forced refresh
        if (force) {
            await incrementUsage('sentiment');
        }

    } catch (e: any) {
        console.error(e);
        // Log to backend
        const friendlyError = await handleAndLogError('Dashboard', e, { action: 'fetchSentiment', force }, e.modelUsed);
        
        // If it was a manual refresh or initial load failed completely, show error
        if (force || !sentiment) {
            setErrorState(friendlyError);
        }
    } finally {
        setLoading(false);
    }
  };

  // Initial Mount: Use Cache (force = false)
  useEffect(() => {
    fetchSentiment(false);
  }, []);

  // Animate score count up
  useEffect(() => {
    if (sentiment) {
      const duration = 1500;
      const steps = 60;
      const stepTime = duration / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += sentiment.score / steps;
        if (current >= sentiment.score) {
           setDisplayScore(sentiment.score);
           clearInterval(timer);
        } else {
           setDisplayScore(Math.floor(current));
        }
      }, stepTime);
      return () => clearInterval(timer);
    }
  }, [sentiment]);

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400';
    if (score >= 55) return 'text-emerald-300';
    if (score >= 45) return 'text-yellow-400';
    if (score >= 25) return 'text-orange-400';
    return 'text-red-500';
  };

  const getGaugeData = (score: number) => [
    { name: 'Score', value: score },
    { name: 'Remainder', value: 100 - score },
  ];

  const shortcuts: { title: string; desc: string; icon: React.ReactNode; color: string; xp: string; target: ViewState }[] = [
    { 
      title: '1. Hunt Signals', 
      desc: 'Use AI to find trade ideas.', 
      icon: <Filter className="text-blue-400" size={24} />,
      color: 'blue',
      xp: '+75 XP',
      target: 'screener'
    },
    { 
      title: '2. Scout Asset', 
      desc: 'Deep dive analysis.', 
      icon: <Target className="text-emerald-400" size={24} />,
      color: 'emerald',
      xp: '+50 XP',
      target: 'analysis'
    },
    { 
      title: '3. Forge Strategy', 
      desc: 'Create options execution.', 
      icon: <TrendingUp className="text-violet-400" size={24} />,
      color: 'violet',
      xp: '+100 XP',
      target: 'options'
    },
  ];

  return (
    <div className="space-y-8 relative">
      
      {/* LIMIT MODAL */}
      {showLimitModal && (
          <LimitReachedModal 
             moduleName="Market Pulse" 
             onClose={() => setShowLimitModal(false)}
             onUpgrade={() => {
                 setShowLimitModal(false);
                 // Force navigation via event dispatch
                 window.dispatchEvent(new CustomEvent('quantai-navigate', { detail: 'subscription' }));
             }} 
          />
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
               Command Center
             </span>
             <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-mono">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
               LIVE FEED
             </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Ready to hunt alpha?
          </h1>
          <p className="text-gray-400 mt-1">Your AI co-pilot is synced with global markets.</p>
        </div>
        <button
          onClick={() => fetchSentiment(true)} // Force refresh only on click
          disabled={loading}
          className="group flex items-center justify-center gap-2 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-3 rounded-xl transition-all duration-300 border border-gray-700 hover:border-emerald-500 shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
        >
          <RefreshCw size={18} className={`transition-transform duration-700 ${loading ? "animate-spin" : "group-hover:rotate-180"}`} />
          <span className="font-semibold">Sync Market Vibe</span>
        </button>
      </div>

      {/* ERROR BANNER FOR DASHBOARD */}
      {errorState && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 animate-in fade-in">
            <AlertCircle size={20} className="shrink-0" />
            <div className="flex-1">
                <span className="font-bold block text-sm">{errorState.title}</span>
                <span className="text-xs opacity-80">{errorState.message}</span>
            </div>
            <button onClick={() => setErrorState(null)} className="text-xs hover:text-white underline">Dismiss</button>
        </div>
      )}

      {loading && !sentiment ? (
        <div className="w-full bg-[#0b0f19] border border-gray-800 rounded-3xl p-12 relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center group">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0f19]/80 to-[#0b0f19]"></div>
            
            {/* Central Animation */}
            <div className="relative z-10 mb-10">
                <div className="w-32 h-32 bg-gray-900/50 backdrop-blur-sm rounded-full border border-gray-700 flex items-center justify-center relative shadow-[0_0_60px_-10px_rgba(99,102,241,0.3)]">
                    <div className="absolute inset-0 bg-violet-500/10 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 border border-violet-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
                    <div className="absolute inset-4 border border-emerald-500/30 rounded-full animate-[spin_5s_linear_infinite_reverse]"></div>
                    
                    <Globe size={48} className="text-violet-400 relative z-10 animate-pulse" />
                    
                    {/* Orbiting Particles */}
                    <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
                        <div className="absolute top-0 left-1/2 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_#34d399] -translate-x-1/2 -translate-y-1"></div>
                    </div>
                </div>
            </div>

            {/* Text Animation */}
            <div className="relative z-10 text-center space-y-4 max-w-md mx-auto">
                <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight mb-1">Initializing Command</h3>
                    <p className="text-gray-500 text-xs uppercase tracking-widest font-mono">Connecting to Neural Matrix...</p>
                </div>
                
                <div className="bg-gray-900/80 border border-gray-800 rounded-lg py-2 px-4 inline-block min-w-[300px]">
                    <span className="text-violet-400 font-mono text-sm flex items-center justify-center gap-2">
                       <Radio size={14} className="animate-pulse" />
                       {loadingMessages[loadingStep]}
                    </span>
                </div>
            </div>
        </div>
      ) : sentiment ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Fear & Greed Gauge - Gamified */}
          <div className="bg-gray-900/40 backdrop-blur border border-gray-800 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:border-gray-700 transition-colors">
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             
             <div className="w-full flex justify-between items-start mb-2 relative z-10">
                <div>
                   <h3 className="text-gray-400 font-bold uppercase text-xs tracking-wider">Market Mood</h3>
                   <div className="flex items-center gap-1 mt-1">
                      {sentiment.score > 50 ? <Flame className="text-orange-500" size={16} /> : <Skull className="text-gray-500" size={16} />}
                      <span className="text-white font-bold text-sm">{sentiment.outlook}</span>
                   </div>
                </div>
                <div className="bg-gray-800/50 p-2 rounded-lg">
                   <Zap size={20} className={sentiment.score > 50 ? "text-yellow-400 fill-yellow-400" : "text-gray-600"} />
                </div>
             </div>

             <div className="h-48 w-full relative z-10">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={getGaugeData(displayScore)}
                     cx="50%"
                     cy="80%"
                     startAngle={180}
                     endAngle={0}
                     innerRadius={70}
                     outerRadius={90}
                     paddingAngle={0}
                     dataKey="value"
                     stroke="none"
                   >
                     <Cell key="score" fill={sentiment.score > 50 ? '#10b981' : '#ef4444'} className="drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                     <Cell key="bg" fill="#1f2937" />
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center justify-end h-full">
                 <span className={`text-6xl font-black tracking-tighter transition-colors duration-300 ${getScoreColor(displayScore)}`}>
                   {displayScore}
                 </span>
                 <span className="text-xs text-gray-500 uppercase font-bold mt-1">Vibe Score</span>
               </div>
             </div>
          </div>

          {/* Market Summary - Terminal Style */}
          <div className="lg:col-span-2 bg-gray-900/40 backdrop-blur border border-gray-800 rounded-3xl p-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 opacity-20">
                <Activity size={120} className="text-emerald-500 transform -rotate-12 translate-x-10 -translate-y-10" />
             </div>
             
             <h3 className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-4 flex items-center gap-2">
               <span className="w-2 h-2 bg-violet-500 rounded-sm"></span>
               AI Situation Report
             </h3>
             <p className="text-xl text-gray-100 leading-relaxed mb-8 font-light">
               {sentiment.summary}
             </p>
             
             <div className="grid md:grid-cols-2 gap-4 relative z-10">
                 {sentiment.keyEvents.map((event, idx) => (
                   <div key={idx} className="bg-black/40 p-4 rounded-xl border border-gray-800/50 text-sm text-gray-300 flex items-start gap-3 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group">
                     <div className="mt-1 w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center shrink-0 border border-gray-700 group-hover:border-emerald-500 group-hover:text-emerald-400">
                        <span className="text-[10px] font-mono">{idx + 1}</span>
                     </div>
                     {event}
                   </div>
                 ))}
             </div>
          </div>
        </div>
      ) : null}

      {/* Feature Quests */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Award className="text-yellow-500" size={20} />
          Workflow Shortcuts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {shortcuts.map((item, i) => (
            <div 
                key={i} 
                onClick={() => onNavigate(item.target)}
                className="bg-gray-900/30 border border-gray-800 p-6 rounded-2xl hover:border-gray-600 hover:bg-gray-800/50 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 px-3 py-1 bg-${item.color}-500/10 text-${item.color}-400 text-[10px] font-bold rounded-bl-xl border-l border-b border-${item.color}-500/20`}>
                {item.xp}
              </div>
              <div className={`bg-gray-800/50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-gray-700 group-hover:border-${item.color}-500/50 group-hover:scale-110 transition-transform duration-300`}>
                {item.icon}
              </div>
              <h3 className="text-white font-bold text-lg mb-1 group-hover:text-white transition-colors">{item.title}</h3>
              <p className="text-sm text-gray-400">{item.desc}</p>
              
              <div className="mt-4 w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div className={`h-full bg-${item.color}-500 w-0 group-hover:w-full transition-all duration-700 ease-out`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
