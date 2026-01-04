import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, Star, BadgeCheck, Truck, Clock, 
  MessageSquare, ExternalLink, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SellerInfoProps {
  seller: {
    id: string;
    username: string;
    avatarUrl?: string;
    isVerified: boolean;
    rating: number;
    totalSales: number;
    avgDeliveryDays: number;
    memberSince?: string;
    responseTime?: string;
    countryCode?: string;
  };
  onViewProfile: () => void;
  onMessage: () => void;
  otherListingsCount?: number;
  onViewOtherListings?: () => void;
}

const getCountryFlag = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const getCountryName = (code: string): string => {
  const countries: Record<string, string> = {
    'TR': 'Turkey', 'US': 'United States', 'GB': 'United Kingdom', 'DE': 'Germany',
    'FR': 'France', 'JP': 'Japan', 'CN': 'China', 'KR': 'South Korea', 'CA': 'Canada',
    'AU': 'Australia', 'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands', 'BR': 'Brazil',
  };
  return countries[code?.toUpperCase()] || code || 'Unknown';
};

export const SellerInfoCard = ({
  seller,
  onViewProfile,
  onMessage,
  otherListingsCount = 0,
  onViewOtherListings,
}: SellerInfoProps) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Seller Information
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Seller Profile */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-border">
            <AvatarImage src={seller.avatarUrl} alt={seller.username} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(seller.username)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{seller.username}</span>
              {seller.isVerified && (
                <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
                  <BadgeCheck className="w-3 h-3" />
                  Verified
                </Badge>
              )}
            </div>
            {seller.memberSince && (
              <p className="text-xs text-muted-foreground">Member since {seller.memberSince}</p>
            )}
            {seller.countryCode && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-base leading-none">{getCountryFlag(seller.countryCode)}</span>
                <span className="text-xs text-muted-foreground">{getCountryName(seller.countryCode)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-foreground">{seller.rating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Package className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">{seller.totalSales.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground">Sales</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Truck className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">{seller.avgDeliveryDays}d</span>
            </div>
            <p className="text-xs text-muted-foreground">Avg Delivery</p>
          </div>
        </div>

        {/* Response Time */}
        {seller.responseTime && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="text-muted-foreground">Response time:</span>{' '}
              <span className="font-medium text-foreground">{seller.responseTime}</span>
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onViewProfile} className="gap-2">
            <ExternalLink className="w-4 h-4" />
            View Profile
          </Button>
          <Button variant="outline" onClick={onMessage} className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Message
          </Button>
        </div>

        {/* Other Listings */}
        {otherListingsCount > 0 && onViewOtherListings && (
          <Button 
            variant="ghost" 
            onClick={onViewOtherListings}
            className="w-full gap-2 text-primary hover:text-primary"
          >
            <Package className="w-4 h-4" />
            View {otherListingsCount} more cards from this seller
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
