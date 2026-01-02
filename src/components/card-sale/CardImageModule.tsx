import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { 
  ZoomIn, Maximize2, RotateCcw, ImagePlus, Loader2,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardImageModuleProps {
  imageUrl?: string;
  backImageUrl?: string;
  name: string;
  grade?: string;
  condition?: string;
  onGenerateImage?: () => void;
  isGenerating?: boolean;
}

export const CardImageModule = ({
  imageUrl,
  backImageUrl,
  name,
  grade,
  condition = 'Near Mint',
  onGenerateImage,
  isGenerating,
}: CardImageModuleProps) => {
  const [showFront, setShowFront] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentImage = showFront ? imageUrl : (backImageUrl || imageUrl);
  const hasBackImage = !!backImageUrl;

  const getGradeColor = (gradeStr?: string) => {
    if (!gradeStr) return 'bg-muted text-muted-foreground';
    const grade = gradeStr.toLowerCase();
    if (grade.includes('10') || grade.includes('gem')) return 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black';
    if (grade.includes('9.5')) return 'bg-gradient-to-r from-violet-500 to-purple-400 text-white';
    if (grade.includes('9')) return 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white';
    return 'bg-secondary text-secondary-foreground';
  };

  const getConditionColor = (cond: string) => {
    const c = cond.toLowerCase();
    if (c === 'mint' || c === 'gem mint') return 'bg-gain/20 text-gain border-gain/30';
    if (c === 'near mint') return 'bg-primary/20 text-primary border-primary/30';
    if (c === 'excellent') return 'bg-secondary text-secondary-foreground border-border';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <>
      <div className="relative group">
        {/* Main Image Container */}
        <div 
          className={cn(
            "glass rounded-2xl p-3 sm:p-4 aspect-square relative overflow-hidden cursor-zoom-in transition-transform duration-300",
            isZoomed && "scale-110"
          )}
          onClick={() => setIsFullscreen(true)}
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
        >
          {currentImage && !currentImage.startsWith('data:') && !currentImage.includes('placeholder') ? (
            <img 
              src={currentImage} 
              alt={name}
              className={cn(
                "w-full h-full object-contain rounded-xl transition-transform duration-500",
                isZoomed && "scale-125"
              )}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <ImagePlus className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50" />
              <p className="text-sm">No image available</p>
              {onGenerateImage && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateImage();
                  }}
                  disabled={isGenerating}
                  className="mt-4 gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                  Generate Image
                </Button>
              )}
            </div>
          )}

          {/* Grading Overlay */}
          {grade && (
            <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
              <Badge className={cn("gap-1 font-bold text-xs sm:text-sm py-1 px-2 sm:px-3", getGradeColor(grade))}>
                <Award className="w-3 h-3 sm:w-4 sm:h-4" />
                {grade.toUpperCase()}
              </Badge>
            </div>
          )}

          {/* Condition Tag Overlay */}
          <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
            <Badge variant="outline" className={cn("text-xs font-medium border", getConditionColor(condition))}>
              {condition}
            </Badge>
          </div>

          {/* Zoom/Fullscreen Controls */}
          <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-8 w-8 sm:h-9 sm:w-9 bg-background/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(true);
              }}
            >
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-8 w-8 sm:h-9 sm:w-9 bg-background/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(!isZoomed);
              }}
            >
              <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>

        {/* Front/Back Toggle */}
        {hasBackImage && (
          <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowFront(!showFront);
              }}
              className="gap-2 h-8 sm:h-9 text-xs sm:text-sm bg-background/80 backdrop-blur-sm"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {showFront ? 'Show Back' : 'Show Front'}
            </Button>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 bg-black/95">
          <DialogTitle className="sr-only">{name} - Full Image View</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img 
              src={currentImage || '/placeholder.svg'} 
              alt={name}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Fullscreen Overlays */}
            {grade && (
              <div className="absolute top-6 left-6">
                <Badge className={cn("gap-1 font-bold text-sm py-1.5 px-4", getGradeColor(grade))}>
                  <Award className="w-4 h-4" />
                  {grade.toUpperCase()}
                </Badge>
              </div>
            )}
            
            <div className="absolute top-6 right-6">
              <Badge variant="outline" className={cn("text-sm font-medium border", getConditionColor(condition))}>
                {condition}
              </Badge>
            </div>

            {hasBackImage && (
              <Button 
                variant="secondary" 
                size="lg"
                onClick={() => setShowFront(!showFront)}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                {showFront ? 'View Back' : 'View Front'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
