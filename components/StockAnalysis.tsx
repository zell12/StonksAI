
import React, { useState, useEffect, useRef } from 'react';
import { analyzeStock } from '../services/gemini';
import { AnalysisResult, ViewState, HistoryItem, CandleData } from '../types';
import { FREE_TIER_TICKERS, fetchHistoricalData } from '../services/financialData';
import { calculateSupportResistance } from '../services/technicalAnalysis';
import { getTickerFromSearch } from '../services/tickerMapping';
import { addXP } from '../services/gamification';
import { checkUsageLimit, incrementUsage } from '../services/usageService';
import { saveViewState, getViewState } from '../services/stateCache';
import { getModuleHistory, addToHistory, clearModuleHistory } from '../services/history';
import { getSystemConfig } from '../services/userService';
import { handleAndLogError, FriendlyError } from '../services/errorLogging';
import { Search, TrendingUp, Target, Shield, AlertCircle, ScanLine, Microscope, Activity, Lock, CreditCard, CheckCircle, Radar, History, X, Clock, ArrowRight, Layers, Undo2, Sparkles, Coffee, Heart, RefreshCw, AlertTriangle } from 'lucide-react';
import { createChart, ColorType, CrosshairMode, IChartApi, CandlestickSeries, LineStyle, ISeriesApi } from 'lightweight-charts';
import CompanyLogo from './CompanyLogo';
import LimitReachedModal from './LimitReachedModal';

interface StockAnalysisProps {
  initialTicker?: string;
  autoRun?: boolean;
  onNavigate?: (view: ViewState, params?: any) => void;
}

const StockAnalysis: React.FC<StockAnalysisProps> = ({ initialTicker, autoRun, onNavigate }) => {
  const [ticker, setTicker] = useState(initialTicker || '');
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New Error State
  const [errorState, setErrorState] = useState<FriendlyError | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  const [interval, setChartInterval] = useState('1d');
  const [restored, setRestored] = useState(false);
  
  // System State
  const [isBetaActive, setIsBetaActive] = useState(true);
  
  // Auto-correct state
  const [correction, setCorrection] = useState<{original: string, applied: string} | null>(null);
  
  // History UI State
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Chart Refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<any[]>([]);

  // Monetization & Donation State
  const [isPro, setIsPro] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [pendingTicker, setPendingTicker] = useState('');

  // Initial Logic (AutoRun or Restore)
  useEffect(() => {
    // Load System Config
    const fetchConfig = async () => {
        const config = await getSystemConfig();
        setIsBetaActive(config.beta_active);
    };
    fetchConfig();

    // 1. If autoRun is true and we have a ticker (coming from Pipeline)
    if (autoRun && initialTicker) {
        handleSearch(null, initialTicker);
    } 
    // 2. Otherwise try to restore from cache
    else {
        const cached = getViewState('analysis');
        if (cached) {
            setTicker(cached.ticker);
            setData(cached.data);
            setChartData(cached.chartData);
            setChartInterval(cached.interval);
            setRestored(true);
        }
    }
    
    // Load History
    setHistoryItems(getModuleHistory('analysis'));
  }, [initialTicker, autoRun]);

  // Loading Animation State
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Triangulating Price Data...",
    "Decrypting Technical Patterns...",
    "Scanning Support/Resistance Zones...",
    "Parsing SEC Filings...",
    "Detecting Dark Pool Volume...",
    "Evaluating Analyst Consensus...",
    "Generating Price Targets..."
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

  useEffect(() => {
    // Check if user has "Pro" (Mock persistence - legacy logic)
    const proStatus = localStorage.getItem('quantai_pro_status');
    if (proStatus === 'true') setIsPro(true);
  }, []);

  // Fetch chart data when interval changes
  useEffect(() => {
    if (data && ticker && !restored) {
      const loadChartData = async () => {
         const history = await fetchHistoricalData(ticker, interval);
         setChartData(history);
         // Update Cache with new chart data
         saveViewState('analysis', { ticker, data, chartData: history, interval });
      };
      loadChartData();
    } else if (restored) {
        setRestored(false);
    }
  }, [interval]);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) return;

    // Dispose old chart if it exists
    if (chartRef.current) {
        try {
            chartRef.current.remove();
        } catch(e) {}
    }

    // Create Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0b0f19' }, // Matches bg-gray-950
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true, // Needed for intraday
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candlestickSeries.setData(chartData as any);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        // Use try-catch to prevent "Object is disposed" errors during rapid resizes/unmounts
        try {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        } catch (e) {
            // Chart already disposed, ignore
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        chart.remove();
      } catch (e) {
        // Ignore if already removed
      }
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [chartData]); // Re-create chart when basic data changes

  // Update Price Lines (Support/Resistance/Current)
  useEffect(() => {
    if (!seriesRef.current || !data) return;

    // Clear existing price lines
    priceLinesRef.current.forEach(line => {
        try {
            seriesRef.current?.removePriceLine(line);
        } catch (e) {}
    });
    priceLinesRef.current = [];

    // 1. Add Current Price Line (Distinct Style: Solid Blue)
    const currentPrice = parseFloat(data.price.replace(/[^0-9.]/g, ''));
    if (!isNaN(currentPrice)) {
       const line = seriesRef.current?.createPriceLine({
           price: currentPrice,
           color: '#3b82f6', // Blue
           lineWidth: 2,
           lineStyle: LineStyle.Solid,
           axisLabelVisible: true,
           title: 'CURRENT',
       });
       if(line) priceLinesRef.current.push(line);
    }

    // 2. Add Support Levels (Green Dashed) - Max 2
    if (data.supportLevels) {
        data.supportLevels.slice(0, 2).forEach((level, i) => {
            const line = seriesRef.current?.createPriceLine({
                price: level,
                color: '#10b981', // Emerald
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: `S${i+1}`,
            });
            if(line) priceLinesRef.current.push(line);
        });
    }

    // 3. Add Resistance Levels (Red Dashed) - Max 2
    if (data.resistanceLevels) {
        data.resistanceLevels.slice(0, 2).forEach((level, i) => {
            const line = seriesRef.current?.createPriceLine({
                price: level,
                color: '#ef4444', // Red
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: `R${i+1}`,
            });
            if(line) priceLinesRef.current.push(line);
        });
    }

  }, [data, chartData]);

  const performAnalysis = async (tickerSymbol: string) => {
    
    // --- 1. CHECK USAGE LIMIT ---
    const usageCheck = await checkUsageLimit('analysis');
    if (!usageCheck.allowed) {
        setShowLimitModal(true);
        return;
    }

    setLoading(true);
    setErrorState(null);
    setData(null);
    setChartData([]);
    setShowDonationModal(false);
    setRestored(false);
    setShowHistory(false);
    
    try {
      // Parallel execution: Analysis + Chart Data
      const [aiResult, historyResult] = await Promise.all([
        analyzeStock(tickerSymbol),
        fetchHistoricalData(tickerSymbol, interval)
      ]);

      // --- ALGORITHMIC ENHANCEMENT ---
      // We calculate rigorous S/R levels locally to avoid hallucinations
      const { supports, resistances } = calculateSupportResistance(historyResult);
      
      const mergedData: AnalysisResult = {
          ...aiResult,
          supportLevels: supports,
          resistanceLevels: resistances
      };

      setData(mergedData);
      setChartData(historyResult);
      
      // --- 2. INCREMENT USAGE ON SUCCESS ---
      await incrementUsage('analysis');

      // Cache Result
      saveViewState('analysis', { 
          ticker: tickerSymbol, 
          data: mergedData, 
          chartData: historyResult, 
          interval 
      });

      // Save History
      addToHistory('analysis', tickerSymbol, {
          ticker: tickerSymbol, 
          data: mergedData, 
          chartData: historyResult, 
          interval 
      });
      setHistoryItems(getModuleHistory('analysis'));
      
      // AWARD XP
      addXP(50);
      
    } catch (err: any) {
      // Extract model used from error object if available
      const friendlyError = await handleAndLogError('StockAnalysis', err, { ticker: tickerSymbol }, err.modelUsed);
      setErrorState(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent | null, overrideTicker?: string) => {
    if (e) e.preventDefault();
    
    let searchInput = overrideTicker || ticker;
    if (!searchInput.trim()) return;
    
    setCorrection(null); // Reset prev correction
    
    // --- GENTLE AUTO-CORRECT ---
    const mappedTicker = getTickerFromSearch(searchInput);
    
    // If a match is found AND it's different from what was typed (case-insensitive check to avoid looping AAPL->AAPL)
    if (mappedTicker && mappedTicker !== searchInput.toUpperCase()) {
        setCorrection({ original: searchInput, applied: mappedTicker });
        searchInput = mappedTicker;
        setTicker(mappedTicker); // Update UI
    }

    const cleanTicker = searchInput.trim().toUpperCase();
    const isDemo = localStorage.getItem('quantai_demo_mode') === 'true';

    // --- 1. PRE-CHECK USAGE LIMIT ---
    // We check this BEFORE showing the Donation Modal. 
    // If the user has 0 usage left, they should hit the limit wall, not the premium ticker wall.
    const usageCheck = await checkUsageLimit('analysis');
    if (!usageCheck.allowed) {
        setShowLimitModal(true);
        return;
    }

    // --- 2. BETA MODE "PREMIUM TICKER" SOFT PAYWALL ---
    // Only show if Beta is Active, Not Demo, Not Pro (Legacy), and it's a Non-Free Ticker
    if (isBetaActive && !isDemo && !isPro && !FREE_TIER_TICKERS.includes(cleanTicker)) {
      setPendingTicker(cleanTicker);
      setShowDonationModal(true);
      return;
    }

    performAnalysis(cleanTicker);
  };
  
  const revertCorrection = () => {
    if (!correction) return;
    const original = correction.original;
    setTicker(original);
    setCorrection(null);
  };

  const handleRestoreHistory = (item: HistoryItem) => {
     setTicker(item.details.ticker);
     setData(item.details.data);
     setChartData(item.details.chartData);
     setChartInterval(item.details.interval);
     setRestored(true);
     setShowHistory(false);
     setCorrection(null);
     setErrorState(null);
  };

  const handleDonationAction = (donate: boolean) => {
      if (donate) {
          // Open internal donation page in new tab via deep link
          window.open(`${window.location.origin}?view=coffee`, '_blank');
      }
      performAnalysis(pendingTicker);
  };

  const timeframes = [
      { label: '15m', val: '15m' },
      { label: '1H', val: '1h' },
      { label: '1D', val: '1d' },
  ];

  return (
    <div className="max-w-5xl mx-auto relative pb-20">
      
      {/* LIMIT MODAL */}
      {showLimitModal && (
          <LimitReachedModal 
             moduleName="Deep Dive Analysis" 
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

      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-4 uppercase tracking-widest">
           <Microscope size={14} /> Market X-Ray
        </div>
        <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Deep Dive Scanner</h2>
        <p className="text-gray-400">
           {isPro ? "Pro Analyst Access Active" : `Free Tier Access: ${FREE_TIER_TICKERS.join(', ')}`}
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-12">
        <form onSubmit={(e) => handleSearch(e)} className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-violet-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
          <div className="relative flex">
            <div className="absolute left-5 top-4 text-gray-500 group-focus-within:text-emerald-400 transition-colors">
               <Search size={24} />
            </div>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="ENTER TICKER OR NAME (e.g. Apple)..."
              className="w-full bg-gray-900 border border-gray-700 text-white pl-14 pr-36 py-4 rounded-2xl focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-xl font-bold placeholder:font-medium placeholder:text-gray-600"
            />
            <button
              type="submit"
              disabled={loading || !ticker}
              className="absolute right-2 top-2 bottom-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20 hover:shadow-emerald-500/40 active:scale-95"
            >
              {loading ? 'Scanning...' : 'Analyze'}
            </button>
          </div>
        </form>
        
        {/* Gentle Auto-Correct UI */}
        {correction && (
            <div className="mt-3 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
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

      {/* Donation / Soft Paywall Modal */}
      {showDonationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#0b0f19] border border-orange-500/30 rounded-3xl p-8 max-w-md w-full relative overflow-hidden shadow-2xl shadow-orange-500/10">
             {/* Decorative Background */}
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-500"></div>
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl"></div>
             
             <div className="text-center mb-6 relative z-10">
                <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-700 shadow-[0_0_30px_-5px_rgba(245,158,11,0.2)]">
                   <Coffee className="text-orange-400" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">High-Cost Data Query</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                   Analyzing <span className="font-bold text-white bg-gray-800 px-1.5 py-0.5 rounded">{pendingTicker}</span> requires premium API calls that cost real money.
                </p>
                <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                   Since you're in the Beta, we've unlocked this for you! If you find StonksAI valuable, please consider fueling the algo to keep the servers running.
                </p>
             </div>
             
             <div className="space-y-3 relative z-10">
                 <button 
                    onClick={() => handleDonationAction(true)}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] group"
                 >
                    <Heart size={20} className="fill-white/20 group-hover:fill-white/40 transition-colors" />
                    Donate & Analyze
                 </button>
                 <button 
                    onClick={() => handleDonationAction(false)}
                    className="w-full py-3 text-sm font-semibold text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
                 >
                    Skip & Run Analysis <ArrowRight size={14} />
                 </button>
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
                    <button onClick={() => performAnalysis(ticker)} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                        <RefreshCw size={14} /> Retry
                    </button>
                    <button onClick={() => setErrorState(null)} className="text-red-400 hover:text-white px-4 py-2 text-sm font-medium">
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
      )}

      {loading && (
        <div className="w-full bg-[#0b0f19] border border-gray-800 rounded-3xl p-12 relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center group">
            {/* ... Loading SVG ... */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0f19]/80 to-[#0b0f19]"></div>
            <div className="relative z-10 mb-10">
                <div className="w-32 h-32 bg-gray-900/50 backdrop-blur-sm rounded-full border border-gray-700 flex items-center justify-center relative shadow-[0_0_60px_-10px_rgba(16,185,129,0.3)]">
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping"></div>
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500 shadow-[0_0_20px_#10b981] animate-[scan_2s_linear_infinite]"></div>
                    <ScanLine size={48} className="text-emerald-400 relative z-10" />
                </div>
            </div>
            <div className="relative z-10 text-center space-y-4 max-w-md mx-auto">
                <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight mb-1">Deep Scan in Progress</h3>
                    <p className="text-gray-500 text-xs uppercase tracking-widest font-mono">Quantum Processing...</p>
                </div>
                <div className="bg-gray-900/80 border border-gray-800 rounded-lg py-2 px-4 inline-block min-w-[300px]">
                    <span className="text-emerald-400 font-mono text-sm flex items-center justify-center gap-2">
                       <Radar size={14} className="animate-spin" />
                       {loadingMessages[loadingStep]}
                    </span>
                </div>
            </div>
            <div className="absolute bottom-10 flex gap-1 items-end h-8">
               {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="w-1 bg-emerald-500/30 rounded-full animate-[bounce_1s_infinite]" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
               ))}
            </div>
        </div>
      )}

      {data && !showDonationModal && (
        <div className={`space-y-6 ${!restored ? 'animate-in fade-in slide-in-from-bottom-8 duration-700' : ''}`}>
          {/* Header Card - Holographic Style */}
          <div className="relative bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <CompanyLogo symbol={data.symbol} size="lg" className="shadow-lg shadow-emerald-500/10" />
                  <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter">{data.symbol}</h1>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider border ${
                        data.recommendation === 'Buy' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                        data.recommendation === 'Sell' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}>
                        {data.recommendation}
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                   <p className="text-gray-400 font-medium">Consensus Price:</p> 
                   <span className="text-white font-mono text-3xl font-bold text-glow">{data.price}</span>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-8 bg-black/40 p-4 rounded-2xl border border-gray-800">
                    <div className="text-right">
                    <p className="text-gray-500 text-xs font-bold uppercase mb-1 tracking-wider">Target</p>
                    <p className="text-2xl font-bold text-emerald-400 flex items-center gap-2 justify-end font-mono">
                        <Target size={20} />
                        {data.priceTarget}
                    </p>
                    </div>
                </div>
                {restored && (
                     <div className="text-xs text-gray-500 flex items-center gap-1">
                         <History size={12} /> Cached Analysis
                     </div>
                )}
                
                {/* PIPELINE NAVIGATION BUTTON */}
                {onNavigate && (
                    <button 
                        onClick={() => onNavigate('options', { 
                            ticker: data.symbol, 
                            outlook: data.recommendation === 'Buy' ? 'Bullish' : data.recommendation === 'Sell' ? 'Bearish' : 'Neutral' 
                        })}
                        className="mt-2 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-900/20 transition-all hover:scale-105"
                    >
                        <TrendingUp size={16} /> Forge Strategy (Phase 3) <ArrowRight size={16} />
                    </button>
                )}
              </div>
            </div>
          </div>

          {/* Lightweight Chart Section */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-6 backdrop-blur">
             <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h3 className="text-gray-200 font-bold flex items-center gap-2">
                   <Activity size={18} className="text-violet-500" /> Price Action & Key Levels
                </h3>
                
                <div className="flex items-center gap-4">
                  <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-800">
                    {timeframes.map((tf) => (
                      <button
                        key={tf.val}
                        onClick={() => setChartInterval(tf.val)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          interval === tf.val 
                          ? 'bg-gray-800 text-white shadow' 
                          : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
             </div>
             
             {/* Chart Overlay for No Data */}
             <div className="relative w-full h-[350px]">
                 {chartData.length === 0 ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 border border-gray-800/50 rounded-lg backdrop-blur-sm z-10">
                         <div className="bg-gray-900 p-4 rounded-full border border-gray-800 mb-3">
                             <AlertTriangle className="text-gray-500" size={24} />
                         </div>
                         <p className="text-gray-400 font-bold text-sm">Market Data Unavailable</p>
                         <p className="text-gray-600 text-xs mt-1">This timeframe may be restricted by the API.</p>
                     </div>
                 ) : null}
                 <div ref={chartContainerRef} className="w-full h-full rounded-lg overflow-hidden border border-gray-800/50"></div>
             </div>
             
             {/* Support & Resistance Pills */}
             <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3">
                   <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
                       <Layers size={18} />
                   </div>
                   <div>
                       <h4 className="text-emerald-400 text-xs font-bold uppercase mb-2 tracking-wide">Support Zones</h4>
                       <div className="flex gap-2 flex-wrap">
                           {data.supportLevels && data.supportLevels.length > 0 ? (
                               data.supportLevels.slice(0, 2).map((l, i) => (
                                   <span key={i} className="bg-emerald-500/10 text-emerald-300 px-2 py-1 rounded text-xs font-mono border border-emerald-500/20">${l}</span>
                               ))
                           ) : <span className="text-gray-500 text-xs italic">No levels detected</span>}
                       </div>
                   </div>
                </div>
                <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                   <div className="bg-red-500/10 p-2 rounded-lg text-red-400">
                       <Layers size={18} />
                   </div>
                   <div>
                       <h4 className="text-red-400 text-xs font-bold uppercase mb-2 tracking-wide">Resistance Zones</h4>
                       <div className="flex gap-2 flex-wrap">
                           {data.resistanceLevels && data.resistanceLevels.length > 0 ? (
                               data.resistanceLevels.slice(0, 2).map((l, i) => (
                                   <span key={i} className="bg-red-500/10 text-red-300 px-2 py-1 rounded text-xs font-mono border border-red-500/20">${l}</span>
                               ))
                           ) : <span className="text-gray-500 text-xs italic">No levels detected</span>}
                       </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-8 hover:border-emerald-500/30 transition-colors group">
               <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2 text-lg">
                 <TrendingUp size={24} className="group-hover:scale-110 transition-transform" />
                 Technical Outlook
               </h3>
               <p className="text-gray-300 leading-relaxed text-sm font-medium">
                 {data.technicalAnalysis}
               </p>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-8 hover:border-blue-500/30 transition-colors group">
               <h3 className="text-blue-400 font-bold mb-4 flex items-center gap-2 text-lg">
                 <Shield size={24} className="group-hover:scale-110 transition-transform" />
                 Fundamental Health
               </h3>
               <p className="text-gray-300 leading-relaxed text-sm font-medium">
                 {data.fundamentalAnalysis}
               </p>
            </div>
          </div>
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
                        Analysis History
                    </h3>
                    <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                <div className="space-y-3">
                    {historyItems.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">No analysis history.</p>
                    ) : (
                        historyItems.map((item) => (
                            <div 
                                key={item.id}
                                onClick={() => handleRestoreHistory(item)}
                                className="p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 cursor-pointer group transition-colors"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <CompanyLogo symbol={item.details.ticker} size="sm" />
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Clock size={10} />
                                            {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        item.details.data.recommendation === 'Buy' ? 'bg-emerald-900 text-emerald-400' :
                                        item.details.data.recommendation === 'Sell' ? 'bg-red-900 text-red-400' :
                                        'bg-gray-800 text-gray-300'
                                    }`}>
                                        {item.details.data.recommendation}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-200 font-bold group-hover:text-emerald-400 transition-colors mt-2">
                                    {item.summary}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                    {item.details.data.priceTarget} Target
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

export default StockAnalysis;
