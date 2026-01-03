
import { getSubscriptionTiers, updateUserStats, UserProfile, SubscriptionTier } from './userService';

export type ModuleType = 'sentiment' | 'screener' | 'analysis' | 'options' | 'portfolio';

const CACHED_TIERS_KEY = 'quantai_tier_definitions';

// Default "Free/Beta" Tier structure to use ONLY if network fails AND no cache exists.
// This matches the default backend configuration to avoid "arbitrary" limits.
const DEFAULT_FREE_TIER: SubscriptionTier = {
    id: 'tier0',
    name: 'Beta / Free',
    enabled: true,
    description: 'Essential tools for casual market observers.',
    price: 0,
    limits: { sentiment: 40, screener: 40, analysis: 20, options: 20, portfolio: 40 }
};

const getCurrentUser = (): UserProfile | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('quantai_user');
    return stored ? JSON.parse(stored) : null;
};

// Sync updated usage to backend
// CHANGED: Added syncDate flag. Defaults to FALSE to prevent spamming date updates.
const syncUsage = (user: UserProfile, syncDate: boolean = false) => {
    localStorage.setItem('quantai_user', JSON.stringify(user));
    
    if (user.email) {
        const payload: any = { usage: user.usage };

        // Only include date if explicitly requested (e.g., during a reset)
        if (syncDate) {
            // SANITIZATION: Ensure cycleStartDate is a clean string before sending
            let dateToSend: any = user.cycleStartDate;
            
            if (dateToSend && typeof dateToSend === 'object') {
                 try {
                     if (typeof dateToSend.toDate === 'function') {
                         dateToSend = dateToSend.toDate().toISOString();
                     } else if (dateToSend._seconds) {
                         dateToSend = new Date(dateToSend._seconds * 1000).toISOString();
                     } else if (dateToSend.seconds) {
                         dateToSend = new Date(dateToSend.seconds * 1000).toISOString();
                     } else {
                         dateToSend = new Date(dateToSend).toISOString();
                     }
                 } catch (e) {
                     console.warn("Failed to sanitize cycleStartDate, defaulting to now");
                     dateToSend = new Date().toISOString();
                 }
            }
            payload.cycleStartDate = dateToSend;
        }

        updateUserStats(user.email, payload);
    }
};

/**
 * Robust date parser for mixed data types (ISO string, Firestore Timestamp object, null)
 */
const safeParseDate = (dateVal: any): Date => {
    if (!dateVal) return new Date();
    
    // Handle Firestore Timestamp Object {_seconds: ..., _nanoseconds: ...} or {seconds: ...}
    if (typeof dateVal === 'object') {
        if (dateVal.toDate && typeof dateVal.toDate === 'function') return dateVal.toDate();
        if (dateVal._seconds) return new Date(dateVal._seconds * 1000);
        if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    }
    
    // Handle Strings / Numbers
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return new Date(); // Fallback to now if invalid
    return d;
};

/**
 * Robust Tier Fetcher: Network -> Cache -> Default
 */
const fetchTiersRobust = async (): Promise<{ tiers: SubscriptionTier[], error?: string }> => {
    try {
        // 1. Try Network
        const tiers = await getSubscriptionTiers();
        if (tiers && tiers.length > 0) {
            // Update Cache
            localStorage.setItem(CACHED_TIERS_KEY, JSON.stringify(tiers));
            return { tiers };
        }
        throw new Error("Empty tiers returned from API");
    } catch (e: any) {
        console.warn("Failed to fetch fresh tiers, checking cache...", e.message);
        
        // 2. Try Cache
        const cachedStr = localStorage.getItem(CACHED_TIERS_KEY);
        if (cachedStr) {
            try {
                const cachedTiers = JSON.parse(cachedStr);
                if (Array.isArray(cachedTiers) && cachedTiers.length > 0) {
                    return { 
                        tiers: cachedTiers, 
                        error: `Sync failed: ${e.message || 'Unknown error'}. Using cached plan details.` 
                    };
                }
            } catch (parseError) {
                console.error("Cache corrupted");
            }
        }

        // 3. Absolute Fallback (Network Down + No Cache)
        return { 
            tiers: [DEFAULT_FREE_TIER],
            error: "Connection failed. Using default tier limits." 
        };
    }
};

/**
 * Checks if the user is within their limits for a specific module.
 * Also handles monthly cycle resets if the date has passed.
 */
export const checkUsageLimit = async (module: ModuleType): Promise<{ allowed: boolean; limit: number; current: number; tierName: string; error?: string }> => {
    const user = getCurrentUser();
    
    // 1. Superadmins bypass all limits
    if (user?.superadmin) return { allowed: true, limit: 9999, current: 0, tierName: 'Superadmin' };

    // 2. Demo mode users usually have limits reset or ignored, but let's treat as 'tier0'
    // Updated: Only check 'subscription' field
    const tierId = user?.subscription || 'tier0';

    // 3. Fetch Tiers (Robust)
    const { tiers, error } = await fetchTiersRobust();
    
    // Find matching tier, or default to the first available (usually free)
    const currentTier = tiers.find(t => t.id === tierId) || tiers[0] || DEFAULT_FREE_TIER;

    // 4. Check Cycle Date & Reset if needed
    const now = new Date();
    const cycleStart = user?.cycleStartDate ? safeParseDate(user.cycleStartDate) : new Date();
    
    // If no cycle date set (or it was invalid and defaulted to now), set it properly
    if (!user?.cycleStartDate) {
        if (user) {
            user.cycleStartDate = now.toISOString();
            user.usage = { sentiment: 0, screener: 0, analysis: 0, options: 0, portfolio: 0 };
            // TRUE: Send date because we just initialized it
            syncUsage(user, true);
        }
    } else {
        // Calculate one month difference
        const oneMonthAhead = new Date(cycleStart);
        oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 1);
        
        if (now >= oneMonthAhead) {
            console.log("Monthly cycle reset triggered.");
            if (user) {
                user.cycleStartDate = now.toISOString();
                user.usage = { sentiment: 0, screener: 0, analysis: 0, options: 0, portfolio: 0 };
                // TRUE: Send date because we just reset it
                syncUsage(user, true);
            }
        }
    }

    // 5. Check Limit
    const limit = currentTier.limits[module] || 0;
    const current = user?.usage?.[module] || 0;

    return {
        allowed: current < limit,
        limit,
        current,
        tierName: currentTier.name,
        error
    };
};

/**
 * Increment usage counter for a module.
 * Only call this AFTER a successful API execution.
 */
export const incrementUsage = async (module: ModuleType) => {
    const user = getCurrentUser();
    if (!user || user.superadmin) return;

    if (!user.usage) user.usage = {};
    const current = user.usage[module] || 0;
    user.usage[module] = current + 1;

    // FALSE: Do NOT send date on standard increments. Only sync usage numbers.
    syncUsage(user, false);
};

/**
 * Get full usage stats for UI
 */
export const getUsageStats = async () => {
    const user = getCurrentUser();
    const { tiers, error } = await fetchTiersRobust();
    
    // Updated: Only check 'subscription'
    const tierId = user?.subscription || 'tier0';
    
    const currentTier = tiers.find(t => t.id === tierId) || tiers[0] || DEFAULT_FREE_TIER;
    
    // Ensure the returned cycle start is a clean ISO string
    let cleanCycleStart = new Date().toISOString();
    if (user?.cycleStartDate) {
        cleanCycleStart = safeParseDate(user.cycleStartDate).toISOString();
    }

    return {
        usage: user?.usage || { sentiment: 0, screener: 0, analysis: 0, options: 0, portfolio: 0 },
        tier: currentTier,
        cycleStart: cleanCycleStart,
        error // Pass error to UI
    };
};
