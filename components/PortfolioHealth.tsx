
import React, { useState, useEffect } from 'react';
import { analyzePortfolio } from '../services/gemini';
import { PortfolioAudit, HistoryItem } from '../types';
import { checkUsageLimit, incrementUsage } from '../services/usageService';
import { saveViewState, getViewState } from '../services/stateCache';
import { getModuleHistory, addToHistory } from '../services/history';
import { handleAndLogError, FriendlyError } from '../services/errorLogging';
import { ShieldCheck, AlertTriangle, TrendingUp, CheckCircle, PieChart, Activity, ShieldAlert, BarChart3, Zap, History, X, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import CompanyLogo from './CompanyLogo';
import LimitReachedModal from './LimitReachedModal';

const PortfolioHealth: React.FC = () => {
  const [holdings, setHoldings] = useState('');
  const [analysis, setAnalysis] = useState<PortfolioAudit | null>(null);
  const [loading, setLoading] = useState(false);
  const [restored, setRestored] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  // New Error State
  const [errorState, setErrorState] = useState<FriendlyError | null>(null);

  // History UI State
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Restore State
  useEffect(() => {
    const cached = getViewState('portfolio');
    if (cached) {
      setHoldings(cached.holdings);
      setAnalysis(cached.analysis);
      setRestored(true);
    }
    setHistoryItems(getModuleHistory('portfolio'));
  }, []);

  // Loading Animation State
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Deconstructing Portfolio Allocation...",
    "Running Monte Carlo Simulations...",
    "Detecting Sector Correlation Risks...",
    "Stress Testing: Recession Scenario (-20%)...",
    "Stress Testing: Inflation Spike...",
    "Calculating Beta Coefficients...",
    "Formulating Hedge Strategy..."
  ];

  useEffect(() => {
    if (loading) {
      const timer = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 800);
      return () => clearInterval(timer);
    } else {
      setLoadingStep(0);
    }
  }, [loading]);

  const handleAudit = async () => {
    if (!holdings) return;

    // --- 1. CHECK USAGE LIMIT ---
    const usageCheck = await checkUsageLimit('portfolio');
    if (!usageCheck.allowed) {
        setShowLimitModal(true);
        return;
    }

    setLoading(true);
    setRestored(false);
    setAnalysis(null);
    setErrorState(null);
    setShowHistory(false);

    try {
      const result = await analyzePortfolio(holdings);
      
      if (!result) {
         throw new Error("AI returned empty analysis");
      }

      setAnalysis(result);
      
      // --- 2. INCREMENT USAGE ---
      await incrementUsage('portfolio');

      // Cache State
      saveViewState('portfolio', { holdings, analysis: result });

      // Save History
      addToHistory('portfolio', `Audit: ${holdings.substring(0, 20)}...`, { holdings, analysis: result });
      setHistoryItems(getModuleHistory('portfolio'));

    } catch (e: any) {
      const friendlyError = await handleAndLogError('PortfolioHealth', e, { holdings }, e.modelUsed);
      setErrorState(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreHistory = (item: HistoryItem) => {
    setHoldings(item.details.holdings);
    setAnalysis(item.details.analysis);
    setRestored(true);
    setShowHistory(false);
    setErrorState(null);
  };

  const exampleHoldings = "AAPL 50 shares, NVDA 20 shares, MSFT 30 shares, SPY 100 shares, 50k USD Cash";

  return (
    <div className="max-w-6xl mx-auto space-y-8 relative">
       
       {/* LIMIT MODAL */}
       {showLimitModal && (
          <LimitReachedModal 
             moduleName="Risk Guardian" 
             onClose={() => setShowLimitModal(false)}
             onUpgrade={() => {
                 setShowLimitModal(false);
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

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Portfolio Risk Auditor</h1>
          <p className="text-gray-400 text-sm max-w-2xl">
            Institutional-grade stress testing. Paste your portfolio to detect hidden beta exposure, sector concentration, and macro risks.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-6 rounded-2xl">
            <label className="block text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Current Holdings</label>
            <textarea
              value={holdings}
              onChange={(e) => setHoldings(e.target.value)}
              placeholder={`e.g.\n${exampleHoldings}`}
              className="w-full h-48 bg-gray-950/50 border border-gray-800 rounded-xl p-4 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 font-mono resize-none"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleAudit}
                disabled={loading || !holdings}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : (
                  <>
                    <ShieldCheck size={18} /> Run Audit
                  </>
                )}
              </button>
              <button 
                onClick={() => setHoldings(exampleHoldings)}
                className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl transition-colors text-sm"
              >
                Example
              </button>
            </div>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl">
             <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-3">How it works</h3>
             <ul className="space-y-3 text-sm text-gray-400">
               <li className="flex gap-2">
                 <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                 Parses natural language lists
               </li>
               <li className="flex gap-2">
                 <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                 Checks Beta & Sector correlation
               </li>
               <li className="flex gap-2">
                 <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                 Suggests specific hedge instruments
               </li>
             </ul>
          </div>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-2 space-y-6">
          {loading && (
            <div className="w-full h-full bg-[#0b0f19] border border-gray-800 rounded-3xl p-12 relative overflow-hidden flex flex-col items-center justify-center group min-h-[400px]">
                {/* ... Loading SVG ... */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0f19]/80 to-[#0b0f19]"></div>
                <div className="relative z-10 mb-10">
                    <div className="w-32 h-32 bg-gray-900/50 backdrop-blur-sm rounded-full border border-gray-700 flex items-center justify-center relative shadow-[0_0_60px_-10px_rgba(245,158,11,0.3)]">
                        <div className="absolute inset-0 bg-orange-500/10 rounded-full animate-ping"></div>
                        <div className="absolute inset-0 border border-orange-500/30 rounded-full animate-pulse"></div>
                        <ShieldAlert size={48} className="text-orange-400 relative z-10" />
                    </div>
                </div>
                <div className="relative z-10 text-center space-y-4 max-w-md mx-auto">
                    <div className="bg-gray-900/80 border border-gray-800 rounded-lg py-2 px-4 inline-block min-w-[300px]">
                        <span className="text-orange-400 font-mono text-sm flex items-center justify-center gap-2">
                           <BarChart3 size={14} className="animate-pulse" />
                           {loadingMessages[loadingStep]}
                        </span>
                    </div>
                </div>
            </div>
          )}

          {/* ERROR STATE */}
          {errorState && (
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
                        <button onClick={handleAudit} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                            <RefreshCw size={14} /> Retry
                        </button>
                        <button onClick={() => setErrorState(null)} className="text-red-400 hover:text-white px-4 py-2 text-sm font-medium">
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
          )}

          {!loading && !analysis && !errorState && (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-2xl min-h-[400px]">
              <PieChart size={48} className="mb-4 opacity-50" />
              <p>Awaiting portfolio data</p>
            </div>
          )}

          {analysis && (
            <div className={`space-y-6 ${!restored ? 'animate-in fade-in slide-in-from-bottom-8 duration-700' : ''}`}>
               {restored && (
                 <div className="flex justify-end">
                     <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                         <History size={10} /> Restored from session
                     </span>
                 </div>
               )}
              
              {/* Score Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium uppercase mb-1">Health Score</p>
                    <p className={`text-4xl font-mono font-bold ${
                      analysis.healthScore > 75 ? 'text-emerald-400' : analysis.healthScore > 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {analysis.healthScore}/100
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      analysis.healthScore > 75 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    <Activity size={24} />
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                   <p className="text-gray-400 text-sm font-medium uppercase mb-1">Diversification Status</p>
                   <p className="text-white text-lg font-medium leading-tight mt-2">{analysis.diversificationStatus}</p>
                </div>
              </div>

              {/* Deep Analysis */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-emerald-400 font-medium mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} /> Risk Assessment
                </h3>
                <p className="text-gray-300 leading-relaxed text-sm">
                  {analysis.riskAssessment}
                </p>
                {/* ... Hedges ... */}
              </div>

              {/* Actionable Moves */}
              <div>
                <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4">Recommended Adjustments</h3>
                <div className="grid gap-4">
                  {analysis.actionableMoves.map((move, i) => (
                    <div key={i} className="glass-panel p-4 rounded-xl flex items-start gap-4 hover:bg-gray-800/50 transition-colors">
                      <div className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wide mt-1 ${
                        move.action === 'Buy' ? 'bg-emerald-500/20 text-emerald-400' : 
                        move.action === 'Sell' ? 'bg-red-500/20 text-red-400' : 
                        move.action === 'Reduce' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {move.action}
                      </div>
                      <div className="flex items-center gap-3">
                        <CompanyLogo symbol={move.asset} size="sm" />
                        <div>
                            <span className="text-white font-bold font-mono mr-2">{move.asset}</span>
                            <p className="text-sm text-gray-400 mt-1">{move.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

       {/* History Slide-over Panel */}
       {showHistory && (
        <>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20" onClick={() => setShowHistory(false)}></div>
            <div className="absolute top-0 right-0 bottom-0 w-80 bg-[#0b0f19] border-l border-gray-800 z-30 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <History size={18} className="text-emerald-500" />
                        Audit History
                    </h3>
                    <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                <div className="space-y-3">
                    {historyItems.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">No audit history.</p>
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
                                        item.details.analysis.healthScore > 75 ? 'bg-emerald-900 text-emerald-400' :
                                        item.details.analysis.healthScore < 50 ? 'bg-red-900 text-red-400' :
                                        'bg-yellow-900 text-yellow-400'
                                    }`}>
                                        {item.details.analysis.healthScore}/100
                                    </span>
                                </div>
                                <p className="text-sm text-gray-200 font-medium group-hover:text-emerald-400 transition-colors truncate">
                                    {item.summary}
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

export default PortfolioHealth;
