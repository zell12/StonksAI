
import React, { useState, useEffect } from 'react';
import { generateOptionsStrategies } from '../services/gemini';
import { OptionsStrategy, HistoryItem } from '../types';
import { getTickerFromSearch } from '../services/tickerMapping';
import { addXP } from '../services/gamification';
import { checkUsageLimit, incrementUsage } from '../services/usageService';
import { saveViewState, getViewState } from '../services/stateCache';
import { getModuleHistory, addToHistory } from '../services/history';
import { handleAndLogError, FriendlyError } from '../services/errorLogging';
import { TrendingUp, TrendingDown, Minus, Briefcase, ArrowRight, Calendar, Activity, AlertCircle, Cpu, Zap, Search, Layers, Lock, History, X, Clock, AlertOctagon, Sparkles, Undo2, RefreshCw } from 'lucide-react';
import CompanyLogo from './CompanyLogo';
import LimitReachedModal from './LimitReachedModal';

interface OptionsStrategistProps {
    initialTicker?: string;
    initialOutlook?: string;
}

const OptionsStrategist: React.FC<OptionsStrategistProps> = ({ initialTicker, initialOutlook }) => {
  const [ticker, setTicker] = useState(initialTicker || '');
  const [outlook, setOutlook] = useState(initialOutlook || 'Bullish');
  const [strategies, setStrategies] = useState<OptionsStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  // New Error State
  const [errorState, setErrorState] = useState<FriendlyError | null>(null);
  
  const [restored, setRestored] = useState(false);

  // Auto-correct state
  const [correction, setCorrection] = useState<{original: string, applied: string} | null>(null);

  // History UI State
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  
  // Restore State or Use Props
  useEffect(() => {
    // If coming from pipeline, use props
    if (initialTicker) {
        setTicker(initialTicker);
        setOutlook(initialOutlook || 'Bullish');
        // Optional: Auto-run here if desired, but strategy generation costs tokens, so maybe let user confirm
    } else {
        const cached = getViewState('options');
        if (cached) {
            setTicker(cached.ticker);
            setOutlook(cached.outlook);
            setStrategies(cached.strategies);
            setRestored(true);
        }
    }
    setHistoryItems(getModuleHistory('options'));
  }, [initialTicker, initialOutlook]);

  // Loading Animation State
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Analyzing Volatility Surface...",
    "Fetching Real-time Greeks...",
    "Simulating Monte Carlo Paths...",
    "Optimizing Risk/Reward Ratios...",
    "Backtesting Decay Curves...",
    "Detecting Liquidity Pools...",
    "Finalizing Execution Targets..."
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

  const handleGenerate = async () => {
    let searchInput = ticker;
    if (!searchInput.trim()) return;

    // --- 1. CHECK USAGE LIMIT ---
    const usageCheck = await checkUsageLimit('options');
    if (!usageCheck.allowed) {
        setShowLimitModal(true);
        return;
    }

    setCorrection(null);
    setErrorState(null);
    
    // --- GENTLE AUTO-CORRECT ---
    const mappedTicker = getTickerFromSearch(searchInput);
    if (mappedTicker && mappedTicker !== searchInput.toUpperCase()) {
        setCorrection({ original: searchInput, applied: mappedTicker });
        searchInput = mappedTicker;
        setTicker(mappedTicker); // Update UI
    }

    setLoading(true);
    setRestored(false);
    setShowHistory(false);
    setStrategies([]);
    
    try {
        const results = await generateOptionsStrategies(searchInput, outlook);
        if (results && results.length > 0) {
            setStrategies(results);
            
            // --- 2. INCREMENT USAGE ---
            await incrementUsage('options');

            // Cache State
            saveViewState('options', { ticker: searchInput, outlook, strategies: results });

            // Save History
            addToHistory('options', `${searchInput} ${outlook} Strategies`, { ticker: searchInput, outlook, strategies: results });
            setHistoryItems(getModuleHistory('options'));

            // AWARD XP
            addXP(100);
        } else {
            throw new Error("AI returned no strategies");
        }
    } catch (e: any) {
        const friendlyError = await handleAndLogError('OptionsStrategist', e, { ticker: searchInput, outlook }, e.modelUsed);
        setErrorState(friendlyError);
    } finally {
        setLoading(false);
    }
  };

  const revertCorrection = () => {
      if (!correction) return;
      setTicker(correction.original);
      setCorrection(null);
  };

  const handleRestoreHistory = (item: HistoryItem) => {
    setTicker(item.details.ticker);
    setOutlook(item.details.outlook);
    setStrategies(item.details.strategies);
    setRestored(true);
    setShowHistory(false);
    setCorrection(null);
    setErrorState(null);
  };

  const outlookOptions = [
    { value: 'Bullish', icon: <TrendingUp size={18} className="text-emerald-400" />, color: 'emerald' },
    { value: 'Bearish', icon: <TrendingDown size={18} className="text-red-400" />, color: 'red' },
    { value: 'Neutral', icon: <Minus size={18} className="text-gray-400" />, color: 'gray' },
    { value: 'Volatile', icon: <Activity size={18} className="text-yellow-400" />, color: 'yellow' },
  ];

  return (
    <div className="max-w-5xl mx-auto relative">
      
      {/* LIMIT MODAL */}
      {showLimitModal && (
          <LimitReachedModal 
             moduleName="Volatility Labs" 
             onClose={() => setShowLimitModal(false)}
             // The parent component (App.tsx) handles navigation via props usually, 
             // but if we are deep in component tree, we might need a workaround or rely on simple hrefs if nav function missing
             onUpgrade={() => {
                 setShowLimitModal(false);
                 // Fallback navigation if props not passed deeply
                 window.dispatchEvent(new CustomEvent('quantai-navigate', { detail: 'subscription' }));
             }} 
          />
      )}

      {/* Top Bar with History Toggle */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm"
        >
          <History size={16} /> History
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Options Strategist</h1>
        <p className="text-gray-400 text-sm">AI-powered spread generation optimized for your market outlook.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
        <div className="grid md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-4 space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Underlying Symbol</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="e.g. SPY or Company Name"
              className="w-full bg-gray-950 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="md:col-span-6 space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Your Outlook</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {outlookOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setOutlook(opt.value)}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all border ${
                    outlook === opt.value
                      ? 'bg-gray-800 border-gray-600 text-white shadow-lg'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-900'
                  }`}
                >
                  {opt.icon}
                  {opt.value}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <button
              onClick={handleGenerate}
              disabled={loading || !ticker}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 h-[48px]"
            >
              {loading ? 'Thinking...' : 'Generate'}
            </button>
          </div>
        </div>
        
         {/* Gentle Auto-Correct UI */}
         {correction && (
            <div className="mt-4 flex items-center justify-start gap-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-lg border border-blue-500/20 text-sm">
                   <Sparkles size={14} />
                   <span>Auto-corrected <strong>"{correction.original}"</strong> to <strong>{correction.applied}</strong></span>
                   <div className="h-4 w-px bg-blue-500/30 mx-2"></div>
                   <button 
                     onClick={revertCorrection}
                     className="flex items-center gap-1 hover:text-white font-bold underline decoration-blue-500/50 hover:decoration-white transition-all"
                   >
                     <Undo2 size={14} /> Undo
                   </button>
                </div>
            </div>
        )}
      </div>

      {/* FUN LOADING STATE */}
      {loading && (
        <div className="w-full bg-[#0b0f19] border border-gray-800 rounded-3xl p-12 relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center group">
            {/* ... Loading SVG ... */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0f19]/80 to-[#0b0f19]"></div>
            <div className="relative z-10 mb-10">
                <div className="w-32 h-32 bg-gray-900/50 backdrop-blur-sm rounded-full border border-gray-700 flex items-center justify-center relative shadow-[0_0_60px_-10px_rgba(16,185,129,0.3)]">
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 border border-emerald-500/30 rounded-full animate-[spin_8s_linear_infinite]"></div>
                    <Cpu size={48} className="text-emerald-400 relative z-10" />
                </div>
            </div>
            <div className="relative z-10 text-center space-y-4 max-w-md mx-auto">
                <div className="bg-gray-900/80 border border-gray-800 rounded-lg py-2 px-4 inline-block min-w-[300px]">
                    <span className="text-emerald-400 font-mono text-sm flex items-center justify-center gap-2">
                       <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                       {loadingMessages[loadingStep]}
                    </span>
                </div>
            </div>
        </div>
      )}

      {/* ERROR STATE */}
      {errorState && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left animate-in fade-in slide-in-from-top-4">
            <div className="bg-red-500/20 p-4 rounded-full shrink-0">
                <AlertCircle size={32} className="text-red-500" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-white mb-1">{errorState.title}</h3>
                <p className="text-sm text-red-300 max-w-lg mb-3">
                    {errorState.message}
                </p>
                <div className="flex gap-3 justify-center md:justify-start">
                    <button onClick={handleGenerate} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                        <RefreshCw size={14} /> Retry
                    </button>
                    <button onClick={() => setErrorState(null)} className="text-red-400 hover:text-white px-4 py-2 text-sm font-medium">
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
      )}

      {!loading && strategies.length > 0 && (
          <div className={`grid gap-6 ${!restored ? 'animate-in fade-in slide-in-from-bottom-8 duration-700' : ''}`}>
            {restored && (
                <div className="flex justify-end">
                     <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                         <History size={10} /> Restored from session
                     </span>
                </div>
            )}
            
            {strategies.map((strat, idx) => (
              <div key={idx} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all group">
                <div className="p-6">
                  {/* ... Strategy Details ... */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                    <div>
                       <div className="flex items-center gap-3 mb-2">
                          <CompanyLogo symbol={ticker} size="sm" className="hidden md:flex" />
                          <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{strat.name}</h3>
                          <span className={`text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700`}>
                            {strat.riskProfile} Risk
                          </span>
                       </div>
                       <p className="text-gray-400 text-sm max-w-2xl">{strat.description}</p>
                    </div>
                    {/* Greeks */}
                    <div className="flex items-center gap-4 bg-gray-950 p-3 rounded-xl border border-gray-800">
                      <div className="text-center px-2">
                        <p className="text-xs text-gray-500 uppercase mb-1">Delta</p>
                        <p className="text-white font-mono">{strat.greeks.delta}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-800"></div>
                      <div className="text-center px-2">
                        <p className="text-xs text-gray-500 uppercase mb-1">Theta</p>
                        <p className="text-emerald-400 font-mono">{strat.greeks.theta}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 relative">
                    <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-800"></div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                        <Briefcase size={16} /> Trade Setup
                      </h4>
                      <ul className="space-y-2">
                        {strat.setup.legs.map((leg, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                            <ArrowRight size={14} className="text-gray-600" />
                            {leg}
                          </li>
                        ))}
                      </ul>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                         <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-800">
                           <p className="text-xs text-gray-500 mb-1">Target Entry</p>
                           <p className="text-white font-medium">{strat.setup.entryPrice}</p>
                         </div>
                         <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-800">
                           <p className="text-xs text-gray-500 mb-1">Exit Plan</p>
                           <p className="text-emerald-400 font-medium">{strat.setup.exitTarget}</p>
                         </div>
                         
                         <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-800 col-span-2 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Recommended Expiry</p>
                                <p className="text-white font-medium flex items-center gap-2">
                                    <Calendar size={14} className="text-violet-400" />
                                    {strat.setup.expiry}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 mb-1">Stop Loss</p>
                                <p className="text-red-400 font-medium flex items-center justify-end gap-1">
                                    <AlertOctagon size={12} />
                                    {strat.setup.stopLoss}
                                </p>
                            </div>
                         </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                        <Activity size={16} /> AI Rationale
                      </h4>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {strat.rationale}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
      )}

      {/* History Slide-over Panel */}
      {showHistory && (
        <>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20" onClick={() => setShowHistory(false)}></div>
            <div className="absolute top-0 right-0 bottom-0 w-80 bg-[#0b0f19] border-l border-gray-800 z-30 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <History size={18} className="text-emerald-500" />
                        Strategy History
                    </h3>
                    <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                <div className="space-y-3">
                    {historyItems.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">No strategy history.</p>
                    ) : (
                        historyItems.map((item) => (
                            <div 
                                key={item.id}
                                onClick={() => handleRestoreHistory(item)}
                                className="p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 cursor-pointer group transition-colors"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        item.details.outlook === 'Bullish' ? 'bg-emerald-900 text-emerald-400' :
                                        item.details.outlook === 'Bearish' ? 'bg-red-900 text-red-400' :
                                        'bg-gray-800 text-gray-300'
                                    }`}>
                                        {item.details.outlook}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-200 font-bold group-hover:text-emerald-400 transition-colors mt-2">
                                    {item.details.ticker}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                    {item.details.strategies.length} Strategies
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
      )}

    </div>
  );
};

export default OptionsStrategist;
