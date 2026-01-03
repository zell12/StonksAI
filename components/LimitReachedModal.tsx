
import React, { useEffect, useState } from 'react';
import { Lock, Zap, MessageCircle, Linkedin, Coffee, ArrowRight } from 'lucide-react';
import { getSystemConfig } from '../services/userService';

interface LimitReachedModalProps {
  moduleName: string;
  onClose: () => void;
  onUpgrade?: () => void; // Navigates to Subscription page
}

const LimitReachedModal: React.FC<LimitReachedModalProps> = ({ moduleName, onClose, onUpgrade }) => {
  const [isBeta, setIsBeta] = useState(false);

  useEffect(() => {
    const checkMode = async () => {
        const config = await getSystemConfig();
        setIsBeta(config.beta_active);
    };
    checkMode();
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-[#0b0f19] border border-gray-800 rounded-3xl p-8 max-w-md w-full relative overflow-hidden shadow-2xl">
         {/* Top Accent */}
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500"></div>
         
         <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-700 shadow-inner">
               <Lock className="text-orange-500" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Limit Reached</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
               You have used all your <span className="text-white font-bold">{moduleName}</span> credits for this cycle.
            </p>
         </div>

         {isBeta ? (
             // BETA MODE CONTENT
             <div className="space-y-4">
                 <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl text-left">
                    <p className="text-blue-200 text-xs leading-relaxed">
                        <strong>Beta Notice:</strong> We are currently tuning our limits. If you need more access to test the platform, reach out directly and we'll boost your account instantly.
                    </p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <a href="https://discord.gg/SBmXQNMkJc" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white py-3 rounded-xl font-bold text-xs transition-colors">
                        <MessageCircle size={16} /> Discord
                    </a>
                    <a href="https://www.linkedin.com/in/russel-alfeche/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#0077b5] hover:bg-[#006396] text-white py-3 rounded-xl font-bold text-xs transition-colors">
                        <Linkedin size={16} /> LinkedIn
                    </a>
                 </div>

                 <button 
                    onClick={() => window.open(`${window.location.origin}?view=coffee`, '_blank')}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                 >
                    <Coffee size={18} />
                    Support the Dev
                 </button>
             </div>
         ) : (
             // PRODUCTION MODE CONTENT
             <div className="space-y-4">
                 <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center">
                     <p className="text-xs text-gray-500 mb-1">Next Cycle Reset</p>
                     <p className="text-white font-mono font-bold">Automatic Monthly Refresh</p>
                 </div>
                 
                 <button 
                    onClick={onUpgrade}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 group transition-all"
                 >
                    <Zap size={20} className="fill-white" />
                    Upgrade Plan
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                 </button>
             </div>
         )}

         <div className="mt-6 pt-4 border-t border-gray-800 text-center">
             <button onClick={onClose} className="text-gray-500 text-sm hover:text-white transition-colors">
                 Close
             </button>
         </div>
      </div>
    </div>
  );
};

export default LimitReachedModal;
