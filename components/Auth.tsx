import React, { useEffect } from 'react';
import { ShieldCheck, ArrowRight, Terminal } from 'lucide-react';
import { authenticateWithBackend } from '../services/userService';

interface AuthProps {
  onLogin: () => void;
  onClose: () => void;
}

declare global {
  interface Window {
    google: any;
  }
}

const Auth: React.FC<AuthProps> = ({ onLogin, onClose }) => {
  // Client ID provided by user
  const CLIENT_ID = "526639900692-s45r863nd7e32daprk110omgnkuvtr4s.apps.googleusercontent.com";

  useEffect(() => {
    // HELP FOR USER TO FIND ORIGIN
    console.log("%c >>> COPY THIS ORIGIN FOR GOOGLE CONSOLE <<< ", "background: #10b981; color: white; font-size: 14px; font-weight: bold;");
    console.log(window.location.origin);
    console.log("%c >>> PASTE INTO AUTHORIZED JAVASCRIPT ORIGINS <<< ", "background: #10b981; color: white; font-size: 12px;");
  }, []);

  useEffect(() => {
    // Initialize Google Sign-In
    if (window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredentialResponse
        });
        window.google.accounts.id.renderButton(
          document.getElementById("googleSignInDiv"),
          { theme: "filled_black", size: "large", width: "100%", shape: "pill" } 
        );
      } catch (e) {
        console.error("Google Auth Init Error", e);
      }
    }
  }, []);

  const handleCredentialResponse = async (response: any) => {
    try {
      const idToken = response.credential;
      
      // 1. Send raw token to backend for verification
      const backendUser = await authenticateWithBackend(idToken);

      if (backendUser) {
          localStorage.setItem('quantai_user', JSON.stringify(backendUser));
          
          // --- SYNC BACKEND STATS TO LOCAL GAMIFICATION STATE ---
          if (backendUser.xp !== undefined) {
             const stats = {
                 xp: backendUser.xp || 0,
                 level: backendUser.level || 1,
                 streak: backendUser.streak || 1
             };
             localStorage.setItem('quantai_user_stats', JSON.stringify(stats));
             window.dispatchEvent(new Event('quantai-xp-update'));
          }
      } else {
          // Fallback: Client-side decode if backend is offline or disabled (Dev Mode)
          console.log("Using client-side token decoding (Sandbox/Dev Mode)");
          const base64Url = idToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const user = JSON.parse(jsonPayload);
          // Auto-grant beta in dev mode fallback if not set
          if (user.betauser === undefined) user.betauser = false; 
          localStorage.setItem('quantai_user', JSON.stringify(user));
      }
      
    } catch(e) {
      console.error("Auth process error", e);
    }
    onLogin();
  };

  const handleDemoLogin = () => {
    const mockUser = {
      name: "StonksAI Analyst",
      email: "analyst@stonksai.app",
      picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
      verified_email: true,
      betauser: true // DEMO USERS GET ACCESS
    };
    localStorage.setItem('quantai_user', JSON.stringify(mockUser));
    // Set Demo Mode Flag
    localStorage.setItem('quantai_demo_mode', 'true');
    onLogin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-[#0b0f19] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-500/10">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-violet-500 to-emerald-500"></div>
        
        <div className="relative p-8 z-10">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          >
            ✕
          </button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">
              Join StonksAI
            </h2>
            <p className="text-gray-400 text-sm">
              Secure institutional access via Google Workspace.
            </p>
          </div>

          <div className="space-y-6">
            {/* STANDARD LOGIN */}
            <>
                <div className="w-full flex justify-center min-h-[40px]">
                   <div id="googleSignInDiv" className="w-full"></div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-800"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#0b0f19] px-2 text-gray-500">Or continue as Guest</span>
                  </div>
                </div>

                <button 
                   onClick={handleDemoLogin}
                   className="w-full bg-gradient-to-r from-gray-800 to-gray-900 hover:from-emerald-900 hover:to-emerald-800 text-white py-3.5 rounded-full font-bold transition-all border border-gray-700 hover:border-emerald-500/50 text-sm flex items-center justify-center gap-2 group shadow-lg"
                >
                  <Terminal size={16} className="text-emerald-500" />
                  <span>Launch Demo Mode</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform opacity-50 group-hover:opacity-100" />
                </button>
            </>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-800 flex items-center justify-center gap-2 text-[10px] text-gray-600">
            <ShieldCheck size={12} />
            <span>SECURE OAUTH 2.0 CONNECTION</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;