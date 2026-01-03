import { updateUserStats } from './userService';

export const LEVELS = [
  { level: 1, minXP: 0, title: "Novice Analyst" },
  { level: 2, minXP: 500, title: "Junior Trader" },
  { level: 3, minXP: 1200, title: "Market Operator" },
  { level: 4, minXP: 2500, title: "Quant Specialist" },
  { level: 5, minXP: 4500, title: "Alpha Hunter" },
  { level: 6, minXP: 7500, title: "Portfolio Manager" },
  { level: 7, minXP: 12000, title: "Market Maker" },
  { level: 8, minXP: 20000, title: "Institutional Director" },
  { level: 9, minXP: 35000, title: "Hedge Fund Titan" },
  { level: 10, minXP: 50000, title: "Apex Predator" },
];

export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  lastAction?: string;
}

export const getUserStats = (): UserStats => {
  if (typeof window === 'undefined') return { xp: 0, level: 1, streak: 1 };
  
  const stored = localStorage.getItem('quantai_user_stats');
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Default for new users
  const initial: UserStats = { xp: 0, level: 1, streak: 1 };
  localStorage.setItem('quantai_user_stats', JSON.stringify(initial));
  return initial;
};

export const addXP = (amount: number) => {
  const stats = getUserStats();
  const oldLevel = stats.level;
  
  stats.xp += amount;
  
  // Calculate new level
  const currentLevelObj = [...LEVELS].reverse().find(l => stats.xp >= l.minXP) || LEVELS[0];
  stats.level = currentLevelObj.level;
  
  // Save local
  localStorage.setItem('quantai_user_stats', JSON.stringify(stats));
  
  // Dispatch event for UI updates
  window.dispatchEvent(new Event('quantai-xp-update'));
  
  if (stats.level > oldLevel) {
    console.log("Level Up!");
  }

  // --- SYNC TO BACKEND ---
  try {
    const userStr = localStorage.getItem('quantai_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.email) {
        updateUserStats(user.email, {
            xp: stats.xp,
            level: stats.level,
            streak: stats.streak
        });
      }
    }
  } catch(e) {
    // Fail silently if user not parsed or sync fails
  }
  
  return stats;
};

export const getProgressInfo = (currentXP: number) => {
  const currentLevelObj = [...LEVELS].reverse().find(l => currentXP >= l.minXP) || LEVELS[0];
  const nextLevelObj = LEVELS.find(l => l.minXP > currentXP);
  
  if (!nextLevelObj) {
    return { percent: 100, nextXP: currentXP, label: 'MAX LEVEL', currentTitle: currentLevelObj.title };
  }
  
  const xpInLevel = currentXP - currentLevelObj.minXP;
  const xpNeeded = nextLevelObj.minXP - currentLevelObj.minXP;
  const percent = Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100));
  
  return { 
    percent, 
    nextXP: nextLevelObj.minXP, 
    label: nextLevelObj.title, // Title of the NEXT level
    currentTitle: currentLevelObj.title
  };
};