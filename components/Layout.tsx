
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, TrendingUp, Filter, Activity, Menu, X, ShieldCheck, Terminal, Trophy, Flame, User, LogOut, Shield, ChevronRight, Coffee, Crown } from 'lucide-react';
import { ViewState } from '../types';
import { getUserStats, getProgressInfo, UserStats } from '../services/gamification';
import { getSystemConfig, refreshUserProfile } from '../services/userService';
import BrandLogo from './BrandLogo';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [user, setUser] = useState<any>(null);
  const [isBetaActive, setIsBetaActive] = useState(true);
  
  // Real Gamification State
  const [stats, setStats] = useState<UserStats>({ xp: 0, level: 1, streak: 1 });
  const [progressInfo, setProgressInfo] = useState({ percent: 0, nextXP: 100, label: '', currentTitle: '' });

  useEffect(() => {
    const init = async () => {
        // 1. Load User from Storage
        const storedUser = localStorage.getItem('quantai_user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            
            // 2. Refresh Profile from DB to ensure Tier ID is up to date
            // This is critical for usage limits to work correctly
            if (parsedUser.email && localStorage.getItem('quantai_demo_mode') !== 'true') {
                const freshUser = await refreshUserProfile(parsedUser.email);
                if (freshUser) setUser(freshUser);
            }
          } catch (e) {
            console.error("Failed to parse user session");
          }
        }

        // 3. Check System Config
        const conf = await getSystemConfig();
        setIsBetaActive(conf.beta_active);

        // 4. Load Gamification Stats
        const currentStats = getUserStats();
        setStats(currentStats);
        setProgressInfo(getProgressInfo(currentStats.xp));
    };

    init();

    // Listen for XP updates from other components
    const handleXPUpdate = () => {
        const currentStats = getUserStats();
        setStats(currentStats);
        setProgressInfo(getProgressInfo(currentStats.xp));
    };

    window.addEventListener('quantai-xp-update', handleXPUpdate);
    return () => window.removeEventListener('quantai-xp-update', handleXPUpdate);
  }, []);

  // REDESIGNED WORKFLOW ORDER
  const navItems: { id: ViewState; label: string; icon: React.ReactNode; badge?: string; step?: string }[] = [
    // Phase 0: Overview
    { id: 'dashboard', label: 'Command Deck', icon: <LayoutDashboard size={20} /> },
    
    // Phase 1: Discovery
    { id: 'screener', label: 'Alpha Hunter', icon: <Filter size={20} />, step: '01' },
    
    // Phase 2: Diligence
    { id: 'analysis', label: 'Market X-Ray', icon: <Terminal size={20} />, step: '02' },
    
    // Phase 3: Execution
    { id: 'options', label: 'Strategy Lab', icon: <TrendingUp size={20} />, badge: 'AI', step: '03' },
    
    // Phase 4: Risk Management
    { id: 'portfolio', label: 'Risk Guardian', icon: <ShieldCheck size={20} />, step: '04' },
  ];

  return (
    <div className="flex h-screen bg-[#050505] text-gray-100 overflow-hidden font-sans relative">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 z-0 bg-grid-pattern opacity-40 pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 border-r border-gray-800 bg-[#0b0f19]/80 backdrop-blur-xl z-10 relative">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <BrandLogo size="sm" animated={true} />
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white block bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">StonksAI</span>
              <span className="text-[10px] text-emerald-400 tracking-widest uppercase font-bold">Pro Terminal</span>
            </div>
          </div>

          {/* Gamification Card */}
          <div className="bg-gradient-to-b from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-4 mb-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600 overflow-hidden relative">
                    {user?.picture ? (
                      <img src={user.picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={14} className="text-gray-300" />
                    )}
                    {/* Active Indicator */}
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-gray-800"></div>
                 </div>
                 <div className="overflow-hidden">
                    <p className="text-xs text-gray-400 font-medium truncate w-24">{user?.name || "Analyst"}</p>
                    <p className="text-sm font-bold text-white">Level {stats.level}</p>
                 </div>
              </div>
              <div className="flex flex-col items-end">
                 <div className="flex items-center gap-1 text-orange-400" title="Daily Streak">
                   <Flame size={14} fill="currentColor" />
                   <span className="text-xs font-bold">{stats.streak}</span>
                 </div>
              </div>
            </div>
            
            <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
               <div 
                 className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-violet-500 rounded-full transition-all duration-1000"
                 style={{ width: `${progressInfo.percent}%` }}
               ></div>
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-gray-500 font-mono">
               <span>{stats.xp} XP</span>
               <span>{progressInfo.nextXP} XP</span>
            </div>
            <p className="text-[9px] text-center text-gray-600 mt-2 font-mono uppercase tracking-wider">{progressInfo.currentTitle}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 relative">
          <div className="px-3 mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
               Active Pipeline
            </p>
          </div>
          
          {/* --- FUN FLOW INDICATOR (Restricted to Pipeline) --- */}
          <div className="relative py-2">
            
            {/* The Circuit Line */}
            <div className="absolute left-[29px] top-0 bottom-0 w-[2px] bg-gray-800/50 rounded-full z-0"></div>
            
            {/* The Data Pulse Animation */}
            <div className="absolute left-[29px] top-0 bottom-0 w-[2px] z-0 overflow-hidden rounded-full">
                <div className="absolute top-0 left-0 w-full h-[150px] bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent animate-[scan_3s_ease-in-out_infinite]"></div>
            </div>

            {navItems.map((item, index) => (
                <div key={item.id} className="relative group mb-1">
                    {/* Connection Node */}
                    <div className={`absolute left-[25px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[2px] z-20 transition-all duration-300 ${
                        activeView === item.id 
                        ? 'bg-[#0b0f19] border-emerald-500 shadow-[0_0_8px_#10b981] scale-110' 
                        : 'bg-[#0b0f19] border-gray-700 group-hover:border-gray-500'
                    }`}>
                        {activeView === item.id && <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>}
                    </div>

                    <button
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center justify-between pl-10 pr-3 py-3 rounded-xl transition-all duration-200 group border relative overflow-hidden z-10 ${
                            activeView === item.id
                            ? 'bg-gradient-to-r from-emerald-500/10 to-transparent text-white font-medium border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        {activeView === item.id && (
                            <div className="absolute inset-0 bg-emerald-400/5 z-0"></div>
                        )}

                        <div className="flex items-center gap-3 relative z-10">
                            {/* Icon Box */}
                            <div className={`p-1.5 rounded-lg transition-colors duration-200 relative ${
                                activeView === item.id ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-800/50 text-gray-500 group-hover:bg-gray-700 group-hover:text-gray-300'
                            }`}>
                                {item.icon}
                            </div>
                            
                            <div className="flex flex-col items-start text-left">
                                <span className="text-sm">{item.label}</span>
                                {item.step && (
                                    <span className={`text-[9px] font-mono tracking-wide ${activeView === item.id ? 'text-emerald-500/70' : 'text-gray-600'}`}>
                                        PHASE {item.step}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {item.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded">
                                {item.badge}
                            </span>
                        )}
                        
                        {activeView === item.id && (
                             <ChevronRight size={14} className="text-emerald-500 animate-pulse" />
                        )}
                    </button>
                </div>
            ))}
          </div>
          {/* --- END PIPELINE --- */}

          {/* ADMIN LINK (Outside Flow) */}
          {user?.superadmin && (
            <div className="mt-4 pt-2 border-t border-gray-800">
              <button
                onClick={() => onNavigate('admin')}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 group border relative z-10 ${
                  activeView === 'admin'
                    ? 'bg-gradient-to-r from-red-500/10 to-transparent text-red-400 font-medium border-red-500/20'
                    : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${activeView === 'admin' ? 'bg-red-500/10 text-red-400' : 'bg-gray-800/50 text-gray-500'}`}>
                    <Shield size={20} />
                  </div>
                  <span className="text-sm">Admin Console</span>
                </div>
              </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-3 relative z-10">
          
          {/* Show Subscription Manager only if NOT in Beta */}
          {!isBetaActive && (
              <button 
                 onClick={() => onNavigate('subscription')}
                 className={`w-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-xl p-3 flex items-center gap-3 transition-all group ${activeView === 'subscription' ? 'ring-1 ring-blue-500/50' : ''}`}
              >
                 <div className="bg-blue-500/20 p-1.5 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                   <Crown size={16} className="text-blue-400" />
                 </div>
                 <div className="text-left">
                   <p className="text-xs font-bold text-blue-200">Manage Plan</p>
                   <p className="text-[10px] text-blue-500/70">Upgrade Access</p>
                 </div>
              </button>
          )}

          <button 
             onClick={() => onNavigate('coffee')}
             className="w-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 rounded-xl p-3 flex items-center gap-3 transition-all group"
          >
             <div className="bg-orange-500/20 p-1.5 rounded-lg group-hover:bg-orange-500/30 transition-colors">
               <Coffee size={16} className="text-orange-400" />
             </div>
             <div className="text-left">
               <p className="text-xs font-bold text-orange-200">Fuel the Algo</p>
               <p className="text-[10px] text-orange-500/70">Support Development</p>
             </div>
          </button>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:text-white hover:bg-red-500/10 transition-all text-sm group"
          >
            <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
            Disconnect
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-[#0b0f19]/90 backdrop-blur-md z-20 sticky top-0">
          <div className="flex items-center gap-2">
             <BrandLogo size="xs" animated={false} />
             <span className="font-bold text-white tracking-tight">StonksAI Pro</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-400 p-2 rounded-lg hover:bg-gray-800">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="absolute top-[65px] left-0 right-0 bottom-0 bg-[#050505]/95 backdrop-blur-xl z-20 p-4 space-y-2 md:hidden flex flex-col">
             <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 pb-4 mb-2">
                 <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600 overflow-hidden">
                    {user?.picture ? (
                      <img src={user.picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={16} className="text-gray-300" />
                    )}
                 </div>
                 <div>
                    <p className="text-sm font-bold text-white">{user?.name || "Analyst"}</p>
                    <p className="text-xs text-gray-500">Level {stats.level}</p>
                 </div>
             </div>
             <div className="flex-1 space-y-2">
               {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border ${
                    activeView === item.id
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'border-transparent text-gray-400 bg-gray-900/50'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              
              {!isBetaActive && (
                  <button
                      onClick={() => {
                        onNavigate('subscription');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border ${
                        activeView === 'subscription'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'border-transparent text-gray-400 bg-gray-900/50'
                      }`}
                    >
                      <Crown size={20} />
                      Manage Subscription
                  </button>
              )}

              <button
                  onClick={() => {
                    onNavigate('coffee');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border ${
                    activeView === 'coffee'
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      : 'border-transparent text-gray-400 bg-gray-900/50'
                  }`}
                >
                  <Coffee size={20} />
                  Fuel the Algo
              </button>

              {user?.superadmin && (
                  <button
                    onClick={() => {
                        onNavigate('admin');
                        setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border ${
                      activeView === 'admin'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'border-transparent text-gray-400 bg-gray-900/50'
                    }`}
                  >
                    <Shield size={20} />
                    Admin Console
                  </button>
              )}
             </div>
             <button 
               onClick={onLogout}
               className="w-full py-4 bg-red-500/10 text-red-400 rounded-xl mt-4 font-bold"
             >
               Disconnect
             </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
