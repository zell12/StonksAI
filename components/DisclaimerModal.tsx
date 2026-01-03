import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Scale } from 'lucide-react';

interface DisclaimerModalProps {
  onAccept: (persist: boolean) => void;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onAccept }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-[#0b0f19] border border-gray-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex items-center gap-3">
          <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-500">
             <Scale size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Legal Disclaimer & Risk Disclosure</h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Read Carefully Before Proceeding</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-gray-300 leading-relaxed custom-scrollbar">
          <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
            <p className="text-red-200 text-xs font-semibold">
              StonksAI is an Artificial Intelligence research tool. It does NOT provide financial advice, investment recommendations, or guarantees of profit.
            </p>
          </div>

          <h3 className="font-bold text-white mt-4">1. No Financial Advice</h3>
          <p>
            The content provided by StonksAI, including algorithmic analysis, "Alpha Hunter" results, options strategies, and market sentiment scores, is for <strong>informational and educational purposes only</strong>. Nothing contained in this application constitutes a solicitation, recommendation, endorsement, or offer to buy or sell any securities or other financial instruments.
          </p>

          <h3 className="font-bold text-white">2. AI Limitations & Accuracy</h3>
          <p>
            This application utilizes Generative AI (LLMs) to synthesize market data. AI models can hallucinate, misinterpret data, or provide outdated information. While we strive for accuracy by integrating real-time data sources (Polygon.io, Financial Datasets), we cannot guarantee the precision, completeness, or timeliness of any data points. <strong>Always verify data with official brokerage sources.</strong>
          </p>

          <h3 className="font-bold text-white">3. High Risk Warning</h3>
          <p>
            Trading stocks and options involves a <strong>high degree of risk</strong> and is not suitable for all investors. You could lose some or all of your initial investment. Options trading, in particular, carries significant risk due to leverage and time decay. Past performance of any trading system or methodology is not necessarily indicative of future results.
          </p>

          <h3 className="font-bold text-white">4. Limitation of Liability</h3>
          <p>
            By using this application, you acknowledge and agree that the developers, creators, and affiliates of StonksAI shall not be held liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use this service, or for any cost of procurement of substitute goods and services, or resulting from any trading losses incurred.
          </p>
          
          <p className="text-xs text-gray-500 mt-6 border-t border-gray-800 pt-4">
            By clicking "I Understand & Accept", you agree to the Terms of Service and acknowledge that you are solely responsible for your own investment decisions.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-800 bg-gray-900/50 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer group select-none">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${dontShowAgain ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600 bg-gray-800 group-hover:border-gray-500'}`}>
               {dontShowAgain && <CheckCircle size={14} className="text-black" />}
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            <span className="text-gray-400 text-sm group-hover:text-gray-300">Don't ask me again on this device</span>
          </label>

          <button 
            onClick={() => onAccept(dontShowAgain)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <ShieldAlert size={18} />
            I Understand & Accept
          </button>
        </div>

      </div>
    </div>
  );
};

export default DisclaimerModal;