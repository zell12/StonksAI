
import React, { useEffect, useState } from 'react';
import { getUsageStats, ModuleType } from '../services/usageService';
import { SubscriptionTier, refreshUserProfile, createCheckoutSession, createPortalSession, changeSubscription, cancelSubscription } from '../services/userService';
import { Activity, Filter, Terminal, TrendingUp, ShieldCheck, Check, Star, Zap, Crown, Info, Sparkles, ChevronRight, BarChart3, Clock, AlertTriangle, Loader2, ArrowRightLeft, CreditCard } from 'lucide-react';

interface SubscriptionManagerProps {}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = () => {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [usageData, setUsageData] = useState<Record<string, number>>({});
  const [currentTierId, setCurrentTierId] = useState<string>('tier0');
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  const [cycleStart, setCycleStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // State for dynamic calculations
  const [maxLimits, setMaxLimits] = useState<Record<string, number>>({});
  const [highestTierId, setHighestTierId] = useState<string>('');

  // Enhanced metadata with "fun" punchy descriptions
  const MODULE_DETAILS = {
    sentiment: { 
        label: "Market Pulse", 
        desc: "Real-time AI decoding of global fear, greed, & news signals.", 
        icon: <Activity size={16} /> 
    },
    screener: { 
        label: "Alpha Hunter", 
        desc: "Semantic engine scanning 10k+ assets for hidden setups.", 
        icon: <Filter size={16} /> 
    },
    analysis: { 
        label: "Deep Dive Core", 
        desc: "Institutional-grade fundamental & technical synthesis.", 
        icon: <Terminal size={16} /> 
    },
    options: { 
        label: "Volatility Labs", 
        desc: "Market data aware and AI synthesized multi-leg options recommendations, structures & Greeks.", 
        icon: <TrendingUp size={16} /> 
    },
    portfolio: { 
        label: "Risk Guardian", 
        desc: "AI infused stress-testing & correlation audits.", 
        icon: <ShieldCheck size={16} /> 
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      let userStripeId = null;

      // 0. Force Refresh User Profile from Backend to get latest Tier
      const userStr = localStorage.getItem('quantai_user');
      if (userStr) {
          try {
              let u = JSON.parse(userStr);
              // Optimistically set ID from local if exists
              if (u.stripeCustomerId) userStripeId = u.stripeCustomerId;

              if (u.email && localStorage.getItem('quantai_demo_mode') !== 'true') {
                  // Wait for refresh before getting stats
                  const updatedUser = await refreshUserProfile(u.email);
                  if (updatedUser) {
                      if (updatedUser.stripeCustomerId) userStripeId = updatedUser.stripeCustomerId;
                      if (updatedUser.cancelAtPeriodEnd !== undefined) setCancelAtPeriodEnd(updatedUser.cancelAtPeriodEnd);
                  }
              }
          } catch (e) { console.error("Profile refresh failed", e); }
      }
      setStripeCustomerId(userStripeId);

      // 1. Get Usage & Current Tier
      const { usage, tier, cycleStart, error } = await getUsageStats();
      setUsageData(usage);
      setCurrentTierId(tier.id);
      setCycleStart(cycleStart || null);
      if (error) setSyncError(error);

      // 2. Get All Tiers
      const { getSubscriptionTiers } = await import('../services/userService');
      let allTiers: SubscriptionTier[] = [];
      try {
          allTiers = await getSubscriptionTiers();
      } catch (e) {
          const cached = localStorage.getItem('quantai_tier_definitions');
          if (cached) {
              allTiers = JSON.parse(cached);
          } else {
              allTiers = [tier]; 
          }
      }
      
      // Filter out disabled tiers
      const enabledTiers = allTiers.filter(t => t.enabled !== false);
      
      // 3. Calculate Dynamic Max Limits
      const calculatedMax: Record<string, number> = {};
      Object.keys(MODULE_DETAILS).forEach(k => calculatedMax[k] = 0);

      enabledTiers.forEach(tier => {
          Object.entries(tier.limits).forEach(([key, val]) => {
              const numVal = Number(val);
              if (numVal > (calculatedMax[key] || 0)) {
                  calculatedMax[key] = numVal;
              }
          });
      });
      setMaxLimits(calculatedMax);

      // 4. Identify Highest Tier (Best Value)
      if (enabledTiers.length > 0) {
          const highest = enabledTiers.reduce((prev, current) => (prev.price > current.price) ? prev : current);
          setHighestTierId(highest.id);
      }

      setTiers(enabledTiers);
      setLoading(false);
    };
    init();
  }, []);

  const handleUpgrade = async (tier: SubscriptionTier) => {
      setActionLoading(tier.id);
      const userStr = localStorage.getItem('quantai_user');
      
      if (!userStr) {
          alert("Please log in to upgrade.");
          setActionLoading(null);
          return;
      }
      
      const user = JSON.parse(userStr);
      
      try {
          if (!tier.stripePriceId) {
              alert("Configuration Error: This tier is missing a Stripe Price ID. Contact support.");
              return;
          }
          
          // Initiate Checkout Session - Passing tier.id is critical for webhook metadata
          const session = await createCheckoutSession(user.email, tier.stripePriceId, tier.id);
          if (session.url) {
              window.location.href = session.url;
          } else {
              throw new Error("Invalid session URL");
          }
      } catch (e: any) {
          console.error("Upgrade failed:", e);
          alert("Failed to initiate secure checkout: " + e.message);
      } finally {
          setActionLoading(null);
      }
  };

  const handleDowngrade = async (tier: SubscriptionTier) => {
      setActionLoading(tier.id);
      const userStr = localStorage.getItem('quantai_user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      // DOWNGRADE TO FREE (CANCELLATION)
      if (tier.price === 0) {
          if (confirm(`Are you sure you want to cancel your subscription? You will retain access until the end of your billing cycle.`)) {
              try {
                  await cancelSubscription(user.email);
                  alert("Subscription set to cancel at end of period.");
                  window.location.reload();
              } catch (e: any) {
                  alert("Failed to cancel: " + e.message);
              }
          }
      } 
      // DOWNGRADE TO LOWER PAID PLAN
      else {
          if (confirm(`Downgrade your plan to ${tier.name}? Any unused time on your current plan will be credited.`)) {
              try {
                  if (!tier.stripePriceId) throw new Error("Price ID missing for target tier.");
                  await changeSubscription(user.email, tier.stripePriceId);
                  alert(`Plan changed to ${tier.name} successfully.`);
                  window.location.reload();
              } catch (e: any) {
                  alert("Failed to change plan: " + e.message);
              }
          }
      }
      setActionLoading(null);
  };

  const handleManageBilling = async () => {
      setActionLoading('manage');
      const userStr = localStorage.getItem('quantai_user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      try {
          const session = await createPortalSession(user.email);
          if (session.url) {
              window.location.href = session.url;
          }
      } catch (e: any) {
          console.error("Portal failed:", e);
          alert("Failed to access billing portal: " + e.message);
      } finally {
          setActionLoading(null);
      }
  };

  const getTierIcon = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('beta') || n.includes('free')) return <Zap className="text-gray-400" />;
      if (n.includes('explorer')) return <Star className="text-blue-400" />;
      if (n.includes('analyst')) return <Activity className="text-emerald-400" />;
      if (n.includes('strategist')) return <Crown className="text-yellow-400" />;
      return <ShieldCheck className="text-gray-400" />;
  };

  const getTierColor = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('explorer')) return 'blue';
      if (n.includes('analyst')) return 'emerald';
      if (n.includes('strategist')) return 'yellow';
      return 'gray';
  };

  const getGradient = (color: string) => {
      if (color === 'blue') return 'from-blue-600 to-cyan-500';
      if (color === 'emerald') return 'from-emerald-600 to-teal-500';
      if (color === 'yellow') return 'from-yellow-500 to-orange-500';
      return 'from-gray-700 to-gray-600';
  }

  const getResetDate = () => {
      if (!cycleStart) return "Unknown";
      try {
          const date = new Date(cycleStart);
          if (isNaN(date.getTime())) return "Invalid Date";
          date.setMonth(date.getMonth() + 1);
          return date.toLocaleDateString();
      } catch (e) {
          return "Unknown";
      }
  };

  if (loading) {
      return (
          <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
      );
  }

  const activePlan = tiers.find(t => t.id === currentTierId) || tiers[0];
  const currentLimits = activePlan?.limits || { sentiment: 0, screener: 0, analysis: 0, options: 0, portfolio: 0 };
  const isPaidUser = currentTierId !== 'tier0' && activePlan.price > 0;
  
  // Logic: Can manage billing if currently paying OR has a history (stripe ID exists)
  const canManageBilling = isPaidUser || (stripeCustomerId && stripeCustomerId.length > 0);

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4">
      
      {/* SYNC ERROR WARNING */}
      {syncError && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertTriangle size={20} className="shrink-0" />
              <div>
                  <p className="text-sm font-bold">Data Synchronization Issue</p>
                  <p className="text-xs opacity-90">{syncError}</p>
              </div>
          </div>
      )}

      {/* --- USAGE MONITOR SECTION --- */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 mb-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <BarChart3 size={120} className="text-white" />
          </div>
          
          <div className="flex items-center justify-between mb-6">
              <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Resource Monitor</h2>
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                      <Clock size={14} /> Usage resets automatically on <span className="text-white font-mono">{getResetDate()}</span>
                  </p>
                  {cancelAtPeriodEnd && (
                      <span className="text-xs text-orange-400 font-bold bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20 mt-2 inline-block">
                          Access ends at current billing cycle
                      </span>
                  )}
              </div>
              <div className="flex gap-3">
                  {canManageBilling && (
                      <button 
                        onClick={handleManageBilling}
                        disabled={actionLoading === 'manage'}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl border border-gray-600 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                      >
                          {actionLoading === 'manage' ? <Loader2 className="animate-spin" size={14} /> : <CreditCard size={14} />}
                          Manage Billing
                      </button>
                  )}
                  <div className="px-4 py-2 bg-gray-800 rounded-xl border border-gray-700">
                      <span className="text-xs text-gray-500 uppercase font-bold tracking-wider block mb-1">Active Plan</span>
                      <span className="text-white font-bold">{activePlan?.name || "Unknown"}</span>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {Object.entries(MODULE_DETAILS).map(([key, detail]) => {
                  const used = usageData[key] || 0;
                  const limit = currentLimits[key as keyof typeof currentLimits] || 0;
                  const percent = Math.min(100, limit > 0 ? (used / limit) * 100 : 0);
                  const isLow = percent < 50;
                  const isHigh = percent > 90;

                  return (
                      <div key={key} className="bg-black/40 border border-gray-800 rounded-xl p-4 flex flex-col">
                          <div className="flex items-center gap-2 mb-3 text-gray-300">
                              <div className="text-gray-500">{detail.icon}</div>
                              <span className="text-xs font-bold uppercase tracking-wider">{key}</span>
                          </div>
                          <div className="flex-1 flex flex-col justify-end">
                              <div className="flex justify-between items-end mb-2">
                                  <span className={`text-2xl font-mono font-bold ${isHigh ? 'text-red-400' : 'text-white'}`}>
                                      {used}
                                  </span>
                                  <span className="text-xs text-gray-500 mb-1">/ {limit}</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                  <div 
                                      className={`h-full rounded-full transition-all duration-1000 ${isHigh ? 'bg-red-500' : isLow ? 'bg-emerald-500' : 'bg-yellow-500'}`}
                                      style={{ width: `${percent}%` }}
                                  ></div>
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      <div className="text-center mb-16 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -z-10"></div>
        <h1 className="text-5xl font-black text-white mb-6 tracking-tighter">
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Weapon</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Scale your analytical firepower. From daily scans to institutional-grade research.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="flex flex-wrap justify-center gap-6">
        {tiers.map((tier) => {
            const color = getTierColor(tier.name);
            const isFree = tier.price === 0;
            const isBestValue = tier.id === highestTierId;
            const isCurrent = tier.id === currentTierId;
            const isPremium = color === 'yellow' || color === 'emerald' || color === 'blue';
            
            // Downgrade Logic
            const isDowngrade = tier.price < activePlan.price;

            return (
                <div key={tier.id} className={`w-full max-w-[300px] flex flex-col bg-[#0b0f19] border rounded-3xl overflow-visible transition-all duration-500 hover:-translate-y-3 relative group ${
                    isCurrent ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50' :
                    isBestValue ? 'border-yellow-500/30 hover:border-yellow-500/60 shadow-2xl shadow-yellow-500/5' :
                    color === 'emerald' ? 'border-emerald-500/30 hover:border-emerald-500/60 shadow-2xl shadow-emerald-500/5' :
                    color === 'blue' ? 'border-blue-500/30 hover:border-blue-500/60 shadow-xl shadow-blue-500/5' :
                    'border-gray-800 hover:border-gray-600'
                }`}>
                    
                    {isCurrent && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg z-20 flex items-center gap-1 whitespace-nowrap border border-emerald-400/50">
                            <Check size={12} className="stroke-[4px]" /> Active Plan
                        </div>
                    )}

                    {isBestValue && !isCurrent && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg z-10 flex items-center gap-1 whitespace-nowrap">
                            <Sparkles size={12} className="fill-black" /> Ultimate Power
                        </div>
                    )}

                    <div className="p-6 pb-2 text-center relative overflow-hidden rounded-t-3xl">
                        <div className={`absolute inset-0 bg-gradient-to-b ${
                            color === 'yellow' ? 'from-yellow-500/10' :
                            color === 'emerald' ? 'from-emerald-500/10' :
                            color === 'blue' ? 'from-blue-500/10' : 
                            'from-gray-800/10'
                        } to-transparent opacity-50`}></div>
                        
                        <div className="relative z-10">
                            <div className={`inline-flex p-3 rounded-2xl mb-4 bg-${color}-500/10 border border-${color}-500/20`}>
                                {getTierIcon(tier.name)}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                            <div className="flex justify-center items-baseline gap-1 my-4">
                                <span className={`text-4xl font-black tracking-tight ${
                                    color === 'yellow' ? 'text-yellow-400' :
                                    color === 'emerald' ? 'text-emerald-400' :
                                    color === 'blue' ? 'text-blue-400' : 'text-white'
                                }`}>
                                    {isFree ? "Free" : `$${tier.price}`}
                                </span>
                                {!isFree && <span className="text-gray-500 text-xs font-bold uppercase">/ mo</span>}
                            </div>
                            <p className="text-xs text-gray-400 min-h-[32px] leading-relaxed px-2">
                                {tier.description}
                            </p>
                        </div>
                    </div>

                    <div className="px-6 py-4">
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent w-full"></div>
                        <div className="flex justify-center mt-2">
                            <span className="text-[9px] uppercase font-bold text-gray-600 tracking-widest flex items-center gap-1">
                                <BarChart3 size={10} /> Monthly Capacity Limits
                            </span>
                        </div>
                    </div>

                    <div className="px-6 space-y-5 mb-8 flex-1">
                        {Object.entries(MODULE_DETAILS).map(([key, detail]) => {
                            const limit = tier.limits[key as keyof typeof tier.limits];
                            if (!limit || limit <= 0) return null;

                            const max = maxLimits[key] || 100;
                            const percent = Math.min(100, (limit / max) * 100);
                            
                            return (
                                <div key={key} className="group/item relative cursor-default">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <div className="flex items-center gap-2 text-gray-300 group-hover/item:text-white transition-colors">
                                            <div className={`text-gray-600 group-hover/item:text-${color}-400 transition-colors`}>
                                                {detail.icon}
                                            </div>
                                            <span className="text-xs font-bold">{detail.label}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-mono font-medium block leading-none ${isPremium ? `text-${color}-400` : 'text-gray-500'}`}>
                                                {limit} / mo
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800/50">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-700 ease-out bg-${color}-500 ${isPremium ? 'shadow-[0_0_8px_currentColor]' : ''}`}
                                            style={{ width: `${percent}%`, opacity: isFree ? 0.5 : 1 }}
                                        ></div>
                                    </div>
                                    {/* Hover Description Tooltip - Scoped to group/item */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl shadow-xl opacity-0 translate-y-2 group-hover/item:opacity-100 group-hover/item:translate-y-0 pointer-events-none transition-all duration-200 z-20 text-center">
                                        <div className={`text-[10px] uppercase font-bold text-${color}-400 mb-1`}>{detail.label}</div>
                                        <p className="text-[10px] text-gray-300 leading-snug">{detail.desc}</p>
                                        <div className="mt-2 pt-2 border-t border-gray-800 text-[9px] text-gray-500">
                                            Includes {limit} executions per month
                                        </div>
                                        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-b border-r border-gray-700 rotate-45"></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-6 pt-0 mt-auto">
                        <button 
                            disabled={isCurrent || actionLoading !== null}
                            onClick={() => {
                                if (isDowngrade) {
                                    handleDowngrade(tier);
                                } else {
                                    handleUpgrade(tier);
                                }
                            }}
                            className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group/btn relative overflow-hidden ${
                            isCurrent 
                            ? 'bg-gray-900 text-gray-500 border border-gray-800 cursor-default'
                            : `bg-gradient-to-r ${getGradient(color)} text-white shadow-lg hover:shadow-${color}-500/25`
                        }`}>
                            <span className="relative z-10 flex items-center gap-2">
                                {actionLoading === (isDowngrade ? 'manage' : tier.id) ? <Loader2 className="animate-spin" size={18} /> : null}
                                
                                {isCurrent ? "Current Plan" : isDowngrade ? "Downgrade Plan" : "Upgrade Access"}
                                
                                {!isCurrent && !actionLoading && (
                                    isDowngrade ? <ArrowRightLeft size={16} /> : <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                )}
                            </span>
                            {!isCurrent && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>}
                        </button>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default SubscriptionManager;
