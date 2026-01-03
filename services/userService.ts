
import { API_BASE_URL, ENABLE_BACKEND_AUTH } from './config';

export interface UserProfile {
  email: string;
  name: string;
  picture: string;
  uid?: string;
  xp?: number;
  level?: number;
  streak?: number;
  superadmin?: boolean;
  betauser?: boolean;
  createdAt?: string;
  // Subscription Fields
  subscription?: string; // 'tier0', 'tier1', etc. (Primary)
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'trialing'; // Stripe status
  cancelAtPeriodEnd?: boolean; // New field to track pending cancellation
  stripeCustomerId?: string;
  stripeSubscriptionId?: string; // Track Active Subscription ID
  usage?: Record<string, number>; // { sentiment: 5, screener: 10 }
  cycleStartDate?: string; // ISO String date
}

export interface ModelConfig {
  agent_model: string;
  reasoning_model: string;
}

export interface ModelOption {
    id: string;
    label: string;
    desc: string;
}

export interface SystemConfig {
    beta_active: boolean;
    models?: ModelConfig;
}

export interface ModuleLimits {
    sentiment: number;
    screener: number;
    analysis: number;
    options: number;
    portfolio: number;
}

export interface SubscriptionTier {
    id: string;
    name: string;
    price: number;
    enabled: boolean;
    description: string;
    stripePriceId?: string; // Link to Stripe Product
    limits: ModuleLimits;
}

export interface ApiKeys {
    polygon: string;
    twelve_data: string;
    financial_datasets: string;
    news_api: string;
    qandle: string;
    stripe_secret: string;
    stripe_webhook_secret: string;
}

// Helper to sanitize base URL
const getBaseUrl = () => API_BASE_URL.trim();

// 1. New Secure Auth (Preferred)
export const authenticateWithBackend = async (idToken: string) => {
  // Skip network request if backend auth is disabled (prevents console errors in dev)
  if (!ENABLE_BACKEND_AUTH) {
    return null;
  }

  try {
     const response = await fetch(`${getBaseUrl()}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: idToken }),
    });

    if (!response.ok) throw new Error("Verification failed");
    
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Auth Service Error (Backend unreachable):", error);
    return null;
  }
}

// 2. Sync Stats (Fire and Forget)
export const updateUserStats = async (email: string, stats: any) => {
  if (!ENABLE_BACKEND_AUTH) {
      console.warn("Backend Sync Skipped: Backend Auth Disabled");
      return;
  }

  // Skip sync if in Demo Mode
  if (typeof window !== 'undefined' && localStorage.getItem('quantai_demo_mode') === 'true') {
    return;
  }
  
  try {
    //console.debug(`[Sync] Updating stats for ${email}...`, stats);
    const response = await fetch(`${getBaseUrl()}/user/update-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, stats }),
    });
    
    if (!response.ok) {
        console.error(`[Sync] Update Stats Failed: ${response.status} ${response.statusText}`);
    } else {
        // console.debug("[Sync] Success"); 
    }
  } catch (e) {
    console.error("[Sync] Network Error:", e);
  }
};

// 3. Admin: Get User Details (Single)
export const adminGetUser = async (email: string) => {
  try {
      const response = await fetch(`${getBaseUrl()}/admin/get-user?email=${email}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
      });
      if(!response.ok) return null;
      return await response.json();
  } catch (e) {
      console.error("Admin Fetch Error", e);
      return null;
  }
};

// 4. Admin: List Users (Paginated)
export const adminListUsers = async (filter: 'all' | 'pending' = 'pending', limit = 20, lastCreated?: string) => {
    try {
        const queryParams = new URLSearchParams({ limit: limit.toString(), filter });
        if(lastCreated) queryParams.append('lastCreated', lastCreated);

        const response = await fetch(`${getBaseUrl()}/admin/list-users?${queryParams.toString()}`);
        if(!response.ok) return { users: [], hasMore: false };
        return await response.json();
    } catch (e) {
        console.error("List Users Error", e);
        return { users: [], hasMore: false };
    }
};

// 5. Admin: Toggle Beta Access
export const adminToggleBeta = async (targetEmail: string, enable: boolean) => {
    try {
        const response = await fetch(`${getBaseUrl()}/admin/toggle-beta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetEmail, enable })
        });
        return response.ok;
    } catch (e) {
        console.error("Admin Toggle Error", e);
        return false;
    }
};

// 6. System: Get Configuration
export const getSystemConfig = async (): Promise<SystemConfig> => {
    try {
        const response = await fetch(`${getBaseUrl()}/system/status`);
        if(!response.ok) return { beta_active: true }; // Default to beta on error (fail safe)
        return await response.json();
    } catch (e) {
        return { beta_active: true };
    }
}

// 7. Admin: Update System Configuration
export const adminUpdateSystemConfig = async (config: Partial<SystemConfig>) => {
    try {
        const response = await fetch(`${getBaseUrl()}/admin/system/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return response.ok;
    } catch(e) {
        console.error(e);
        return false;
    }
}

// 8. Admin: Get Available Models (Dynamic)
export const getAvailableModels = async (): Promise<ModelOption[]> => {
    const defaults = [
        { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash', desc: 'Fastest, Cost-Efficient, 1M Context' },
        { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro', desc: 'Highest Reasoning, Complex Tasks' },
        { id: 'gemini-2.5-flash-latest', label: 'Gemini 2.5 Flash', desc: 'Legacy Stable, Good Baseline' }
    ];

    try {
        const response = await fetch(`${getBaseUrl()}/system/model-options`);
        if (!response.ok) throw new Error("Failed to fetch models");
        const data = await response.json();
        return data.options || defaults;
    } catch (e) {
        console.warn("Using fallback models due to fetch error:", e);
        return defaults;
    }
}

// 9. Admin: Get Subscription Tiers
export const getSubscriptionTiers = async (): Promise<SubscriptionTier[]> => {
    try {
        const response = await fetch(`${getBaseUrl()}/system/subscription-tiers`);
        if (!response.ok) throw new Error("Failed to fetch tiers");
        const data = await response.json();
        return data.tiers || [];
    } catch (e) {
        console.warn("Using fallback tiers due to fetch error:", e);
        return [];
    }
}

// 10. Admin: Update Subscription Tiers
export const updateSubscriptionTiers = async (tiers: SubscriptionTier[]): Promise<boolean> => {
    try {
        const response = await fetch(`${getBaseUrl()}/admin/subscription-tiers/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tiers })
        });
        return response.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// 11. Admin: Get API Keys
export const adminGetApiKeys = async (): Promise<ApiKeys | null> => {
    try {
        const response = await fetch(`${getBaseUrl()}/admin/system/keys`);
        if (!response.ok) throw new Error("Failed to fetch keys");
        return await response.json();
    } catch (e) {
        console.error(e);
        return null;
    }
};

// 12. Admin: Update API Keys
export const adminUpdateApiKeys = async (keys: ApiKeys): Promise<boolean> => {
    try {
        const response = await fetch(`${getBaseUrl()}/admin/system/keys`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(keys)
        });
        return response.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
};

// 13. Legacy Sync (Deprecated but kept for fallback)
export const syncUserWithBackend = async (user: UserProfile) => {
  try {
    if (!ENABLE_BACKEND_AUTH) return null;

    if (API_BASE_URL.includes('localhost') && !window.location.hostname.includes('localhost')) {
        return null;
    }

    const response = await fetch(`${getBaseUrl()}/sync-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      throw new Error('Failed to sync user');
    }

    return await response.json();
  } catch (error) {
    // Silent fail for sync in dev
    return null;
  }
};

// 14. Refresh User Profile (Client Side Pull)
export const refreshUserProfile = async (email: string): Promise<UserProfile | null> => {
    if (!ENABLE_BACKEND_AUTH) return null;
    try {
        // Appending timestamp to force browser to ignore cache
        const response = await fetch(`${getBaseUrl()}/user/profile?email=${email}&_t=${Date.now()}`);
        if (!response.ok) return null;
        const userData = await response.json();
        
        // Update Local Storage securely
        if (userData) {
            localStorage.setItem('quantai_user', JSON.stringify(userData));
        }
        return userData;
    } catch (e) {
        console.error("Failed to refresh profile", e);
        return null;
    }
};

// 15. Create Stripe Checkout Session
// Updated to accept tierId for metadata tracking
export const createCheckoutSession = async (email: string, priceId: string, tierId?: string) => {
    try {
        // Construct clean base URL without query params for Stripe redirect
        const baseUrl = window.location.origin + window.location.pathname;
        
        const response = await fetch(`${getBaseUrl()}/stripe/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, 
                priceId,
                tierId, // New: Pass the internal Tier ID (e.g., 'tier1')
                successUrl: baseUrl, 
                cancelUrl: baseUrl 
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Checkout failed");
        }
        
        return await response.json(); // Returns { url: string }
    } catch (e) {
        console.error(e);
        throw e;
    }
};

// 16. Create Stripe Customer Portal Session
export const createPortalSession = async (email: string) => {
    try {
        // Construct clean base URL
        const returnUrl = window.location.origin + window.location.pathname;

        const response = await fetch(`${getBaseUrl()}/stripe/create-portal-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, returnUrl })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Portal failed");
        }

        return await response.json(); // Returns { url: string }
    } catch (e) {
        console.error(e);
        throw e;
    }
};

// 17. Change Subscription (Downgrade/Crossgrade)
export const changeSubscription = async (email: string, newPriceId: string) => {
    try {
        const response = await fetch(`${getBaseUrl()}/stripe/change-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newPriceId })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Plan change failed");
        }

        return await response.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
};

// 18. Cancel Subscription (Downgrade to Free)
export const cancelSubscription = async (email: string) => {
    try {
        const response = await fetch(`${getBaseUrl()}/stripe/cancel-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Cancellation failed");
        }

        return await response.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
};
