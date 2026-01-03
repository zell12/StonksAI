
import { API_BASE_URL, USE_BACKEND_PROXY } from './config';
import { cacheService, CACHE_TIERS, CacheMeta } from './cacheService';
import { CandleData } from '../types';
import { getMockCandles, getMockPriceSnapshot, getMockFacts, getMockMetrics, getMockNews, getMockInsider } from './mockData';

// Helper to get key from storage or process.env
export const getApiKey = (keyName: string) => {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem(`quantai_api_${keyName}`);
    if (localKey) return localKey;
  }
  return process.env[`${keyName.toUpperCase()}_API_KEY`] || '';
};

const isDemo = () => typeof window !== 'undefined' && localStorage.getItem('quantai_demo_mode') === 'true';

// --- HEADER DEBUG LOGGING UTILITIES ---
const getDebugHeaders = (): HeadersInit => {
   if (typeof window === 'undefined') return {};
   try {
     const userStr = localStorage.getItem('quantai_user');
     const user = userStr ? JSON.parse(userStr) : {};
     return user.superadmin ? { 'X-User-Role': 'superadmin' } : {};
   } catch (e) { return {}; }
};

// Log Backend Response Headers
const logDebugHeaders = (endpoint: string, ticker: string, headers: Headers) => {
   const layer = headers.get('X-Cache-Layer');
   if (layer) {
       const cacheStatus = headers.get('X-Cache');
       const time = headers.get('X-Response-Time') || '0ms';
       const age = headers.get('Age') || '0';
       
       let logString = '';
       let colorStyle = '';

       if (cacheStatus === 'HIT') {
           logString = `⚡ BACKEND HIT from ${layer}`;
           colorStyle = "color: #a7f3d0; font-weight: bold; background: #064e3b; padding: 2px 6px; border-radius: 4px; border: 1px solid #059669;";
       } else {
           logString = `🌐 BACKEND FETCH from ${layer}`;
           colorStyle = "color: #bfdbfe; font-weight: bold; background: #1e3a8a; padding: 2px 6px; border-radius: 4px; border: 1px solid #2563eb;";
       }
       
       console.log(`%c[BACKEND] ${endpoint} - ${ticker} - ${logString} (in ${time}) age: ${age}s`, colorStyle);
   }
};

// Log Local Browser Cache Status
const logClientCache = (endpoint: string, ticker: string, meta: CacheMeta) => {
    let logString = '';
    let colorStyle = '';

    if (meta.hit) {
        logString = `⚡ CLIENT HIT (Age: ${meta.age}s / TTL: ${meta.ttl}s)`;
        colorStyle = "color: #6ee7b7; font-weight: bold; background: #065f46; padding: 2px 6px; border-radius: 4px; border: 1px solid #10b981;";
    } else {
        const reason = meta.reason === 'MISSING' ? 'NOT FOUND' : meta.reason;
        // Updated to remove X and add context
        logString = `📡 CLIENT MISS (${reason}) → Fetching Backend...`;
        colorStyle = "color: #fdba74; font-weight: bold; background: #7c2d12; padding: 2px 6px; border-radius: 4px; border: 1px solid #ea580c;";
    }

    console.log(`%c[BROWSER] ${endpoint} - ${ticker} - ${logString}`, colorStyle);
};

// Tickers available for free tier users
export const FREE_TIER_TICKERS = ['GOOGL', 'NVDA', 'BRK.B', 'AAPL', 'TSLA', 'MSFT'];

// --- CORE FETCH HELPER FOR FINANCIAL DATASETS (Fundamentals & Technicals) ---
const fetchFromFinancialDatasets = async (endpoint: string, params: Record<string, string>) => {
  const apiKey = getApiKey('financial_datasets');
  
  let url = '';
  const requestOptions: RequestInit = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };

  if (USE_BACKEND_PROXY) {
    // PROXY MODE (Solves CORS)
    const queryParams = new URLSearchParams({ endpoint: endpoint, ...params }).toString();
    url = `${API_BASE_URL}/financial-datasets-proxy?${queryParams}`;
    requestOptions.headers = { ...requestOptions.headers, ...getDebugHeaders() };
  } else {
    // DIRECT MODE
    const queryParams = new URLSearchParams({ ...params, apikey: apiKey }).toString();
    url = `https://api.financialdatasets.ai/${endpoint}?${queryParams}`;
  }

  try {
    const response = await fetch(url, requestOptions);
    
    if (USE_BACKEND_PROXY) {
        logDebugHeaders(endpoint, params.ticker || 'GLOBAL', response.headers);
    }

    if (!response.ok) {
       console.warn(`[FinancialDatasets] Failed to fetch ${endpoint} (Status: ${response.status}). Returning error.`);
       return { error: `Data unavailable (Status: ${response.status})` };
    }
    const json = await response.json();
    return json;
  } catch (error: any) {
    console.warn(`[FinancialData] Error fetching ${endpoint}:`, error);
    return { error: "Data unavailable due to network/CORS restriction." };
  }
};

// --- PRICE DATA HELPERS (Polygon & Twelve Data) ---

const fetchPolygonPrice = async (ticker: string) => {
  const apiKey = getApiKey('polygon');
  
  let url = '';
  const options: RequestInit = { method: 'GET' };

  if (USE_BACKEND_PROXY) {
    url = `${API_BASE_URL}/polygon/prev?symbol=${ticker}`;
    options.headers = getDebugHeaders();
  } else {
    if (!apiKey) throw new Error("Missing Polygon API Key");
    url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${apiKey}`;
  }
  
  const response = await fetch(url, options);
  
  if (USE_BACKEND_PROXY) {
     logDebugHeaders('polygon/prev', ticker, response.headers);
  }

  if (!response.ok) throw new Error(`Polygon Error: ${response.statusText}`);
  
  const data = await response.json();
  if (data.results && data.results.length > 0) {
    const res = data.results[0];
    return {
      price: res.c,
      change: res.c - res.o,
      percent_change: ((res.c - res.o) / res.o) * 100,
      source: 'Polygon.io (Prev Close)'
    };
  }
  throw new Error("No data from Polygon");
};

const fetchTwelveDataPrice = async (ticker: string) => {
  const apiKey = getApiKey('twelve_data');

  let url = '';
  const options: RequestInit = { method: 'GET' };

  if (USE_BACKEND_PROXY) {
    url = `${API_BASE_URL}/twelvedata/quote?symbol=${ticker}`;
    options.headers = getDebugHeaders();
  } else {
    if (!apiKey) throw new Error("Missing TwelveData API Key");
    url = `https://api.twelvedata.com/quote?symbol=${ticker}&apikey=${apiKey}`;
  }
  
  const response = await fetch(url, options);

  if (USE_BACKEND_PROXY) {
     logDebugHeaders('twelvedata/quote', ticker, response.headers);
  }

  if (!response.ok) throw new Error(`TwelveData Error: ${response.statusText}`);
  
  const data = await response.json();
  if (!data.close) throw new Error(data.message || "No data from TwelveData");
  
  return {
    price: parseFloat(data.close),
    change: parseFloat(data.change),
    percent_change: parseFloat(data.percent_change),
    source: 'Twelve Data (Quote)'
  };
};

// --- NEWS DATA HELPER (NewsAPI) ---

const fetchNewsAPI = async (ticker: string) => {
  const apiKey = getApiKey('news_api');

  let url = '';
  const options: RequestInit = { method: 'GET' };
  
  if (USE_BACKEND_PROXY) {
     url = `${API_BASE_URL}/news?symbol=${ticker}`;
     options.headers = getDebugHeaders();
  } else {
     if (!apiKey) throw new Error("Missing NewsAPI Key");
     url = `https://newsapi.org/v2/everything?q=${ticker}&sortBy=publishedAt&language=en&apiKey=${apiKey}`;
  }

  const response = await fetch(url, options);

  if (USE_BACKEND_PROXY) {
     logDebugHeaders('news', ticker, response.headers);
  }

  if (!response.ok) throw new Error(`NewsAPI Error: ${response.statusText}`);
  
  const data = await response.json();
  
  // Backend Proxy returns { news: [...] } (Optimized)
  // Direct API returns { articles: [...] } (Raw)
  return data.news || data.articles || [];
};

// --- EXPORTED AGENT TOOLS WITH CACHING ---
export const getQandleData = async (ticker: string) => {
  if (isDemo()) return null; 

  const symbol = ticker.toUpperCase();
  const cacheKey = `qandle_${symbol}`;
  const { data: cached, meta } = cacheService.getWithMeta(cacheKey);
  
  logClientCache('qandle', symbol, meta);

  if (cached) return cached;

  const apiKey = getApiKey('qandle');
  let url = '';
  const headers: any = {};

  if (USE_BACKEND_PROXY) {
    url = `${API_BASE_URL}/qandle/asset?symbol=${symbol}`;
    Object.assign(headers, getDebugHeaders());
  } else {
    url = `https://api.qandle.ai/asset?symbol=${symbol}`;
    headers['x-api-key'] = apiKey;
  }

  try {
    const response = await fetch(url, { method: 'GET', headers });
    
    if (USE_BACKEND_PROXY) {
        logDebugHeaders('qandle/asset', symbol, response.headers);
    }

    if (!response.ok) throw new Error(`Qandle Error: ${response.statusText}`);
    
    const data = await response.json();
    cacheService.set(cacheKey, data, CACHE_TIERS.MEDIUM_TERM);
    return data;
  } catch (e) {
    console.warn("Qandle Fetch Failed:", e);
    return null;
  }
};


export const getCompanyFacts = async (ticker: string) => {
  if (isDemo()) return getMockFacts(ticker);

  const symbol = ticker.toUpperCase();
  const cacheKey = `facts_${symbol}`;
  const { data: cached, meta } = cacheService.getWithMeta(cacheKey);

  logClientCache('company/facts', symbol, meta);

  if (cached) return cached;

  const data = await fetchFromFinancialDatasets('company/facts', { ticker: symbol });
  
  if (data && !data.error) {
    cacheService.set(cacheKey, data, CACHE_TIERS.WEEKLY);
  }
  return data;
};

export const getStockPriceSnapshot = async (ticker: string) => {
  if (isDemo()) return getMockPriceSnapshot(ticker);

  const symbol = ticker.toUpperCase();
  const cacheKey = `price_${symbol}`;
  const { data: cached, meta } = cacheService.getWithMeta(cacheKey);

  logClientCache('price_snapshot', symbol, meta);

  if (cached) return cached;

  let result = null;

  // 1. Try Twelve Data (Preferred for "Quote")
  try {
    const td = await fetchTwelveDataPrice(symbol);
    result = {
      snapshot: {
        ticker: symbol,
        price: td.price,
        day_change: td.change,
        day_change_percent: td.percent_change,
        source: td.source
      }
    };
  } catch (e) {
    console.warn(`⚠️ [Price Fetch] TwelveData failed:`, e);
  }

  // 2. Try Polygon (Fallback)
  if (!result) {
    try {
      const poly = await fetchPolygonPrice(symbol);
      result = {
        snapshot: {
          ticker: symbol,
          price: poly.price,
          day_change: poly.change,
          day_change_percent: poly.percent_change,
          source: poly.source
        }
      };
    } catch (e) {
      console.error("❌ [Price Fetch] All sources failed", e);
      throw new Error("Unable to fetch real-time price from Polygon or TwelveData.");
    }
  }

  // Cache successful price result
  if (result) {
    cacheService.set(cacheKey, result, CACHE_TIERS.IMMEDIATE);
  }
  return result;
};

export const getFinancialMetricsSnapshot = async (ticker: string) => {
  if (isDemo()) return getMockMetrics(ticker);

  const symbol = ticker.toUpperCase();
  const cacheKey = `metrics_${symbol}`;
  const { data: cached, meta } = cacheService.getWithMeta(cacheKey);

  logClientCache('financial-metrics/snapshot', symbol, meta);

  if (cached) return cached;

  const data = await fetchFromFinancialDatasets('financial-metrics/snapshot', { ticker: symbol });
  
  if (data && !data.error) {
     cacheService.set(cacheKey, data, CACHE_TIERS.LONG_TERM);
  }
  return data;
};

export const getInsiderTrades = async (ticker: string) => {
  if (isDemo()) return getMockInsider(ticker);

  const symbol = ticker.toUpperCase();
  const cacheKey = `insider_${symbol}`;
  const { data: cached, meta } = cacheService.getWithMeta(cacheKey);

  logClientCache('insider-trades', symbol, meta);

  if (cached) return cached;

  const data = await fetchFromFinancialDatasets('insider-trades', { ticker: symbol, limit: '10' });

  if (data && !data.error) {
     cacheService.set(cacheKey, data, CACHE_TIERS.WEEKLY);
  }
  return data;
};

export const getCompanyNews = async (ticker: string) => {
  if (isDemo()) return getMockNews(ticker);

  const symbol = ticker.toUpperCase();
  const cacheKey = `news_${symbol}`;
  const { data: cached, meta } = cacheService.getWithMeta(cacheKey);

  logClientCache('news', symbol, meta);

  if (cached) return cached;

  let rawArticles: any[] = [];

  // 1. Try NewsAPI (Primary)
  try {
    rawArticles = await fetchNewsAPI(symbol);
  } catch (e) {
    console.warn("NewsAPI failed, will try fallback.", e);
  }

  // 2. Fallback to FinancialDatasets if NewsAPI failed or returned nothing
  if (!rawArticles || rawArticles.length === 0) {
    if (rawArticles && rawArticles.length === 0) {
        console.warn(`[News] Primary source returned 0 articles for ${symbol}. Triggering fallback.`);
    }
    
    const fdData = await fetchFromFinancialDatasets('news', { ticker: symbol, limit: '20' });
    if (fdData && !fdData.error && fdData.news) {
        // Normalize FD structure to match NewsAPI roughly for processing
        rawArticles = fdData.news.map((n: any) => ({
            title: n.title,
            source: { name: n.source },
            publishedAt: n.published_at,
            description: n.summary,
            url: n.url
        }));
    }
  }

  // 3. Optimization Pipeline
  // DETECT: If the backend already optimized the data, it will have 'headline' instead of 'title'.
  // We return the top 20 optimized stories directly.
  if (rawArticles.length > 0 && rawArticles[0].headline && !rawArticles[0].title) {
      // Data is already optimized by Backend Proxy (news: [...])
      const newsData = { news: rawArticles.slice(0, 50) };
      cacheService.set(cacheKey, newsData, CACHE_TIERS.SHORT_TERM);
      return newsData;
  }

  // If we are here, the data is RAW (Direct Mode or Fallback). We must optimize it.
  const uniqueTitles = new Set();
  const optimizedNews = [];

  for (const a of (rawArticles || [])) {
      if (!a.title || a.title === '[Removed]') continue;
      
      // Basic fuzzy dedup (exact match)
      if (uniqueTitles.has(a.title)) continue;
      uniqueTitles.add(a.title);

      optimizedNews.push({
          headline: a.title,
          outlet: a.source?.name || 'Unknown',
          date: a.publishedAt ? a.publishedAt : 'N/A', // Compact Date
          // Prioritize description, fallback to content, hard cap at 200 chars
          summary: (a.description || a.content || '').substring(0, 200).replace(/[\r\n]+/g, ' ').trim()
      });

      if (optimizedNews.length >= 50) break; // Increased Limit for better AI Context
  }

  const newsData = { news: optimizedNews };

  if (optimizedNews.length > 0) {
      cacheService.set(cacheKey, newsData, CACHE_TIERS.SHORT_TERM);
  }
  return newsData;
};

// --- AGGREGATE FUNCTIONS ---

export const fetchHistoricalData = async (symbol: string, interval: string = '1d'): Promise<CandleData[]> => {
  if (isDemo()) {
      return new Promise(resolve => setTimeout(() => resolve(getMockCandles(symbol)), 800));
  }

  const ticker = symbol.toUpperCase();
  // V2 Cache Key forces refresh for new sorting logic
  const cacheKey = `history_v2_${ticker}_${interval}`;
  
  const { data: cached, meta } = cacheService.getWithMeta<CandleData[]>(cacheKey);
  logClientCache(`polygon/aggs/${interval}`, ticker, meta);

  if (cached) return cached;

  const apiKey = getApiKey('polygon');
  const today = new Date();
  const priorDate = new Date();
  
  let multiplier = 1;
  let timespan = 'day';

  if (interval === '15m') { multiplier = 15; timespan = 'minute'; priorDate.setDate(today.getDate() - 10); } 
  else if (interval === '1h') { multiplier = 1; timespan = 'hour'; priorDate.setDate(today.getDate() - 60); } 
  else { priorDate.setDate(today.getDate() - 730); }

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const from = formatDate(priorDate);
  const to = formatDate(today);

  let url = '';
  const options: RequestInit = { method: 'GET' };

  if (USE_BACKEND_PROXY) {
      url = `${API_BASE_URL}/polygon/aggs?ticker=${ticker}&multiplier=${multiplier}&timespan=${timespan}&from=${from}&to=${to}`;
      options.headers = getDebugHeaders();
  } else {
      if (!apiKey) return [];
      // CHANGED: sort=desc to get NEWEST data first. This solves the "missing recent bars" issue.
      url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=desc&limit=${5000}&apiKey=${apiKey}`;
  }
  
  try {
    const response = await fetch(url, options);
    
    if (USE_BACKEND_PROXY) {
        logDebugHeaders('polygon/aggs', ticker, response.headers);
    }

    if (!response.ok) {
       throw new Error(`Polygon API Error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const formattedData = data.results.map((d: any) => ({
        time: d.t / 1000, 
        open: d.o, high: d.h, low: d.l, close: d.c,
        volume: d.v 
      }));
      
      // CRITICAL: API returns DESC (Newest First). Chart needs ASC (Oldest First).
      // We reverse the array before caching and returning.
      formattedData.reverse();

      cacheService.set(cacheKey, formattedData, CACHE_TIERS.SHORT_TERM);
      return formattedData;
    }
    
    return []; 

  } catch (e) {
    console.error("Error fetching historical data:", e);
    return [];
  }
};

export const getPolygonHistoryContext = async (ticker: string) => {
    // Reuse existing fetch logic, get last 30 daily bars
    const history = await fetchHistoricalData(ticker, '1d');
    if (!history || history.length === 0) return null;

    // Return the last 30 days formatted compact for AI Context
    const recent = history.slice(-30);
    return {
        description: "Daily OHLC Bars (Last 30 Days)",
        data: recent.map(c => ({
            d: new Date(Number(c.time) * 1000).toISOString().split('T')[0],
            o: c.open,
            h: c.high,
            l: c.low,
            c: c.close,
            v: c.volume // Provide volume to AI as well
        }))
    };
}
