
import React, { useState, useEffect } from 'react';
import { screenStocks } from '../services/gemini';
import { ScreenerResult, ViewState, HistoryItem } from '../types';
import { addXP } from '../services/gamification';
import { checkUsageLimit, incrementUsage } from '../services/usageService';
import { saveViewState, getViewState } from '../services/stateCache';
import { getModuleHistory, addToHistory, clearModuleHistory } from '../services/history';
import { handleAndLogError, FriendlyError } from '../services/errorLogging';
import { Filter, Sparkles, ChevronRight, Crosshair, Radar, Search, Database, History, X, Clock, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import CompanyLogo from './CompanyLogo';
import LimitReachedModal from './LimitReachedModal';

interface AIScreenerProps {
  onNavigate: (view: ViewState, params?: any) => void;
}

const AIScreener: React.FC<AIScreenerProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [restored, setRestored] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  // New Error State
  const [errorState, setErrorState] = useState<FriendlyError | null>(null);
  
  // History UI State
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Restore State on Mount
  useEffect(() => {
    const cached = getViewState('screener');
    if (cached) {
      setQuery(cached.query);
      setResults(cached.results);
      setRestored(true);
    }
    setHistoryItems(getModuleHistory('screener'));
  }, []);

  // Loading Animation State
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Indexing 5000+ Global Assets...",
    "Applying Fundamental Filters...",
    "Detecting Technical Breakouts...",
    "Analyzing Volume Spikes...",
    "Scoring Catalysts with AI...",
    "Ranking Top Alpha Candidates..."
  ];

  useEffect(() => {
    if (loading) {
      const timer = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 700);
      return () => clearInterval(timer);
    } else {
      setLoadingStep(0);
    }
  }, [loading]);

  const handleScreen = async (e: React.FormEvent, overrideQuery?: string) => {
    e.preventDefault();
    const searchQuery = overrideQuery || query;
    if (!searchQuery) return;

    // --- 1. CHECK USAGE LIMIT ---
    const usageCheck = await checkUsageLimit('screener');
    if (!usageCheck.allowed) {
        setShowLimitModal(true);
        return;
    }
    
    if (overrideQuery) setQuery(overrideQuery);
    
    setLoading(true);
    setRestored(false);
    setResults([]); // Clear previous results
    setErrorState(null);
    setShowHistory(false);

    try {
        const data = await screenStocks(searchQuery);
        
        if (!data || data.length === 0) {
            throw new Error("No candidates found or AI error");
        }

        setResults(data);
        
        // --- 2. INCREMENT USAGE ---
        await incrementUsage('screener');

        // Cache the new state
        saveViewState('screener', { query: searchQuery, results: data });
        
        // Add to History
        addToHistory('screener', searchQuery, { query: searchQuery, results: data });
        setHistoryItems(getModuleHistory('screener')); // Update local list

        // AWARD XP
        addXP(75);
    } catch(err: any) {
        // Extract model info if available
        const friendlyError = await handleAndLogError('AIScreener', err, { query: searchQuery }, err.modelUsed);
        setErrorState(friendlyError);
    } finally {
        setLoading(false);
    }
  };

  const handleRestoreHistory = (item: HistoryItem) => {
    setQuery(item.details.query);
    setResults(item.details.results);
    setRestored(true);
    setShowHistory(false);
    setErrorState(null);
  };

  const suggestions = [
    "Undervalued tech stocks with high growth potential",
    "High dividend yield energy companies suitable for retirement",
    "Biotech stocks with upcoming FDA approvals",
    "Semiconductor stocks breaking out of consolidation",
    "Growth Stocks",
    "Best Stocks for LEAPS"
  ];

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col relative">
      
      {/* LIMIT MODAL */}
      {showLimitModal && (
          <LimitReachedModal 
             moduleName="Alpha Hunter" 
             onClose={() => setShowLimitModal(false)}
             onUpgrade={() => {
                 setShowLimitModal(false);
                 // Force navigation via event dispatch
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

      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-xl shadow-emerald-900/20">
          <Sparkles className="text-white" size={32} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">AI Market Screener</h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          Describe what you're looking for in plain English. The AI will scan the market, fundamentals, and catalysts to find matches.
        </p>
      </div>

      <div className="w-full max-w-2xl mx-auto mb-12">
        <form onSubmit={(e) => handleScreen(e)} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 'EV companies with positive cash flow'"
            className="w-full bg-gray-900 border border-gray-700 text-white pl-6 pr-32 py-4 rounded-2xl shadow-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-lg"
          />
          <button
            type="submit"
            disabled={loading || !query}
            className="absolute right-2 top-2 bottom-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Scanning...' : 'Screen'}
          </button>
        </form>

        {!results.length && !loading && (
          <div className="mt-6">
            <p className="text-sm text-gray-500 text-center mb-3">Try these searches:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={(e) => handleScreen(e, s)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-2 rounded-full border border-gray-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="w-full bg-[#0b0f19] border border-gray-800 rounded-3xl p-12 relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center group">
            {/* ... Loading Animation SVG (Kept same as before) ... */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0f19]/80 to-[#0b0f19]"></div>
            <div className="relative z-10 mb-10">
                <div className="w-32 h-32 bg-gray-900/50 backdrop-blur-sm rounded-full border border-gray-700 flex items-center justify-center relative shadow-[0_0_60px_-10px_rgba(59,130,246,0.3)]">
                    <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 border-r border-t border-blue-500/50 rounded-full animate-spin"></div>
                    <Crosshair size={48} className="text-blue-400 relative z-10" />
                </div>
            </div>
            <div className="relative z-10 text-center space-y-4 max-w-md mx-auto">
                <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight mb-1">Hunting Alpha</h3>
                    <p className="text-gray-500 text-xs uppercase tracking-widest font-mono">Satellite Uplink Active...</p>
                </div>
                <div className="bg-gray-900/80 border border-gray-800 rounded-lg py-2 px-4 inline-block min-w-[300px]">
                    <span className="text-blue-400 font-mono text-sm flex items-center justify-center gap-2">
                       <Database size={14} className="animate-pulse" />
                       {loadingMessages[loadingStep]}
                    </span>
                </div>
            </div>
        </div>
      )}

      {/* ERROR STATE */}
      {errorState && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left animate-in fade-in slide-in-from-top-4 mb-8">
            <div className="bg-red-500/20 p-4 rounded-full shrink-0">
                <AlertCircle size={32} className="text-red-500" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-white mb-1">{errorState.title}</h3>
                <p className="text-sm text-red-300 max-w-lg mb-3">
                    {errorState.message}
                </p>
                <div className="flex gap-3 justify-center md:justify-start">
                    <button onClick={(e) => handleScreen(e)} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                        <RefreshCw size={14} /> Retry
                    </button>
                    <button onClick={() => setErrorState(null)} className="text-red-400 hover:text-white px-4 py-2 text-sm font-medium">
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
      )}

      {results.length > 0 && (
        <div className={`space-y-4 pb-10 ${!restored ? 'animate-in fade-in slide-in-from-bottom-8 duration-700' : ''}`}>
          <div className="flex items-center justify-between mb-2">
             <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Top AI Matches</h3>
             {restored && (
                 <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded-full flex items-center gap-1">
                     <History size={10} /> Restored from session
                 </span>
             )}
          </div>
          
          {results.map((stock, idx) => (
            <div 
                key={idx} 
                onClick={() => onNavigate('analysis', { ticker: stock.symbol, autoRun: true })}
                className="bg-gray-900 border border-gray-800 p-5 rounded-xl hover:border-emerald-500/30 transition-all group hover:bg-gray-800/50 cursor-pointer relative"
            >
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                     Analyze <ArrowRight size={14} />
                  </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <CompanyLogo symbol={stock.symbol} />
                  <div>
                    <h4 className="text-white font-semibold">{stock.name}</h4>
                    <span className="text-xs text-gray-500">{stock.sector}</span>
                  </div>
                </div>
                <div className="text-right pr-24 group-hover:pr-32 transition-all">
                   <div className="text-emerald-400 font-bold">{stock.price}</div>
                   <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                       Match Score: 
                       <span className="text-white font-bold">{stock.score}/10</span>
                   </div>
                </div>
              </div>
              <div className="mt-3 pl-[52px] bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                <p className="text-sm text-gray-300">
                  <span className="text-emerald-500 font-bold uppercase text-xs mr-2">Catalyst</span>
                  {stock.catalyst}
                </p>
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
                        Search History
                    </h3>
                    <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                <div className="space-y-3">
                    {historyItems.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">No history yet.</p>
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
                                </div>
                                <p className="text-sm text-gray-200 font-medium group-hover:text-emerald-400 transition-colors">
                                    "{item.summary}"
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {item.details.results.length} results found
                                </p>
                            </div>
                        ))
                    )}
                </div>
                {historyItems.length > 0 && (
                     <button 
                        onClick={() => {
                            clearModuleHistory('screener');
                            setHistoryItems([]);
                        }}
                        className="w-full mt-4 text-xs text-red-400 hover:text-red-300 py-2 border border-red-900/30 rounded"
                     >
                         Clear History
                     </button>
                )}
            </div>
        </>
      )}
    </div>
  );
};

export default AIScreener;
