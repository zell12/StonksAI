import React, { useState } from 'react';

interface CompanyLogoProps {
  symbol: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({ symbol, className = '', size = 'md' }) => {
  const [error, setError] = useState(false);

  // Size mappings
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };
  
  const textSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  // Safe symbol handling to prevent crashes if API returns partial data
  const safeSymbol = symbol || '?';
  const displaySymbol = safeSymbol.split('.')[0].substring(0, 3).toUpperCase();

  // Fallback UI (Styled Text Avatar)
  if (error || !symbol) {
    return (
      <div className={`${sizeClasses[size]} ${textSizes[size]} shrink-0 rounded-lg bg-gray-800 flex items-center justify-center font-bold text-white border border-gray-700 shadow-inner ${className}`}>
        {displaySymbol}
      </div>
    );
  }

  // Logo UI (App Icon Style)
  return (
    <div className={`${sizeClasses[size]} shrink-0 relative rounded-lg overflow-hidden bg-white border border-gray-700 shadow-sm ${className}`}>
      <img
        src={`https://assets.parqet.com/logos/symbol/${symbol}?format=png`}
        alt={symbol}
        className="w-full h-full object-contain p-[10%]"
        onError={() => setError(true)}
        loading="lazy"
      />
    </div>
  );
};

export default CompanyLogo;