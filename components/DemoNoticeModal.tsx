import React from 'react';
import { Terminal, AlertTriangle, Play } from 'lucide-react';

interface DemoNoticeModalProps {
  onAccept: () => void;
}

const DemoNoticeModal: React.FC<DemoNoticeModalProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-[#0b0f19] border border-blue-500/30 rounded-3xl shadow-[0_0_50px_-10px_rgba(59,130,246,0.2)] overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"></div>
        
        <div className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-inner shadow-blue-500/10">
                <Terminal size={32} className="text-blue-400" />
            </div>
            
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Simulation Mode Active</h2>
            <p className="text-blue-400 font-mono text-xs uppercase tracking-widest mb-6">Synthetic Data Environment</p>
            
            <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl text-left mb-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="text-blue-400 shrink-0 mt-0.5" size={18} />
                    <p className="text-blue-200/80 text-sm leading-relaxed">
                        You are entering a <strong>Sandbox Environment</strong>. All market data, price action, and analysis results are <span className="text-white font-bold">simulated</span> for demonstration purposes.
                    </p>
                </div>
            </div>

            <p className="text-gray-500 text-xs mb-8">
                Financial metrics do not reflect live market conditions.
            </p>

            <button 
                onClick={onAccept}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 group"
            >
                <span>Enter Simulation</span>
                <Play size={18} className="group-hover:translate-x-1 transition-transform fill-current" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default DemoNoticeModal;