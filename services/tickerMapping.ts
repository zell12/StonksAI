// Static mapping of common company names to their tickers
// This avoids using generative AI for simple entity resolution
export const TICKER_MAP: Record<string, string> = {
  // Tech Giants
  'apple': 'AAPL',
  'microsoft': 'MSFT',
  'google': 'GOOGL',
  'alphabet': 'GOOGL',
  'amazon': 'AMZN',
  'tesla': 'TSLA',
  'meta': 'META',
  'facebook': 'META',
  'netflix': 'NFLX',
  'nvidia': 'NVDA',
  
  // Software / Cloud
  'salesforce': 'CRM',
  'oracle': 'ORCL',
  'adobe': 'ADBE',
  'ibm': 'IBM',
  'intel': 'INTC',
  'amd': 'AMD',
  'uber': 'UBER',
  'airbnb': 'ABNB',
  'palantir': 'PLTR',
  'snowflake': 'SNOW',
  'shopify': 'SHOP',
  'spotify': 'SPOT',
  'crowdstrike': 'CRWD',
  
  // Finance
  'jpmorgan': 'JPM',
  'bank of america': 'BAC',
  'goldman sachs': 'GS',
  'visa': 'V',
  'mastercard': 'MA',
  'berkshire': 'BRK.B',
  'coinbase': 'COIN',
  'microstrategy': 'MSTR',
  'blackrock': 'BLK',
  
  // Retail / Consumer
  'walmart': 'WMT',
  'costco': 'COST',
  'target': 'TGT',
  'starbucks': 'SBUX',
  'nike': 'NKE',
  'disney': 'DIS',
  'coke': 'KO',
  'coca cola': 'KO',
  'pepsi': 'PEP',
  'mcdonalds': 'MCD',
  
  // Auto
  'ford': 'F',
  'gm': 'GM',
  'rivian': 'RIVN',
  
  // Indices (slang)
  'spy': 'SPY',
  'sp500': 'SPY',
  'qqq': 'QQQ',
  'nasdaq': 'QQQ',
  'dow': 'DIA',
  'russell': 'IWM'
};

export const getTickerFromSearch = (input: string): string | null => {
  if (!input) return null;
  const normalized = input.toLowerCase().trim();
  return TICKER_MAP[normalized] || null;
};