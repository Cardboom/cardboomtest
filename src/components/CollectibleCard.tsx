import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ShoppingCart, Heart, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collectible } from '@/types/collectible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LiveTickerPrice } from './LiveTickerPrice';
import { formatGrade } from '@/hooks/useGradePrices';
import { CardPlaceholder } from './market/CardPlaceholder';
import { MiniSparkline } from './market/MiniSparkline';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { GradeBadge } from '@/components/ui/grade-badge';
import { formatCategoryName } from '@/lib/categoryFormatter';

// Convert ISO country code to flag emoji
const getCountryFlag = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};
interface CollectibleCardProps {
  collectible: Collectible;
  onAddToCart: (collectible: Collectible) => void;
  onClick: (collectible: Collectible) => void;
}

export const CollectibleCard = ({ collectible, onAddToCart, onClick }: CollectibleCardProps) => {
  const navigate = useNavigate();
  const [isFavorited, setIsFavorited] = useState(false);
  const [displayPrice, setDisplayPrice] = useState(collectible.price);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef(collectible.price);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const animationRef = useRef<number>();
  const isPositive = collectible.priceChange >= 0;

  const handleGoToCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/item/${collectible.id}`, '_blank', 'noopener,noreferrer');
  };

  // Generate sparkline data based on price change trend
  const sparklineData = useMemo(() => {
    const basePrice = collectible.price;
    const changePercent = collectible.priceChange / 100;
    const startPrice = basePrice / (1 + changePercent);
    
    // Generate 8 data points showing the trend
    return Array.from({ length: 8 }, (_, i) => {
      const progress = i / 7;
      const trend = startPrice + (basePrice - startPrice) * progress;
      // Add small random variations for realism
      const variation = trend * (Math.sin(i * 1.5) * 0.02);
      return trend + variation;
    });
  }, [collectible.price, collectible.priceChange]);

  // Animate price changes
  useEffect(() => {
    if (collectible.price !== prevPriceRef.current) {
      const direction = collectible.price > prevPriceRef.current ? 'up' : 'down';
      setPriceDirection(direction);
      
      // Animate the price change
      const startPrice = prevPriceRef.current;
      const endPrice = collectible.price;
      const duration = 800;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentPrice = startPrice + (endPrice - startPrice) * easeOutQuart;
        
        setDisplayPrice(currentPrice);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayPrice(endPrice);
          timeoutRef.current = setTimeout(() => setPriceDirection(null), 500);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
      prevPriceRef.current = collectible.price;
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [collectible.price]);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
    toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleCardClick = () => {
    // For listings, open in new tab directly
    if ((collectible as any).source === 'listing' && (collectible as any).listingId) {
      const url = `/listing/${(collectible as any).category || 'other'}/${(collectible as any).listingId}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      onClick(collectible);
    }
  };

  return (
    <div
      className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-500 hover:scale-[1.02] cursor-pointer animate-fade-in shadow-sm"
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-secondary to-muted overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent z-10" />
        {collectible.image ? (
          <img
            src={getThumbnailUrl(collectible.image)}
            alt={collectible.name}
            width={300}
            height={300}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              // Hide broken image and show placeholder
              e.currentTarget.style.display = 'none';
              const placeholder = e.currentTarget.nextElementSibling;
              if (placeholder) placeholder.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={cn("w-full h-full", collectible.image ? "hidden" : "")}>
          <CardPlaceholder
            name={collectible.name}
            category={collectible.category}
            setName={collectible.brand}
            rarity={collectible.rarity}
            className="w-full h-full aspect-square"
          />
        </div>
        
        {/* Rarity Badge */}
        <div className={cn(
          'absolute top-3 left-3 z-20 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider backdrop-blur-sm',
          collectible.rarity === 'grail' && 'bg-gold/20 text-gold border border-gold/30',
          collectible.rarity === 'legendary' && 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
          collectible.rarity === 'rare' && 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
          collectible.rarity === 'common' && 'bg-platinum/20 text-platinum border border-platinum/30'
        )}>
          {collectible.rarity}
        </div>

        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFavorite}
          className={cn(
            "absolute top-3 right-3 z-20 w-8 h-8 rounded-full backdrop-blur-sm transition-all",
            isFavorited 
              ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" 
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
          )}
        >
          <Heart className={cn("w-4 h-4", isFavorited && "fill-current")} />
        </Button>

        {/* Trending Badge */}
        {collectible.trending && (
          <div className="absolute bottom-3 left-3 z-20 px-2 py-1 rounded-md text-xs font-bold bg-primary/20 text-primary border border-primary/30 backdrop-blur-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            HOT
          </div>
        )}

        {/* Grading Badge - top right below favorite button */}
        {collectible.grade && (
          <div className="absolute bottom-3 right-3 z-20">
            <GradeBadge 
              gradingCompany={(collectible as any).gradingCompany || (collectible.grade.startsWith('psa') ? 'PSA' : collectible.grade.startsWith('bgs') ? 'BGS' : collectible.grade.startsWith('cgc') ? 'CGC' : null)}
              grade={collectible.grade.replace(/^(psa|bgs|cgc)/, '').replace('_', '.').toUpperCase()}
              showUngraded={false}
              className="text-xs"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {collectible.name}
          </h3>
        </div>

        {/* Seller Info with Country Flag */}
        {collectible.sellerUsername && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <span className="text-lg leading-none" title={collectible.sellerCountryCode}>
              {getCountryFlag(collectible.sellerCountryCode || 'TR')}
            </span>
            <span className="font-medium text-foreground/80">{collectible.sellerUsername}</span>
          </div>
        )}

        {/* Category Badge - Always visible on mobile */}
        <div className="mb-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {formatCategoryName(collectible.category)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
          {collectible.grade && (
            <span className={cn(
              "px-2 py-0.5 rounded font-semibold",
              collectible.grade === 'psa10' && "bg-gold/20 text-gold",
              collectible.grade === 'psa9' && "bg-purple-500/20 text-purple-400",
              collectible.grade === 'psa8' && "bg-blue-500/20 text-blue-400",
              collectible.grade === 'bgs10' && "bg-gold/20 text-gold",
              collectible.grade === 'bgs9_5' && "bg-purple-500/20 text-purple-400",
              collectible.grade === 'cgc10' && "bg-emerald-500/20 text-emerald-400",
              !['psa10', 'psa9', 'psa8', 'bgs10', 'bgs9_5', 'cgc10'].includes(collectible.grade) && "bg-secondary text-muted-foreground"
            )}>
              {formatGrade(collectible.grade)}
            </span>
          )}
          {collectible.year && (
            <>
              <span>{collectible.year}</span>
            </>
          )}
          {collectible.condition && (
            <>
              <span>•</span>
              <span>{collectible.condition}</span>
            </>
          )}
        </div>

        {/* Price Section with Live Ticker and Sparkline */}
        <div className="flex items-end justify-between">
          <div className="flex-1">
            <div className="text-2xl font-bold font-display text-foreground">
              <LiveTickerPrice 
                value={collectible.price} 
                tickInterval={3000}
                volatility={0.003}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1 text-sm font-medium',
                isPositive ? 'text-gain' : 'text-loss'
              )}>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {isPositive ? '+' : ''}{collectible.priceChange.toFixed(1)}%
              </div>
              <MiniSparkline 
                data={sparklineData} 
                positive={isPositive}
                width={40}
                height={16}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToCard}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Go To Card
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(collectible);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};