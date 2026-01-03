import { HistoryItem, ViewState } from '../types';

const HISTORY_KEY = 'quantai_history_log';

const getHistoryLog = (): HistoryItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const getModuleHistory = (type: ViewState): HistoryItem[] => {
  const allHistory = getHistoryLog();
  return allHistory.filter(h => h.type === type).sort((a, b) => b.timestamp - a.timestamp);
};

export const addToHistory = (type: ViewState, summary: string, details: any) => {
  const allHistory = getHistoryLog();
  
  const newItem: HistoryItem = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    timestamp: Date.now(),
    type,
    summary,
    details
  };

  // Keep last 50 items total
  const updated = [newItem, ...allHistory].slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return newItem;
};

export const clearModuleHistory = (type: ViewState) => {
  const allHistory = getHistoryLog();
  const filtered = allHistory.filter(h => h.type !== type);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
};