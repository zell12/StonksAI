
import React, { useState, useEffect } from 'react';
import { Shield, Key, Save, Database, Check, Eye, EyeOff, Users, Search, ToggleLeft, ToggleRight, Loader2, UserCheck, XCircle, Globe, Rocket, List, ChevronRight, Clock, Bot, Cpu, DollarSign, BarChart2, CreditCard } from 'lucide-react';
import { getApiKey } from '../services/financialData';
import { adminGetUser, adminToggleBeta, getSystemConfig, adminUpdateSystemConfig, adminListUsers, getAvailableModels, getSubscriptionTiers, updateSubscriptionTiers, adminGetApiKeys, adminUpdateApiKeys, UserProfile, ModelConfig, ModelOption, SubscriptionTier, ModuleLimits } from '../services/userService';

const AdminPanel: React.FC = () => {
  // State for API Keys
  const [keys, setKeys] = useState({
    polygon: '',
    twelve_data: '',
    financial_datasets: '',
    news_api: '',
    qandle: '',
    stripe_secret: '',
    stripe_webhook_secret: ''
  });

  const [visible, setVisible] = useState({
    polygon: false,
    twelve_data: false,
    financial_datasets: false,
    news_api: false,
    qandle: false,
    stripe_secret: false,
    stripe_webhook_secret: false
  });

  const [status, setStatus] = useState<string>('');
  const [keysLoading, setKeysLoading] = useState(false);

  // USER MANAGEMENT STATE
  const [activeTab, setActiveTab] = useState<'pending' | 'search'>('pending');
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  
  // Search State
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userMsg, setUserMsg] = useState('');

  // SYSTEM CONFIG STATE
  const [isGlobalBeta, setIsGlobalBeta] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [models, setModels] = useState<ModelConfig>({
      agent_model: 'gemini-3-flash-preview',
      reasoning_model: 'gemini-3-flash-preview'
  });
  
  // Dynamic Options (fetched from DB)
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  
  // SUBSCRIPTION TIERS STATE
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);

  useEffect(() => {
    // Initial Load
    const loadAll = async () => {
        // 1. Load Keys from Backend (Primary Source)
        const remoteKeys = await adminGetApiKeys();
        if (remoteKeys) {
            setKeys({
                polygon: remoteKeys.polygon || getApiKey('polygon'),
                twelve_data: remoteKeys.twelve_data || getApiKey('twelve_data'),
                financial_datasets: remoteKeys.financial_datasets || getApiKey('financial_datasets'),
                news_api: remoteKeys.news_api || getApiKey('news_api'),
                qandle: remoteKeys.qandle || getApiKey('qandle'),
                stripe_secret: remoteKeys.stripe_secret || '',
                stripe_webhook_secret: remoteKeys.stripe_webhook_secret || ''
            });
        } else {
            // Fallback to local storage
            setKeys({
              polygon: getApiKey('polygon'),
              twelve_data: getApiKey('twelve_data'),
              financial_datasets: getApiKey('financial_datasets'),
              news_api: getApiKey('news_api'),
              qandle: getApiKey('qandle'),
              stripe_secret: '',
              stripe_webhook_secret: ''
            });
        }

        // 2. Load Config, Options, Tiers
        const [config, opts, tierData] = await Promise.all([
            getSystemConfig(),
            getAvailableModels(),
            getSubscriptionTiers()
        ]);

        setIsGlobalBeta(config.beta_active);
        if (config.models) {
            setModels(config.models);
        }
        setAvailableModels(opts);
        setTiers(tierData);
    };
    loadAll();
    
    // Initial User List Load
    loadUserList(true);
  }, []);

  const loadUserList = async (reset = false) => {
      setListLoading(true);
      const lastCreated = (!reset && userList.length > 0) ? userList[userList.length - 1].createdAt : undefined;
      
      const res = await adminListUsers('pending', 10, lastCreated);
      
      if (reset) {
          setUserList(res.users);
      } else {
          setUserList(prev => [...prev, ...res.users]);
      }
      setHasMore(res.hasMore);
      setListLoading(false);
  };

  const handleSaveKeys = async () => {
    setKeysLoading(true);
    
    // 1. Save to Backend (Sync)
    const success = await adminUpdateApiKeys(keys);
    
    if (success) {
        // 2. Update Local Storage (For client-side fallback if backend unreachable)
        localStorage.setItem('quantai_api_polygon', keys.polygon);
        localStorage.setItem('quantai_api_twelve_data', keys.twelve_data);
        localStorage.setItem('quantai_api_financial_datasets', keys.financial_datasets);
        localStorage.setItem('quantai_api_news_api', keys.news_api);
        localStorage.setItem('quantai_api_qandle', keys.qandle);
        // Stripe secret typically kept server-side, but saving here for consistency if needed by other client admin logic
        
        showStatus('API Configurations Synced to Backend');
    } else {
        showStatus('Failed to Sync Keys to Backend');
    }
    setKeysLoading(false);
  };

  const showStatus = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(''), 3000);
  };

  const toggleVisibility = (key: keyof typeof visible) => {
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- SEARCH LOGIC ---
  const handleUserSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!searchEmail) return;
      
      setUserLoading(true);
      setFoundUser(null);
      setUserMsg('');
      
      const user = await adminGetUser(searchEmail);
      if (user) {
          setFoundUser(user);
      } else {
          setUserMsg('User not found in database.');
      }
      setUserLoading(false);
  };

  const handleToggleBeta = async (user: UserProfile) => {
      const newStatus = !user.betauser;
      
      // Update UI Optimistically
      if (activeTab === 'search' && foundUser && foundUser.email === user.email) {
          setFoundUser({ ...foundUser, betauser: newStatus });
      } else {
          // If in list, remove from Pending list if approved, or update status
          if (newStatus === true) {
              setUserList(prev => prev.filter(u => u.email !== user.email));
          }
      }
      
      const success = await adminToggleBeta(user.email, newStatus);
      if(success) {
          showStatus(`User ${user.email} ${newStatus ? 'APPROVED' : 'REVOKED'}`);
      } else {
          // Revert on fail
          showStatus('Update Failed');
          loadUserList(true); // Refresh
      }
  };

  const handleToggleGlobalBeta = async () => {
      setConfigLoading(true);
      const newStatus = !isGlobalBeta;
      const success = await adminUpdateSystemConfig({ beta_active: newStatus });
      if(success) {
          setIsGlobalBeta(newStatus);
          showStatus(newStatus ? 'Beta Gate ACTIVATED (Closed Beta)' : 'Beta Gate DEACTIVATED (Public Launch)');
      } else {
          showStatus('Failed to update system configuration.');
      }
      setConfigLoading(false);
  };

  const handleSaveModels = async () => {
      setConfigLoading(true);
      const success = await adminUpdateSystemConfig({ models: models });
      if (success) {
          // Update local storage immediately for this session
          localStorage.setItem('quantai_model_config', JSON.stringify(models));
          showStatus("AI Model Settings Updated & Propagated");
      } else {
          showStatus("Failed to update model settings.");
      }
      setConfigLoading(false);
  };

  // --- SUBSCRIPTION TIER LOGIC ---
  const handleTierChange = (index: number, field: string, value: any) => {
      const newTiers = [...tiers];
      
      if (field === 'price') {
          newTiers[index].price = Number(value);
      } else if (field === 'enabled') {
          newTiers[index].enabled = value;
      } else if (field === 'description' || field === 'stripePriceId') {
          // String fields
          (newTiers[index] as any)[field] = value;
      } else {
          // Assume limit field
          newTiers[index].limits[field as keyof ModuleLimits] = Number(value);
      }
      setTiers(newTiers);
  };

  const handleSaveTiers = async () => {
      setTiersLoading(true);
      const success = await updateSubscriptionTiers(tiers);
      if (success) {
          showStatus("Subscription Tiers Updated Successfully");
      } else {
          showStatus("Failed to update subscription tiers.");
      }
      setTiersLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-red-500/10 p-3 rounded-2xl border border-red-500/20">
          <Shield size={32} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">System Administration</h1>
          <p className="text-gray-400">Manage integration nodes and security protocols.</p>
        </div>
      </div>

      {status && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 fixed bottom-4 right-4 z-50 shadow-2xl animate-in slide-in-from-bottom-4">
          <Check size={20} />
          {status}
        </div>
      )}

      {/* MISSION CONTROL (Global Settings) */}
      <div className="bg-[#0b0f19] border border-gray-800 rounded-3xl overflow-hidden relative">
         <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
             <Rocket size={100} className="text-white" />
         </div>
         <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex items-center gap-2">
            <Globe size={20} className="text-orange-400" />
            <h2 className="font-bold text-white">Mission Control</h2>
         </div>
         <div className="p-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div>
                     <h3 className="font-bold text-lg text-white mb-1">Application State</h3>
                     <p className="text-sm text-gray-400 max-w-md">
                         {isGlobalBeta 
                            ? "Current State: CLOSED BETA. Only users with the 'betauser' flag can access the dashboard."
                            : "Current State: PUBLIC LAUNCH. All users can access the dashboard, regardless of flag."
                         }
                     </p>
                 </div>
                 <button 
                    onClick={handleToggleGlobalBeta}
                    disabled={configLoading}
                    className={`flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-bold transition-all shadow-lg min-w-[200px] ${
                        isGlobalBeta 
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20' 
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                    }`}
                 >
                    {configLoading ? <Loader2 className="animate-spin" /> : (
                        <>
                            {isGlobalBeta ? <ToggleLeft size={24} /> : <ToggleRight size={24} />}
                            {isGlobalBeta ? 'Beta Mode Active' : 'Public Launch Active'}
                        </>
                    )}
                 </button>
             </div>
         </div>
      </div>

      {/* SUBSCRIPTION ECONOMICS */}
      <div className="bg-[#0b0f19] border border-gray-800 rounded-3xl overflow-hidden relative">
         <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-400" />
            <h2 className="font-bold text-white">Subscription Economics</h2>
         </div>
         <div className="p-0 overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[900px]">
                 <thead>
                     <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider bg-gray-900/20">
                         <th className="p-4 font-semibold w-16">Status</th>
                         <th className="p-4 font-semibold w-32">Tier Name</th>
                         <th className="p-4 font-semibold w-24">Price ($)</th>
                         <th className="p-4 font-semibold w-32">Stripe Price ID</th>
                         <th className="p-4 font-semibold">Description</th>
                         <th className="p-4 font-semibold w-20">Sentiment</th>
                         <th className="p-4 font-semibold w-20">Screener</th>
                         <th className="p-4 font-semibold w-20">Analysis</th>
                         <th className="p-4 font-semibold w-20">Options</th>
                         <th className="p-4 font-semibold w-20">Portfolio</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-800">
                     {tiers.map((tier, idx) => (
                         <tr key={tier.id} className="hover:bg-gray-900/30 transition-colors">
                             <td className="p-4 text-center">
                                 <button 
                                    onClick={() => handleTierChange(idx, 'enabled', !tier.enabled)}
                                    className={`text-gray-400 hover:text-white transition-colors ${tier.enabled ? 'text-emerald-500' : 'text-gray-600'}`}
                                 >
                                     {tier.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                 </button>
                             </td>
                             <td className="p-4">
                                 <div className="font-bold text-white">{tier.name}</div>
                                 <div className="text-xs text-gray-500 font-mono">{tier.id}</div>
                             </td>
                             <td className="p-4">
                                 <input 
                                    type="number" 
                                    value={tier.price}
                                    onChange={(e) => handleTierChange(idx, 'price', e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white focus:border-emerald-500 outline-none text-right"
                                 />
                             </td>
                             <td className="p-4">
                                 <input 
                                    type="text" 
                                    value={tier.stripePriceId || ''}
                                    onChange={(e) => handleTierChange(idx, 'stripePriceId', e.target.value)}
                                    placeholder="price_..."
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-1 text-xs text-violet-300 font-mono focus:border-violet-500 outline-none"
                                 />
                             </td>
                             <td className="p-4">
                                 <input 
                                    type="text" 
                                    value={tier.description || ''}
                                    onChange={(e) => handleTierChange(idx, 'description', e.target.value)}
                                    placeholder="Tier tagline..."
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:border-blue-500 outline-none"
                                 />
                             </td>
                             <td className="p-4">
                                 <input 
                                    type="number" 
                                    value={tier.limits.sentiment}
                                    onChange={(e) => handleTierChange(idx, 'sentiment', e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:border-blue-500 outline-none text-right"
                                 />
                             </td>
                             <td className="p-4">
                                 <input 
                                    type="number" 
                                    value={tier.limits.screener}
                                    onChange={(e) => handleTierChange(idx, 'screener', e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:border-blue-500 outline-none text-right"
                                 />
                             </td>
                             <td className="p-4">
                                 <input 
                                    type="number" 
                                    value={tier.limits.analysis}
                                    onChange={(e) => handleTierChange(idx, 'analysis', e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:border-blue-500 outline-none text-right"
                                 />
                             </td>
                             <td className="p-4">
                                 <input 
                                    type="number" 
                                    value={tier.limits.options}
                                    onChange={(e) => handleTierChange(idx, 'options', e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:border-blue-500 outline-none text-right"
                                 />
                             </td>
                             <td className="p-4">
                                 <input 
                                    type="number" 
                                    value={tier.limits.portfolio}
                                    onChange={(e) => handleTierChange(idx, 'portfolio', e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:border-blue-500 outline-none text-right"
                                 />
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         </div>
         <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end">
            <button 
                onClick={handleSaveTiers}
                disabled={tiersLoading}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
            >
                {tiersLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Update Tiers
            </button>
         </div>
      </div>

      {/* AI MODEL GOVERNANCE */}
      <div className="bg-[#0b0f19] border border-gray-800 rounded-3xl overflow-hidden relative">
         <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex items-center gap-2">
            <Bot size={20} className="text-emerald-400" />
            <h2 className="font-bold text-white">AI Model Governance</h2>
         </div>
         <div className="p-8">
             <div className="grid md:grid-cols-2 gap-8 mb-6">
                
                {/* Agent Model Selector */}
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400">
                            <Cpu size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Agent Model</h3>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Multi-step Tool Use</p>
                        </div>
                    </div>
                    
                    <select 
                        value={models.agent_model}
                        onChange={(e) => setModels({...models, agent_model: e.target.value})}
                        className="w-full bg-gray-950 border border-gray-700 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none mb-3"
                    >
                        {availableModels.map(m => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                    </select>
                    
                    {/* Dynamic description of selected model */}
                    <div className="bg-blue-900/10 border border-blue-500/10 rounded-lg p-3">
                         <p className="text-xs text-blue-300/80">
                            <strong>Selected:</strong> {availableModels.find(m => m.id === models.agent_model)?.desc || "Unknown Model"}
                         </p>
                    </div>
                </div>

                {/* Reasoning Model Selector */}
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-violet-500/10 p-2 rounded-lg text-violet-400">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Reasoning Model</h3>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Complex Synthesis</p>
                        </div>
                    </div>
                    
                    <select 
                        value={models.reasoning_model}
                        onChange={(e) => setModels({...models, reasoning_model: e.target.value})}
                        className="w-full bg-gray-950 border border-gray-700 text-white rounded-xl px-4 py-3 focus:border-violet-500 focus:outline-none mb-3"
                    >
                        {availableModels.map(m => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                    </select>

                    <div className="bg-violet-900/10 border border-violet-500/10 rounded-lg p-3">
                         <p className="text-xs text-violet-300/80">
                            <strong>Selected:</strong> {availableModels.find(m => m.id === models.reasoning_model)?.desc || "Unknown Model"}
                         </p>
                    </div>
                </div>
             </div>

             <div className="flex justify-end">
                <button 
                    onClick={handleSaveModels}
                    disabled={configLoading}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                >
                    {configLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Update AI Config
                </button>
             </div>
         </div>
      </div>
      
    {/* USER MANAGEMENT SECTION */}
      <div className="bg-[#0b0f19] border border-gray-800 rounded-3xl overflow-hidden min-h-[400px]">
         <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Users size={20} className="text-blue-400" />
                <h2 className="font-bold text-white">User Registry</h2>
            </div>
            
            {/* TABS */}
            <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
                <button 
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <List size={14} /> Pending Queue
                </button>
                <button 
                  onClick={() => setActiveTab('search')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'search' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <Search size={14} /> Quick Lookup
                </button>
            </div>
         </div>
         
         <div className="p-0">
            {activeTab === 'pending' ? (
                // PENDING LIST VIEW
                <div>
                   <div className="overflow-x-auto">
                       <table className="w-full text-left border-collapse">
                           <thead>
                               <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider bg-gray-900/20">
                                   <th className="p-4 font-semibold">User</th>
                                   <th className="p-4 font-semibold">Registered</th>
                                   <th className="p-4 font-semibold text-center">Status</th>
                                   <th className="p-4 font-semibold text-right">Action</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-800">
                               {userList.map((user) => (
                                   <tr key={user.email} className="hover:bg-gray-900/50 transition-colors group">
                                       <td className="p-4">
                                           <div className="flex items-center gap-3">
                                               <img src={user.picture} className="w-8 h-8 rounded-full bg-gray-800" alt="" />
                                               <div>
                                                   <p className="text-sm font-bold text-white">{user.name}</p>
                                                   <p className="text-xs text-gray-500">{user.email}</p>
                                               </div>
                                           </div>
                                       </td>
                                       <td className="p-4">
                                           <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                               <Clock size={12} />
                                               {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                           </div>
                                       </td>
                                       <td className="p-4 text-center">
                                           <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase">
                                               <XCircle size={10} /> Pending
                                           </span>
                                       </td>
                                       <td className="p-4 text-right">
                                           <button 
                                              onClick={() => handleToggleBeta(user)}
                                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-900/20"
                                           >
                                               Approve Access
                                           </button>
                                       </td>
                                   </tr>
                               ))}
                               {userList.length === 0 && !listLoading && (
                                   <tr>
                                       <td colSpan={4} className="p-8 text-center text-gray-500">
                                           No pending requests found.
                                       </td>
                                   </tr>
                               )}
                           </tbody>
                       </table>
                   </div>
                   
                   {/* Pagination Controls */}
                   {(hasMore || listLoading) && (
                       <div className="p-4 border-t border-gray-800 flex justify-center">
                           <button 
                              onClick={() => loadUserList()}
                              disabled={listLoading}
                              className="flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 disabled:opacity-50"
                           >
                               {listLoading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                               Load More Requests
                           </button>
                       </div>
                   )}
                </div>
            ) : (
                // SEARCH VIEW
                <div className="p-8">
                    <form onSubmit={handleUserSearch} className="flex gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3.5 text-gray-500" size={18} />
                            <input 
                                type="email" 
                                placeholder="Search user by email..."
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={userLoading || !searchEmail}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-bold transition-colors disabled:opacity-50"
                        >
                            {userLoading ? <Loader2 className="animate-spin" /> : 'Lookup'}
                        </button>
                    </form>

                    {userMsg && <p className="text-red-400 text-sm mb-4">{userMsg}</p>}

                    {foundUser && (
                        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 flex items-center justify-between animate-in fade-in">
                            <div className="flex items-center gap-4">
                                <img src={foundUser.picture} alt="" className="w-12 h-12 rounded-full border border-gray-700" />
                                <div>
                                    <h3 className="font-bold text-white">{foundUser.name}</h3>
                                    <p className="text-sm text-gray-500">{foundUser.email}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">Level {foundUser.level || 1}</span>
                                        {foundUser.betauser ? (
                                            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                                <UserCheck size={10} /> Beta Access
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                                                <XCircle size={10} /> Limited
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Beta Status</span>
                                <button 
                                    onClick={() => handleToggleBeta(foundUser)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${
                                        foundUser.betauser 
                                        ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-900/20' 
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                                >
                                    {foundUser.betauser ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                    {foundUser.betauser ? 'Enabled' : 'Disabled'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
         </div>
      </div>

      {/* Integration Configuration */}
      <div className="bg-[#0b0f19] border border-gray-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex items-center gap-2">
            <Database size={20} className="text-violet-400" />
            <h2 className="font-bold text-white">Integration Keys (Synced)</h2>
        </div>
        <div className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Polygon.io API Key</label>
                    <div className="relative">
                        <Key size={16} className="absolute left-3 top-3.5 text-gray-600" />
                        <input 
                            type={visible.polygon ? "text" : "password"}
                            value={keys.polygon}
                            onChange={(e) => setKeys({...keys, polygon: e.target.value})}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-12 text-white focus:border-violet-500 focus:outline-none transition-colors"
                        />
                        <button 
                          onClick={() => toggleVisibility('polygon')}
                          className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
                        >
                          {visible.polygon ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Twelve Data API Key</label>
                    <div className="relative">
                        <Key size={16} className="absolute left-3 top-3.5 text-gray-600" />
                        <input 
                            type={visible.twelve_data ? "text" : "password"}
                            value={keys.twelve_data}
                            onChange={(e) => setKeys({...keys, twelve_data: e.target.value})}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-12 text-white focus:border-violet-500 focus:outline-none transition-colors"
                        />
                         <button 
                          onClick={() => toggleVisibility('twelve_data')}
                          className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
                        >
                          {visible.twelve_data ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Financial Datasets Key</label>
                    <div className="relative">
                        <Key size={16} className="absolute left-3 top-3.5 text-gray-600" />
                        <input 
                            type={visible.financial_datasets ? "text" : "password"}
                            value={keys.financial_datasets}
                            onChange={(e) => setKeys({...keys, financial_datasets: e.target.value})}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-12 text-white focus:border-violet-500 focus:outline-none transition-colors"
                        />
                        <button 
                          onClick={() => toggleVisibility('financial_datasets')}
                          className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
                        >
                          {visible.financial_datasets ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">NewsAPI Key</label>
                    <div className="relative">
                        <Key size={16} className="absolute left-3 top-3.5 text-gray-600" />
                        <input 
                            type={visible.news_api ? "text" : "password"}
                            value={keys.news_api}
                            onChange={(e) => setKeys({...keys, news_api: e.target.value})}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-12 text-white focus:border-violet-500 focus:outline-none transition-colors"
                        />
                         <button 
                          onClick={() => toggleVisibility('news_api')}
                          className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
                        >
                          {visible.news_api ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
                 <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Qandle AI Key</label>
                    <div className="relative">
                        <Key size={16} className="absolute left-3 top-3.5 text-gray-600" />
                        <input 
                            type={visible.qandle ? "text" : "password"}
                            value={keys.qandle}
                            onChange={(e) => setKeys({...keys, qandle: e.target.value})}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-12 text-white focus:border-violet-500 focus:outline-none transition-colors"
                        />
                         <button 
                          onClick={() => toggleVisibility('qandle')}
                          className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
                        >
                          {visible.qandle ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Stripe Secret Key (Backend Only)</label>
                    <div className="relative">
                        <CreditCard size={16} className="absolute left-3 top-3.5 text-gray-600" />
                        <input 
                            type={visible.stripe_secret ? "text" : "password"}
                            value={keys.stripe_secret}
                            onChange={(e) => setKeys({...keys, stripe_secret: e.target.value})}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-12 text-white focus:border-violet-500 focus:outline-none transition-colors"
                        />
                         <button 
                          onClick={() => toggleVisibility('stripe_secret')}
                          className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
                        >
                          {visible.stripe_secret ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Stripe Webhook Secret (whsec_...)</label>
                    <div className="relative">
                        <Shield size={16} className="absolute left-3 top-3.5 text-gray-600" />
                        <input 
                            type={visible.stripe_webhook_secret ? "text" : "password"}
                            value={keys.stripe_webhook_secret}
                            onChange={(e) => setKeys({...keys, stripe_webhook_secret: e.target.value})}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-12 text-white focus:border-violet-500 focus:outline-none transition-colors"
                        />
                         <button 
                          onClick={() => toggleVisibility('stripe_webhook_secret')}
                          className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
                        >
                          {visible.stripe_webhook_secret ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="pt-4 flex justify-end">
                <button 
                    onClick={handleSaveKeys}
                    disabled={keysLoading}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-violet-900/20 disabled:opacity-50"
                >
                    {keysLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Sync Configurations
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
