import { AnalysisResult, OptionsStrategy, ScreenerResult, PortfolioAudit, MarketSentiment, CandleData } from "../types";

// --- MOCK GENERATORS ---

export const getMockSentiment = (): MarketSentiment => ({
  outlook: 'Bullish',
  score: 78,
  summary: "DEMO MODE: Global markets are showing resilience despite inflation concerns. Tech sector leading the rally driven by AI infrastructure spending.",
  keyEvents: ["Fed Interest Rate Decision Pending", "Tech Earnings Beat Expectations", "Oil Prices Stabilizing"]
});

export const getMockStockAnalysis = (ticker: string): AnalysisResult => ({
  symbol: ticker.toUpperCase(),
  price: "150.25",
  technicalAnalysis: `DEMO ANALYSIS for ${ticker.toUpperCase()}: The stock is currently trading above its 50-day moving average, indicating a bullish trend. RSI is at 62, suggesting there is still room for upside before becoming overbought. MACD has recently crossed over signal line.`,
  fundamentalAnalysis: `DEMO ANALYSIS for ${ticker.toUpperCase()}: Company shows strong revenue growth of 15% YoY. Profit margins are healthy at 22%. Valuation is slightly premium but justified by growth prospects. Debt levels are manageable.`,
  supportLevels: [145.50, 142.00],
  resistanceLevels: [155.00, 160.00],
  recommendation: 'Buy',
  priceTarget: "165.00"
});

export const getMockOptions = (ticker: string, outlook: string): OptionsStrategy[] => ([
  {
    name: "Bull Call Spread",
    riskProfile: "Moderate",
    outlook: "Bullish",
    description: `A vertical spread to capture upside in ${ticker.toUpperCase()} while capping risk.`,
    setup: {
      legs: [`Buy ${ticker.toUpperCase()} 155 Call`, `Sell ${ticker.toUpperCase()} 165 Call`],
      entryPrice: "$2.50 Debit",
      exitTarget: "$4.50",
      stopLoss: "$1.00",
      expiry: "45 Days"
    },
    greeks: { delta: "0.45", theta: "-0.08" },
    rationale: "DEMO: Targets specific upside move with defined risk."
  },
  {
    name: "Cash Secured Put",
    riskProfile: "Conservative",
    outlook: "Neutral",
    description: "Generate income while waiting to buy the dip.",
    setup: {
      legs: [`Sell ${ticker.toUpperCase()} 140 Put`],
      entryPrice: "$1.20 Credit",
      exitTarget: "$0.10",
      stopLoss: "$3.00",
      expiry: "30 Days"
    },
    greeks: { delta: "-0.20", theta: "0.15" },
    rationale: "DEMO: Capitalize on high implied volatility."
  },
  {
    name: "Iron Condor",
    riskProfile: "Aggressive",
    outlook: "Neutral",
    description: "Profit from time decay in a range-bound market.",
    setup: {
      legs: [`Sell 140/160 Strangle`, `Buy 135/165 Wings`],
      entryPrice: "$1.80 Credit",
      exitTarget: "$0.50",
      stopLoss: "$3.00",
      expiry: "30 Days"
    },
    greeks: { delta: "0.02", theta: "0.22" },
    rationale: "DEMO: Profiting from lack of price movement."
  }
]);

export const getMockScreener = (query: string): ScreenerResult[] => ([
  { symbol: "NVDA", name: "NVIDIA Corp", sector: "Technology", price: "$875.20", catalyst: "AI Demand", score: 9.8 },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology", price: "$178.50", catalyst: "New Chip Launch", score: 8.5 },
  { symbol: "MSFT", name: "Microsoft Corp", sector: "Technology", price: "$420.10", catalyst: "Cloud Growth", score: 9.0 },
  { symbol: "PLTR", name: "Palantir Tech", sector: "Technology", price: "$24.50", catalyst: "Gov Contracts", score: 8.2 },
  { symbol: "TSLA", name: "Tesla Inc", sector: "Consumer Cyclical", price: "$175.30", catalyst: "FSD Update", score: 7.9 }
]);

export const getMockPortfolio = (holdings: string): PortfolioAudit => ({
  healthScore: 85,
  riskAssessment: "DEMO AUDIT: Portfolio is well diversified but has high exposure to tech sector volatility. Beta is 1.4, indicating higher volatility than SPY.",
  diversificationStatus: "Moderate Concentration",
  suggestedHedges: ["Buy SPY Puts", "Add Gold/Commodities", "Increase Cash Position"],
  actionableMoves: [
    { action: "Reduce", asset: "Tech Sector", reason: "Overweight allocation > 40%" },
    { action: "Buy", asset: "TLT", reason: "Hedge against equity drawdown" },
    { action: "Hold", asset: "Core Positions", reason: "Long term thesis intact" }
  ]
});

export const getMockCandles = (ticker: string): CandleData[] => {
  const candles: CandleData[] = [];
  let price = 150; 
  // Generate a random walk
  const now = Math.floor(Date.now() / 1000);
  const oneDay = 86400;
  
  for(let i = 100; i >= 0; i--) {
     const volatility = 2;
     const change = (Math.random() - 0.48) * volatility; // Slight upward drift
     const open = price;
     const close = price + change;
     const high = Math.max(open, close) + Math.random() * 1;
     const low = Math.min(open, close) - Math.random() * 1;
     
     candles.push({
         time: now - (i * oneDay),
         open,
         high,
         low,
         close
     });
     price = close;
  }
  return candles;
};

export const getMockPriceSnapshot = (ticker: string) => ({
  snapshot: {
    ticker: ticker.toUpperCase(),
    price: 150.25,
    day_change: 2.50,
    day_change_percent: 1.65,
    source: "DEMO_DATA"
  }
});

export const getMockNews = (ticker: string) => ({
  news: [
    { title: `Analyst Upgrades ${ticker} to Buy`, url: "#", published_at: new Date().toISOString(), source: "Demo News", summary: "Positive outlook based on recent earnings." },
    { title: "Sector Rally Continues", url: "#", published_at: new Date().toISOString(), source: "MarketWatch Demo", summary: "Tech sector showing strength." },
    { title: "New Product Announcement Rumors", url: "#", published_at: new Date().toISOString(), source: "TechCrunch Demo", summary: "Sources say new release is imminent." }
  ]
});

export const getMockFacts = (ticker: string) => ({
    name: `${ticker} Demo Corp`,
    sector: "Technology",
    industry: "Consumer Electronics",
    market_cap: 2500000000000
});

export const getMockMetrics = (ticker: string) => ({
    pe_ratio: 28.5,
    eps: 5.42,
    beta: 1.2
});

export const getMockInsider = (ticker: string) => ({
    trades: [
        { name: "Doe John (CEO)", type: "Buy", shares: 5000, value: 750000, date: "2024-03-15" }
    ]
});