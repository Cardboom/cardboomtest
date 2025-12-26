import { useState } from 'react';
import { GradingOrder } from '@/hooks/useGrading';
import { cn } from '@/lib/utils';

interface CardOverlayPreviewProps {
  order: GradingOrder;
}

export function CardOverlayPreview({ order }: CardOverlayPreviewProps) {
  const [showFront, setShowFront] = useState(true);
  
  const getGradeBadgeColor = (grade: number | null) => {
    if (!grade) return 'from-gray-500 to-gray-600';
    if (grade >= 9.5) return 'from-amber-400 to-yellow-500';
    if (grade >= 9) return 'from-emerald-400 to-green-500';
    if (grade >= 8) return 'from-blue-400 to-cyan-500';
    if (grade >= 7) return 'from-purple-400 to-violet-500';
    return 'from-gray-400 to-slate-500';
  };

  return (
    <div className="flex flex-col items-center">
      {/* Phone-style frame */}
      <div className="relative w-[280px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.5rem] p-3 shadow-2xl">
        {/* Phone notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl" />
        
        {/* Screen */}
        <div className="relative bg-black rounded-[2rem] overflow-hidden aspect-[9/16]">
          {/* Card image */}
          <div className="absolute inset-4 flex items-center justify-center">
            <div className="relative w-full max-w-[200px] aspect-[2.5/3.5]">
              <img
                src={showFront ? order.front_image_url || '' : order.back_image_url || ''}
                alt={showFront ? 'Card front' : 'Card back'}
                className="w-full h-full object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              
              {/* Overlay indicators - only show if we have coordinates */}
              {order.overlay_coordinates && order.completed_at && showFront && (
                <>
                  {/* Corner indicators */}
                  <div className="absolute top-1 left-1 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
                  <div className="absolute top-1 right-1 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
                  <div className="absolute bottom-1 left-1 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
                  <div className="absolute bottom-1 right-1 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br" />
                  
                  {/* Centering guides */}
                  <div className="absolute left-0 top-1/2 w-2 h-8 -translate-y-1/2 bg-blue-400/50 rounded-r" />
                  <div className="absolute right-0 top-1/2 w-2 h-8 -translate-y-1/2 bg-blue-400/50 rounded-l" />
                  <div className="absolute top-0 left-1/2 h-2 w-8 -translate-x-1/2 bg-blue-400/50 rounded-b" />
                  <div className="absolute bottom-0 left-1/2 h-2 w-8 -translate-x-1/2 bg-blue-400/50 rounded-t" />
                </>
              )}
            </div>
          </div>
          
          {/* Final grade badge */}
          {order.final_grade && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <div className={cn(
                'px-6 py-2 rounded-full bg-gradient-to-r shadow-lg',
                getGradeBadgeColor(order.final_grade)
              )}>
                <span className="text-white font-bold text-lg drop-shadow">
                  Final: {order.final_grade.toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toggle buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setShowFront(true)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            showFront 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          Front
        </button>
        <button
          onClick={() => setShowFront(false)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            !showFront 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          Back
        </button>
      </div>
    </div>
  );
}
