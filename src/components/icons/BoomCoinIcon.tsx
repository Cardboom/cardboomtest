import React from 'react';
import { cn } from '@/lib/utils';

interface BoomCoinIconProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Cute bomb/coin icon for Boom Coins currency
 * Designed to be friendly and match CardBoom's brand
 */
export const BoomCoinIcon: React.FC<BoomCoinIconProps> = ({ 
  className,
  size = 'md' 
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeClasses[size], className)}
    >
      {/* Main bomb body - cute rounded shape */}
      <circle
        cx="12"
        cy="13"
        r="9"
        className="fill-current"
        opacity="0.9"
      />
      
      {/* Highlight for 3D effect */}
      <circle
        cx="9"
        cy="10"
        r="3"
        className="fill-white"
        opacity="0.3"
      />
      
      {/* Fuse holder */}
      <rect
        x="10"
        y="2"
        width="4"
        height="3"
        rx="1"
        className="fill-current"
        opacity="0.7"
      />
      
      {/* Fuse */}
      <path
        d="M12 2 C14 0 16 1 15 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      
      {/* Sparkle on fuse tip */}
      <circle
        cx="15"
        cy="2.5"
        r="1.5"
        className="fill-amber-400"
      />
      <circle
        cx="15"
        cy="2.5"
        r="1"
        className="fill-amber-300"
      />
    </svg>
  );
};

export default BoomCoinIcon;
