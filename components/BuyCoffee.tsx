import React from 'react';
import { Coffee, Rocket, Gem, Hand, FileText, Target, Heart, ArrowUpRight, Zap, Crown } from 'lucide-react';

const BuyCoffee: React.FC = () => {
  const tiers = [
    {
      id: 'paper',
      title: 'Paper Hands',
      price: '$3',
      desc: "Hey, it's a start! Every bit helps keep the servers running.",
      emoji: '📄🙌',
      icon: <FileText size={32} />,
      color: 'gray',
      grad: 'from-gray-700 to-gray-500',
      link: 'https://11c9ea92-5fe9-49a9-8707-c345ab9b5d8f.paylinks.godaddy.com/paper-hands'
    },
    {
      id: 'hodl',
      title: 'HODLer',
      price: '$10',
      desc: "You believe in the vision. This covers real infrastructure costs.",
      emoji: '💎',
      icon: <Hand size={32} />,
      color: 'blue',
      grad: 'from-blue-600 to-cyan-500',
      popular: true,
      link: 'https://11c9ea92-5fe9-49a9-8707-c345ab9b5d8f.paylinks.godaddy.com/hodler'
    },
    {
      id: 'diamond',
      title: 'Diamond Hands',
      price: '$25',
      desc: "True conviction. You're funding actual feature development.",
      emoji: '💎🙌',
      icon: <Gem size={32} />,
      color: 'violet',
      grad: 'from-violet-600 to-fuchsia-500',
      link: 'https://11c9ea92-5fe9-49a9-8707-c345ab9b5d8f.paylinks.godaddy.com/diamond'
    },
    {
      id: 'ape',
      title: 'Ape Strong',
      price: '$50',
      desc: "To the moon! This level of support makes new features possible.",
      emoji: '🚀🦍',
      icon: <Rocket size={32} />,
      color: 'orange',
      grad: 'from-orange-500 to-yellow-500',
      glow: true,
      link: 'https://11c9ea92-5fe9-49a9-8707-c345ab9b5d8f.paylinks.godaddy.com/ape-strong'
    },
    {
      id: 'custom',
      title: 'Market Maker',
      price: 'Name your price',
      desc: "Feeling generous? Set your own amount and become a true market maker!",
      emoji: '🎯',
      icon: <Target size={32} />,
      color: 'emerald',
      grad: 'from-emerald-600 to-emerald-400',
      link: 'https://11c9ea92-5fe9-49a9-8707-c345ab9b5d8f.paylinks.godaddy.com/stonks'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto pb-20 relative">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-yellow-600/5 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>

      <div className="text-center mb-16 relative z-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-3xl mb-6 border border-yellow-500/30 shadow-[0_0_40px_-10px_rgba(234,179,8,0.3)]">
           <Coffee className="text-yellow-400" size={40} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Liquidity Injection
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Keeping an AI financial agent running isn't cheap. Fuel the infrastructure and help us keep the servers executing at light speed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {tiers.map((tier) => (
          <a
            key={tier.id}
            href={tier.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`
                relative group flex flex-col p-6 rounded-3xl border transition-all duration-300 overflow-hidden
                ${tier.glow ? 'shadow-[0_0_50px_-10px_rgba(249,115,22,0.15)] hover:shadow-[0_0_60px_-5px_rgba(249,115,22,0.3)]' : 'shadow-lg'}
                bg-gray-900/40 backdrop-blur-sm hover:bg-gray-800/60 hover:-translate-y-2
                ${tier.popular ? 'border-blue-500/50 scale-[1.02] z-10' : 'border-gray-800 hover:border-gray-600'}
            `}
          >
            {/* Hover Gradient Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${tier.grad} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
            
            {tier.popular && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    Most Popular
                </div>
            )}
            
            {tier.glow && (
                 <div className="absolute -top-10 -right-10 w-24 h-24 bg-orange-500/20 blur-2xl rounded-full group-hover:bg-orange-500/40 transition-colors"></div>
            )}

            <div className="flex items-center justify-between mb-6 relative">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${tier.grad} text-white shadow-lg`}>
                    {tier.icon}
                </div>
                <div className="text-right">
                    <span className="text-3xl font-black text-white block">{tier.price}</span>
                    <span className="text-2xl">{tier.emoji}</span>
                </div>
            </div>

            <div className="flex-1 relative">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                    {tier.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed font-medium">
                    {tier.desc}
                </p>
            </div>

            <div className="mt-8 relative">
                <div className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                    ${tier.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 
                      tier.color === 'orange' ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg' :
                      'bg-gray-800 text-gray-300 group-hover:bg-gray-700 group-hover:text-white'}
                `}>
                   {tier.id === 'custom' ? 'Set Amount' : 'Inject Capital'}
                   <ArrowUpRight size={18} />
                </div>
            </div>
          </a>
        ))}
      </div>

      {/* Trust Indicator */}
      <div className="mt-16 text-center">
         <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gray-900 border border-gray-800 text-xs text-gray-500 uppercase tracking-widest">
            <Zap size={14} className="text-yellow-500" />
            <span>Secure Transaction via GoDaddy PayLinks</span>
         </div>
      </div>

    </div>
  );
};

export default BuyCoffee;
