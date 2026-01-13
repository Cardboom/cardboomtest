import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Check, AlertCircle, ImageIcon, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/categoryLabels';

interface Listing {
  id: string;
  title: string;
  category: string;
  condition: string;
  price: number;
  image_url: string | null;
  front_image_url: string | null;
  back_image_url: string | null;
  status: string;
  grading_order_id: string | null;
  cbgi_score: number | null;
}

interface ListingSelectorProps {
  onSelect: (listing: Listing | null) => void;
  selectedListing: Listing | null;
  className?: string;
}

export function ListingSelector({ onSelect, selectedListing, className }: ListingSelectorProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user's active listings that haven't been graded yet
        const { data, error } = await supabase
          .from('listings')
          .select('id, title, category, condition, price, image_url, front_image_url, back_image_url, status, grading_order_id, cbgi_score')
          .eq('seller_id', user.id)
          .eq('status', 'active')
          .neq('category', 'coaching') // Exclude coaching listings from grading
          .is('cbgi_score', null) // Not yet graded
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setListings(data || []);
      } catch (err) {
        console.error('Error fetching listings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const getMissingImages = (listing: Listing) => {
    const missing: string[] = [];
    // Check if we have front and back - image_url counts as front if front_image_url is missing
    const hasFront = listing.front_image_url || listing.image_url;
    const hasBack = listing.back_image_url;
    
    if (!hasFront) missing.push('front');
    if (!hasBack) missing.push('back');
    return missing;
  };

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Package className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No active listings to grade</p>
          <p className="text-xs text-muted-foreground mt-1">Create a listing first or upload a new card</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className={cn("h-[300px] pr-4", className)}>
      <div className="space-y-2">
        {listings.map((listing) => {
          const missingImages = getMissingImages(listing);
          const isSelected = selectedListing?.id === listing.id;
          
          return (
            <button
              key={listing.id}
              onClick={() => onSelect(isSelected ? null : listing)}
              className={cn(
                "w-full p-3 rounded-xl border-2 transition-all text-left flex gap-3",
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50 bg-card"
              )}
            >
              {/* Thumbnail */}
              <div className="w-16 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                {listing.image_url || listing.front_image_url ? (
                  <img 
                    src={listing.front_image_url || listing.image_url || ''} 
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{listing.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {getCategoryLabel(listing.category)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{listing.condition}</span>
                </div>
                
                {/* Missing images indicator */}
                {missingImages.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-amber-500">
                    <Camera className="h-3 w-3" />
                    <span>Need to upload: {missingImages.join(' & ')}</span>
                  </div>
                )}
              </div>
              
              {/* Selection indicator */}
              <div className="flex-shrink-0 self-center">
                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export default ListingSelector;
