import { AnalysisResult, OptionsStrategy, ScreenerResult, PortfolioAudit, CandleData } from '../types';

// Define the shape of the cache for each view
export interface AppCache {
  screener?: {
    query: string;
    results: ScreenerResult[];
  };
  analysis?: {
    ticker: string;
    data: AnalysisResult;
    chartData: CandleData[];
    interval: string;
  };
  options?: {
    ticker: string;
    outlook: string;
    strategies: OptionsStrategy[];
  };
  portfolio?: {
    holdings: string;
    analysis: PortfolioAudit;
  };
}

const CACHE_KEY = 'quantai_session_cache';

// Load the entire cache object from sessionStorage
const getFullCache = (): AppCache => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = sessionStorage.getItem(CACHE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Failed to load session cache", e);
    return {};
  }
};

// Save a specific slice of state
export const saveViewState = <K extends keyof AppCache>(key: K, data: AppCache[K]) => {
  const current = getFullCache();
  current[key] = data;
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(current));
};

// Load a specific slice of state
export const getViewState = <K extends keyof AppCache>(key: K): AppCache[K] | undefined => {
  const current = getFullCache();
  return current[key];
};

// Clear cache (optional, e.g. on logout)
export const clearCache = () => {
  sessionStorage.removeItem(CACHE_KEY);
};