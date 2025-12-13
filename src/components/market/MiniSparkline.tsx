import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface MiniSparklineProps {
  data: number[];
  positive?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export const MiniSparkline = ({ 
  data, 
  positive = true, 
  width = 60, 
  height = 24,
  className 
}: MiniSparklineProps) => {
  const path = useMemo(() => {
    if (data.length < 2) return '';
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }, [data, width, height]);

  return (
    <svg 
      width={width} 
      height={height} 
      className={cn("overflow-visible", className)}
    >
      <path
        d={path}
        fill="none"
        stroke={positive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
