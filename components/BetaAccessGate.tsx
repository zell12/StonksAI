import React from 'react';
import { Lock, Linkedin, LogOut, Hourglass, ShieldCheck, ArrowRight, Coffee } from 'lucide-react';
import BrandLogo from './BrandLogo';

interface BetaAccessGateProps {
  onLogout: () => void;
  onOpenCoffee: () => void;
  userEmail?: string;
}

const BetaAccessGate: React.FC<BetaAccessGateProps> = ({ onLogout, onOpenCoffee, userEmail }) => {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden font-sans">
      {/* Background FX */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-violet-600/5 blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
      </div>

      <nav className="relative z-50 p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <BrandLogo size="sm" animated={true} />
            <span className="font-bold tracking-tight text-xl">StonksAI</span>
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={onOpenCoffee} 
                className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-orange-400 transition-colors"
            >
                <Coffee size={16} /> Support
            </button>
            <div className="w-px h-4 bg-gray-800"></div>
            <button 
                onClick={onLogout} 
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
            >
                <LogOut size={16} /> Sign Out
            </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="max-w-xl w-full text-center">
            
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-900/50 rounded-3xl mb-8 border border-gray-800 shadow-2xl relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Lock size={32} className="text-gray-400 group-hover:text-emerald-400 transition-colors" />
                <div className="absolute -top-2 -right-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Hourglass size={10} /> WAITLIST
                </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
                Limited Beta Access
            </h1>
            
            <p className="text-lg text-gray-400 leading-relaxed mb-8">
                StonksAI is currently in a closed beta phase to ensure optimal performance for our users. Your account <span className="text-white font-mono bg-gray-800 px-2 py-0.5 rounded text-sm mx-1">{userEmail}</span> has been added to the queue.
            </p>

            <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-8 mb-8 text-left relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-violet-500"></div>
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-blue-400" />
                    Request Immediate Access
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                    We are manually approving traders. To expedite your approval, please reach out to via LinkedIn or join our Discord community.
                </p>
                
                <div className="grid gap-3">
                    <a 
                        href="https://www.linkedin.com/in/russel-alfeche/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full bg-[#0077b5] hover:bg-[#006396] text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 group"
                    >
                        <Linkedin size={20} />
                        <span>Message Russel Alfeche</span>
                    </a>
                    
                    <a 
                        href="https://discord.gg/SBmXQNMkJc" 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 group"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                        <span>Join Discord Community</span>
                    </a>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BetaAccessGate;