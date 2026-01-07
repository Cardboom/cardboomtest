import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Store, CheckSquare, Square, ArrowRight, Sparkles } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface Listing {
  id: string;
  title: string;
  image_url: string | null;
  price: number;
  category?: string;
  condition?: string;
  certification_status?: string;
  grading_order_id?: string | null;
}

interface BulkGradingPanelProps {
  listings: Listing[];
  onNavigateToListing?: (id: string) => void;
}

export function BulkGradingPanel({ listings, onNavigateToListing }: BulkGradingPanelProps) {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Filter ungraded listings
  const ungradedListings = listings.filter(l => 
    !l.grading_order_id && l.certification_status !== 'completed' && l.certification_status !== 'pending'
  );

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === ungradedListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ungradedListings.map(l => l.id)));
    }
  };

  const handleBulkGrade = () => {
    if (selectedIds.size === 0) return;
    // Navigate to grading page with selected listing IDs
    const ids = Array.from(selectedIds).join(',');
    navigate(`/grading/new?listings=${ids}`);
  };

  if (listings.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Listed for Sale
            <Badge variant="secondary" className="ml-2">{listings.length}</Badge>
            <Badge variant="outline" className="ml-1 text-xs">Included in Portfolio</Badge>
          </CardTitle>
          
          {ungradedListings.length > 0 && (
            <div className="flex items-center gap-2">
              {bulkMode ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    className="text-xs"
                  >
                    {selectedIds.size === ungradedListings.length ? (
                      <>
                        <Square className="w-4 h-4 mr-1" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4 mr-1" />
                        Select All ({ungradedListings.length})
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBulkMode(false);
                      setSelectedIds(new Set());
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBulkGrade}
                    disabled={selectedIds.size === 0}
                    className="bg-gradient-to-r from-primary to-blue-500"
                  >
                    <Award className="w-4 h-4 mr-1" />
                    Grade {selectedIds.size} Card{selectedIds.size !== 1 ? 's' : ''}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkMode(true)}
                  className="gap-1"
                >
                  <Award className="w-4 h-4" />
                  <Sparkles className="w-3 h-3" />
                  Bulk Grade
                </Button>
              )}
            </div>
          )}
        </div>
        
        {bulkMode && ungradedListings.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Select cards to submit for CardBoom grading. Graded cards get higher visibility and buyer trust.
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => {
            const isUngraded = !listing.grading_order_id && 
              listing.certification_status !== 'completed' && 
              listing.certification_status !== 'pending';
            const isSelected = selectedIds.has(listing.id);
            
            return (
              <div 
                key={listing.id} 
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-all relative group",
                  isSelected 
                    ? "bg-primary/10 border-primary ring-2 ring-primary/30" 
                    : "bg-primary/5 border-primary/20 hover:border-primary/40"
                )}
                onClick={() => {
                  if (bulkMode && isUngraded) {
                    toggleSelect(listing.id);
                  } else if (onNavigateToListing) {
                    onNavigateToListing(listing.id);
                  } else {
                    navigate(`/listing/${listing.id}`);
                  }
                }}
              >
                {/* Grading Status Badge */}
                {listing.certification_status === 'completed' ? (
                  <Badge className="absolute top-2 right-2 text-xs bg-gradient-to-r from-primary to-blue-500 gap-1">
                    <Award className="w-3 h-3" />
                    Graded
                  </Badge>
                ) : listing.certification_status === 'pending' ? (
                  <Badge variant="outline" className="absolute top-2 right-2 text-xs text-amber-500 border-amber-500/30">
                    Grading...
                  </Badge>
                ) : (
                  <Badge className="absolute top-2 right-2 text-xs bg-primary/90">For Sale</Badge>
                )}
                
                {/* Bulk Selection Checkbox */}
                {bulkMode && isUngraded && (
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(listing.id)}
                      className="h-5 w-5 bg-background border-2"
                    />
                  </div>
                )}
                
                {listing.image_url ? (
                  <img 
                    src={listing.image_url} 
                    alt={listing.title} 
                    className={cn(
                      "w-full h-32 object-cover rounded-lg mb-3 transition-all",
                      bulkMode && isUngraded && "group-hover:opacity-80"
                    )}
                  />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg mb-3 flex items-center justify-center">
                    <Store className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                
                <h4 className="font-medium text-sm truncate">{listing.title}</h4>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-primary">
                    {formatPrice(listing.price)}
                  </span>
                  {listing.condition && (
                    <Badge variant="outline" className="text-xs">{listing.condition}</Badge>
                  )}
                </div>
                
                {/* Ungraded hint when not in bulk mode */}
                {!bulkMode && isUngraded && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Ungraded - Grade for higher visibility
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
