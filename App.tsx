
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StockAnalysis from './components/StockAnalysis';
import OptionsStrategist from './components/OptionsStrategist';
import AIScreener from './components/AIScreener';
import PortfolioHealth from './components/PortfolioHealth';
import AdminPanel from './components/AdminPanel';
import BuyCoffee from './components/BuyCoffee';
import SubscriptionManager from './components/SubscriptionManager';
import Hero from './components/Hero';
import Auth from './components/Auth';
import BetaAccessGate from './components/BetaAccessGate';
import DisclaimerModal from './components/DisclaimerModal';
import DemoNoticeModal from './components/DemoNoticeModal';
import { ViewState, NavParams } from './types';
import { UserProfile, getSystemConfig, refreshUserProfile } from './services/userService';
import { ChevronLeft } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [navParams, setNavParams] = useState<NavParams>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // Disclaimer & Demo State
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showDemoNotice, setShowDemoNotice] = useState(false);

  // SCALABILITY: Global Feature Flag Check
  const [isBetaGateActive, setIsBetaGateActive] = useState(true);

  // PUBLIC/OVERRIDE VIEWS (Accessible without full dashboard login or passing beta gate)
  const [showPublicCoffee, setShowPublicCoffee] = useState(false);

  // 1. Navigation Handler
  const handleNavigate = (view: ViewState, params?: NavParams) => {
    setActiveView(view);
    if (params) {
      setNavParams(params);
    } else {
      setNavParams({});
    }
  };

  // 2. Global Event Listener for Deep Linking (Fixes Modal Navigation)
  useEffect(() => {
      const handleCustomNav = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          if (detail && typeof detail === 'string') {
              handleNavigate(detail as ViewState);
          }
      };

      window.addEventListener('quantai-navigate', handleCustomNav);
      return () => window.removeEventListener('quantai-navigate', handleCustomNav);
  }, []);

  useEffect(() => {
    // 0. Check for deep link (Donation Page)
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'coffee') {
        setShowPublicCoffee(true);
    }

    // 1. Check for existing session
    const session = localStorage.getItem('quantai_session');
    const userStr = localStorage.getItem('quantai_user');
    
    const initSession = async () => {
        if (session && userStr) {
          try {
            const localUser = JSON.parse(userStr);
            // Set initial state from local storage for speed
            setCurrentUser(localUser);
            setIsAuthenticated(true);
            
            // CHECK MODE
            const isDemo = localStorage.getItem('quantai_demo_mode') === 'true';
            if (isDemo) {
                setShowDemoNotice(true);
                setShowDisclaimer(false);
            } else {
                // FORCE REFRESH PROFILE from Backend to ensure Beta Status / Limits are fresh
                // This fixes the issue where a user might be approved/revoked but local storage is stale
                if (localUser.email) {
                    const freshUser = await refreshUserProfile(localUser.email);
                    if (freshUser) {
                        setCurrentUser(freshUser);
                    }
                }

                // Check disclaimer
                const accepted = localStorage.getItem('quantai_disclaimer_accepted');
                if (accepted !== 'true') {
                  setShowDisclaimer(true);
                }
            }
          } catch(e) {
            // Corrupt session
            handleLogout();
          }
        }
    };
    initSession();

    // 2. Fetch Global System Config (Feature Flags & AI Models)
    const fetchConfig = async () => {
        try {
            const config = await getSystemConfig();
            setIsBetaGateActive(config.beta_active);
            
            // Store Model Config for Gemini Service
            if (config.models) {
                localStorage.setItem('quantai_model_config', JSON.stringify(config.models));
            }
        } catch (e) {
            console.error("Config fetch failed", e);
        }
    };
    fetchConfig();
  }, []);

  const handleLogin = () => {
    localStorage.setItem('quantai_session', 'true');
    // Refresh user state from storage as Auth component updates it
    const userStr = localStorage.getItem('quantai_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
    }
    setIsAuthenticated(true);
    setShowAuthModal(false);
    setActiveView('dashboard');

    // CHECK MODE ON FRESH LOGIN
    const isDemo = localStorage.getItem('quantai_demo_mode') === 'true';
    if (isDemo) {
        setShowDemoNotice(true);
        setShowDisclaimer(false);
    } else {
        const accepted = localStorage.getItem('quantai_disclaimer_accepted');
        if (accepted !== 'true') {
          setShowDisclaimer(true);
        }
    }
  };

  const handleDisclaimerAccept = (persist: boolean) => {
    if (persist) {
      localStorage.setItem('quantai_disclaimer_accepted', 'true');
    }
    setShowDisclaimer(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('quantai_session');
    localStorage.removeItem('quantai_user');
    localStorage.removeItem('quantai_demo_mode'); // Clear demo mode flag
    // Note: We intentionally do NOT clear 'quantai_disclaimer_accepted' so users don't see it again if they opted out
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveView('dashboard'); // Reset view on logout
    setShowDemoNotice(false);
    setShowDisclaimer(false);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'analysis':
        return <StockAnalysis initialTicker={navParams.ticker} autoRun={navParams.autoRun} onNavigate={handleNavigate} />;
      case 'options':
        return <OptionsStrategist initialTicker={navParams.ticker} initialOutlook={navParams.outlook} />;
      case 'screener':
        return <AIScreener onNavigate={handleNavigate} />;
      case 'portfolio':
        // PortfolioHealth doesn't usually take props but we can pass onNavigate if we update the component definition
        // For now, it uses the window event fallback which we just enabled
        return <PortfolioHealth />;
      case 'subscription':
        return <SubscriptionManager />;
      case 'coffee':
        return <BuyCoffee />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  // --- PUBLIC OVERRIDE: COFFEE PAGE ---
  if (showPublicCoffee) {
      return (
          <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden relative">
              <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>
              <div className="container mx-auto px-6 py-6 relative z-10">
                  <button 
                    onClick={() => {
                        // If opened via deep link (new tab), allow closing tab or navigating home
                        if (window.history.length === 1) {
                            window.location.href = '/';
                        } else {
                            setShowPublicCoffee(false);
                        }
                    }}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
                  >
                      <ChevronLeft size={20} /> Back
                  </button>
                  <BuyCoffee />
              </div>
          </div>
      );
  }

  // --- UNAUTHENTICATED VIEW ---
  if (!isAuthenticated) {
    return (
      <>
        <Hero 
            onLoginClick={() => setShowAuthModal(true)} 
            onOpenCoffee={() => setShowPublicCoffee(true)}
        />
        {showAuthModal && (
          <Auth 
            onLogin={handleLogin} 
            onClose={() => setShowAuthModal(false)} 
          />
        )}
      </>
    );
  }

  // --- RESTRICTED BETA VIEW ---
  // Ensure we check currentUser existence and flags carefully
  if (isBetaGateActive) {
      if (currentUser && !currentUser.betauser && !currentUser.superadmin) {
          return (
              <BetaAccessGate 
                onLogout={handleLogout} 
                onOpenCoffee={() => setShowPublicCoffee(true)}
                userEmail={currentUser.email} 
              />
          );
      }
  }

  // --- AUTHENTICATED DASHBOARD VIEW ---
  return (
    <>
      {showDisclaimer && !showDemoNotice && (
        <DisclaimerModal onAccept={handleDisclaimerAccept} />
      )}
      {showDemoNotice && (
        <DemoNoticeModal onAccept={() => setShowDemoNotice(false)} />
      )}
      <Layout 
        activeView={activeView} 
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      >
        {renderView()}
      </Layout>
    </>
  );
};

export default App;
