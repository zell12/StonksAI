
import React from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  animated?: boolean;
  className?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', animated = false, className = '' }) => {
  const sizes = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
    '2xl': 'w-48 h-48'
  };

  return (
    <div className={`relative ${sizes[size]} ${className} group select-none`}>
       {/* CSS for specific logo animations */}
       <style>{`
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes rocket-fly {
           0% { transform: translate(0, 0); }
           50% { transform: translate(4px, -4px); } /* Move Diagonally Up-Right */
           100% { transform: translate(0, 0); }
        }
        @keyframes moon-glow {
           0%, 100% { filter: drop-shadow(0 0 2px rgba(251, 191, 36, 0.5)); }
           50% { filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.8)); }
        }
        @keyframes flame-flicker {
           0%, 100% { opacity: 1; transform: scale(1); }
           50% { opacity: 0.8; transform: scale(0.9); }
        }
        .pixel-text { font-family: 'Courier New', monospace; font-weight: bold; }
      `}</style>

      {/* Glow Container */}
      <div className={`absolute inset-0 bg-emerald-500/30 blur-xl rounded-full transition-all duration-500 ${animated ? 'opacity-60 scale-110' : 'opacity-0 group-hover:opacity-40'}`}></div>

      {/* MAIN SVG LOGO */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full relative z-10 drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision" 
      >
        <defs>
          <linearGradient id="crt-grad" x1="0" y1="0" x2="1" y2="1">
             <stop offset="0%" stopColor="#111827" />
             <stop offset="100%" stopColor="#000000" />
          </linearGradient>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1f2937" strokeWidth="1"/>
          </pattern>
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
             <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
             <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
             </feMerge>
          </filter>
        </defs>

        {/* 1. The "Monitor" Housing */}
        <rect x="5" y="5" width="90" height="90" rx="15" fill="#1f2937" stroke="#374151" strokeWidth="4" />
        
        {/* 2. The Screen */}
        <rect x="12" y="12" width="76" height="76" rx="4" fill="url(#crt-grad)" />
        <rect x="12" y="12" width="76" height="76" rx="4" fill="url(#grid)" opacity="0.3" />

        {/* 3. THE MOON (Accentuated) */}
        {/* Placed behind the graph line but on the screen */}
        <g className={animated ? "animate-[moon-glow_3s_infinite]" : ""}>
            <circle cx="75" cy="25" r="9" fill="#fbbf24" opacity="0.9" />
            {/* Craters */}
            <circle cx="72" cy="22" r="1.8" fill="#d97706" opacity="0.6" />
            <circle cx="78" cy="26" r="1.2" fill="#d97706" opacity="0.6" />
            <circle cx="74" cy="29" r="1.5" fill="#d97706" opacity="0.6" />
        </g>

        {/* 4. The Classic STONKS Zig-Zag Line (Up, Dip, MOON) */}
        {/* Shadow for depth */}
        <path 
          d="M 15 75 L 35 55 L 45 65 L 78 28" 
          fill="none" 
          stroke="#064e3b" 
          strokeWidth="8" 
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(2, 2)"
        />
        {/* Main Line - Ends right at the Moon */}
        <path 
          d="M 15 75 L 35 55 L 45 65 L 78 28" 
          fill="none" 
          stroke="#10b981" 
          strokeWidth="8" 
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={animated ? "url(#neon-glow)" : ""}
          className={animated ? "animate-[pulse_2s_ease-in-out_infinite]" : ""}
        />

        {/* 5. The Arrow Head (Intersecting the Moon) */}
        <path 
          d="M 78 28 L 64 34 L 78 44 Z" 
          fill="#10b981" 
          stroke="#10b981" 
          strokeWidth="2" 
          strokeLinejoin="round"
          filter="url(#neon-glow)" 
        />
        
        {/* 6. Terminal Elements - "$ STONKS" */}
        <text x="18" y="24" fill="#10b981" fontSize="9" className="pixel-text" opacity="0.9">$ STONKS</text>
        <rect x="66" y="17" width="4" height="8" fill="#10b981" className="animate-[blink-cursor_1s_infinite]" />

        {/* 7. CUSTOM VECTOR ROCKET */}
        {/* Placed at Bottom Left (25, 75) */}
        <g transform="translate(25, 75)">
            {/* Animation Group */}
            <g className={animated ? "animate-[rocket-fly_2s_ease-in-out_infinite]" : "group-hover:animate-[rocket-fly_0.5s_infinite]"}>
                 {/* Rotation Group: 45 degrees CLOCKWISE matches the trend line slope */}
                 <g transform="rotate(45)">
                     {/* Rocket Body (Pointing UP in local coords) */}
                     <path d="M 0 -10 C -4 -2 -4 5 0 10 C 4 5 4 -2 0 -10 Z" fill="#e5e7eb" stroke="#374151" strokeWidth="0.5" />
                     {/* Fins */}
                     <path d="M -4 5 L -7 11 L 0 9 L 7 11 L 4 5" fill="#ef4444" stroke="#991b1b" strokeWidth="0.5" />
                     {/* Window */}
                     <circle cx="0" cy="-2" r="2.5" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="0.5" />
                     {/* Flame */}
                     <path d="M 0 10 L -2 16 L 0 14 L 2 16 Z" fill="#f59e0b" className={animated ? "animate-[flame-flicker_0.2s_infinite]" : ""} />
                 </g>
            </g>
        </g>
      </svg>
    </div>
  );
};

export default BrandLogo;
