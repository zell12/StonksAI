
export type ViewState = 'dashboard' | 'analysis' | 'options' | 'screener' | 'portfolio' | 'admin' | 'coffee' | 'subscription';

export interface NavParams {
  ticker?: string;
  outlook?: string;
  autoRun?: boolean;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  type: ViewState;
  summary: string; // e.g., "NVDA Analysis" or "Tech Growth Screen"
  details: any; // The payload to restore
}

export interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  name: string;
  summary: string;
}

export interface MarketSentiment {
  outlook: 'Bullish' | 'Bearish' | 'Neutral';
  score: number; // 0-100
  summary: string;
  keyEvents: string[];
}

export interface OptionsStrategy {
  name: string;
  riskProfile: 'Conservative' | 'Moderate' | 'Aggressive';
  outlook: 'Bullish' | 'Bearish' | 'Neutral' | 'Volatile';
  description: string;
  setup: {
    legs: string[];
    entryPrice: string;
    exitTarget: string;
    stopLoss: string;
    expiry: string;
  };
  greeks: {
    delta: string;
    theta: string;
  };
  rationale: string;
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string;
  price: string;
  catalyst: string;
  score: number;
}

export interface AnalysisResult {
  symbol: string;
  price: string;
  technicalAnalysis: string;
  fundamentalAnalysis: string;
  supportLevels: number[];
  resistanceLevels: number[];
  recommendation: 'Buy' | 'Sell' | 'Hold';
  priceTarget: string;
}

export interface PortfolioAudit {
  healthScore: number;
  riskAssessment: string;
  diversificationStatus: string;
  suggestedHedges: string[];
  actionableMoves: {
    action: 'Buy' | 'Sell' | 'Reduce' | 'Hold';
    asset: string;
    reason: string;
  }[];
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
