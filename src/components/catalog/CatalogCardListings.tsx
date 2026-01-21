import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ShoppingCart, User, AlertCircle, TestTube2, 
  BadgeCheck, Crown, Gem, Package, Award, Shield
} from 'lucide-react';
import { useCatalogCardListings, useCatalogCardMappings } from '@/hooks/useCatalogCard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from 'react';

interface CatalogCardListingsProps {
  catalogCardId: string;
}

// Convert country code to flag emoji
const getCountryFlag = (countryCode: string | null): string => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Format sales count
const formatSalesCount = (sales: number): string => {
  if (sales >= 10000) return `${(sales / 1000).toFixed(0)}k+`;
  if (sales >= 1000) return `${(sales / 1000).toFixed(1)}k`;
  return sales.toString();
};

// Get subscription badge details
const getSubscriptionBadge = (tier: string | null) => {
  switch (tier?.toLowerCase()) {
    case 'enterprise':
      return { icon: Crown, label: 'Enterprise', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    case 'pro':
      return { icon: Gem, label: 'Pro', className: 'bg-primary/20 text-primary border-primary/30' };
    default:
      return null;
  }
};

export const CatalogCardListings = ({ catalogCardId }: CatalogCardListingsProps) => {
  const { data: listings, isLoading } = useCatalogCardListings(catalogCardId);
  const { data: mappings } = useCatalogCardMappings(catalogCardId);
  const { formatPrice } = useCurrency();
  const [sortBy, setSortBy] = useState<'price' | 'sales'>('price');
  const [perPage, setPerPage] = useState<number>(10);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Active Listings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasNoListings = !listings || listings.length === 0;
  const hasMappings = mappings && mappings.count > 0;
  const allSamples = listings?.every((l: any) => l.is_sample) ?? false;

  if (hasNoListings) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Active Listings</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No active listings available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to list this card
          </p>
          {hasMappings && (
            <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              {mappings.count} market items mapped, but no active listings found
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Sort listings
  const sortedListings = [...(listings || [])].sort((a: any, b: any) => {
    if (sortBy === 'sales') {
      return (b.seller_total_sales || 0) - (a.seller_total_sales || 0);
    }
    return (a.price || 0) - (b.price || 0);
  });

  // Paginate
  const displayedListings = sortedListings.slice(0, perPage);
  const lowestPrice = listings?.reduce((min: number, l: any) => 
    Math.min(min, l.price || Infinity), Infinity) || 0;

  return (
    <Card className="glass">
      {/* Header with count and controls */}
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-bold">
                {listings.length} Listing{listings.length !== 1 ? 's' : ''}
              </CardTitle>
              {allSamples && (
                <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">
                  <TestTube2 className="w-3 h-3 mr-1" />
                  Demo
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              As low as {formatPrice(lowestPrice)}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort By</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'price' | 'sales')}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="sales">Seller Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">Show</span>
              <Select value={perPage.toString()} onValueChange={(v) => setPerPage(parseInt(v))}>
                <SelectTrigger className="w-[70px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {allSamples && (
          <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
            <TestTube2 className="w-3 h-3" />
            These are sample listings for demonstration purposes
          </p>
        )}
        
        {/* Table-like listing rows */}
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {displayedListings.map((item: any) => {
            const subscriptionBadge = getSubscriptionBadge(item.seller_subscription_tier);
            const countryFlag = getCountryFlag(item.seller_country_code);
            
            return (
              <div
                key={item.listing_id}
                className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors"
              >
                {/* Seller Info Column */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Link to={`/u/${item.seller_id}`} className="shrink-0">
                    <Avatar className="h-10 w-10 border border-border hover:border-primary transition-colors">
                      <AvatarImage src={item.seller_avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link 
                        to={`/u/${item.seller_id}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors truncate"
                      >
                        {item.seller_name || 'Seller'}
                      </Link>
                      
                      {/* Verified Seller Badge */}
                      {item.seller_is_verified && (
                        <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                      )}
                      
                      {/* Subscription Badge */}
                      {subscriptionBadge && (
                        <Badge 
                          variant="outline" 
                          className={cn("text-[10px] px-1.5 py-0 h-5 shrink-0", subscriptionBadge.className)}
                        >
                          <subscriptionBadge.icon className="w-3 h-3 mr-1" />
                          {subscriptionBadge.label}
                        </Badge>
                      )}
                      
                      {item.is_sample && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-muted-foreground border-muted-foreground/30 shrink-0">
                          Sample
                        </Badge>
                      )}
                    </div>
                    
                    {/* Sales count and country */}
                    <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                      {countryFlag && (
                        <span className="text-base leading-none">{countryFlag}</span>
                      )}
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        <span>({formatSalesCount(item.seller_total_sales || 0)} Sales)</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Condition/Grade Column */}
                <div className="hidden sm:flex flex-col items-center min-w-[120px] gap-1">
                  {/* CBGI Grade - show if completed */}
                  {item.cbgi_completed_at && item.cbgi_grade_label && (
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      <Award className="w-3 h-3 mr-1" />
                      CBGI {item.cbgi_grade_label}
                    </Badge>
                  )}
                  
                  {/* External Grading (PSA, BGS, CGC, etc.) */}
                  {item.external_grade && item.external_grading_company && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                      <Shield className="w-3 h-3 mr-1" />
                      {item.external_grading_company} {item.external_grade}
                    </Badge>
                  )}
                  
                  {/* Show condition if no grading */}
                  {!item.cbgi_completed_at && !item.external_grade && item.condition && (
                    <span className="text-sm font-medium text-foreground">
                      {item.condition}
                    </span>
                  )}
                  
                  {/* Show "Ungraded" if raw */}
                  {!item.cbgi_completed_at && !item.external_grade && !item.condition && (
                    <span className="text-sm text-muted-foreground">
                      Ungraded
                    </span>
                  )}
                </div>
                
                {/* Price Column */}
                <div className="text-right min-w-[80px]">
                  <p className="font-display text-xl font-bold text-primary">
                    {formatPrice(item.price || 0)}
                  </p>
                </div>
                
                {/* Action Column */}
                <div className="shrink-0">
                  <Link to={`/listing/${item.listing_id}`}>
                    <Button size="sm" className="font-semibold">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Show more indicator */}
        {sortedListings.length > perPage && (
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              onClick={() => setPerPage(prev => prev + 25)}
              className="w-full sm:w-auto"
            >
              Show {Math.min(25, sortedListings.length - perPage)} more listings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
