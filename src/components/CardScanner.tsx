import { useState } from 'react';
import { Search, Loader2, TrendingUp, TrendingDown, Droplets, ExternalLink, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface CardScanResult {
  cardName: string;
  setName?: string;
  cardNumber?: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  soldAvgPrice: number;
  activeListingsCount: number;
  soldListingsCount: number;
  liquidity: string;
  imageUrl?: string;
  cachedImagePath?: string;
  listings: {
    id: string;
    title: string;
    price: number;
    imageUrl?: string;
    condition?: string;
    seller?: string;
    url?: string;
  }[];
  fromCache?: boolean;
}

interface CardScannerProps {
  onSelectPrice?: (price: number, imageUrl?: string) => void;
  onCardScanned?: (result: CardScanResult) => void;
}

export const CardScanner = ({ onSelectPrice, onCardScanned }: CardScannerProps) => {
  const { formatPrice } = useCurrency();
  const [cardName, setCardName] = useState('');
  const [setName, setSetName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<CardScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!cardName.trim()) return;

    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('scan-card', {
        body: {
          cardName: cardName.trim(),
          setName: setName.trim() || undefined,
          cardNumber: cardNumber.trim() || undefined,
        },
      });

      if (functionError) throw new Error(functionError.message);

      setResult(data);
      onCardScanned?.(data);
    } catch (err) {
      console.error('Card scan error:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan card');
    } finally {
      setIsScanning(false);
    }
  };

  const getLiquidityColor = (liquidity: string) => {
    switch (liquidity) {
      case 'high': return 'text-gain bg-gain/10 border-gain/30';
      case 'medium': return 'text-gold bg-gold/10 border-gold/30';
      case 'low': return 'text-loss bg-loss/10 border-loss/30';
      default: return 'text-muted-foreground bg-muted/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="w-5 h-5 text-primary" />
            Card Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="cardName">Card Name *</Label>
              <Input
                id="cardName"
                placeholder="e.g., Charizard, Black Lotus, LeBron James Rookie"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              />
            </div>
            <div>
              <Label htmlFor="setName">Set Name</Label>
              <Input
                id="setName"
                placeholder="e.g., Base Set, Alpha, 2003 Topps"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-32">
              <Label htmlFor="cardNumber">Card #</Label>
              <Input
                id="cardNumber"
                placeholder="e.g., 4/102"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
            </div>
            <div className="flex-1 flex items-end">
              <Button
                onClick={handleScan}
                disabled={!cardName.trim() || isScanning}
                className="w-full md:w-auto"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning eBay...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Scan Card
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-loss/10 text-loss border border-loss/30 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary Card */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Image */}
                {result.imageUrl && (
                  <div className="w-full md:w-48 h-64 rounded-lg overflow-hidden bg-secondary/50 shrink-0">
                    <img
                      src={result.imageUrl}
                      alt={result.cardName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{result.cardName}</h3>
                      {result.setName && (
                        <p className="text-muted-foreground">{result.setName} {result.cardNumber && `#${result.cardNumber}`}</p>
                      )}
                    </div>
                    <Badge className={cn('border', getLiquidityColor(result.liquidity))}>
                      <Droplets className="w-3 h-3 mr-1" />
                      {result.liquidity.toUpperCase()} LIQUIDITY
                    </Badge>
                  </div>

                  {/* Price Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Market Avg</p>
                      <p className="text-lg font-bold text-foreground">{formatPrice(result.avgPrice)}</p>
                    </div>
                    <div className="p-3 bg-gain/10 rounded-lg">
                      <p className="text-xs text-gain mb-1">Sold Avg</p>
                      <p className="text-lg font-bold text-gain">{formatPrice(result.soldAvgPrice)}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Min Price</p>
                      <p className="text-lg font-bold text-foreground">{formatPrice(result.minPrice)}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Max Price</p>
                      <p className="text-lg font-bold text-foreground">{formatPrice(result.maxPrice)}</p>
                    </div>
                  </div>

                  {/* Listings Count */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Package className="w-4 h-4" />
                      <span>{result.activeListingsCount} active listings</span>
                    </div>
                    <div className="flex items-center gap-1 text-gain">
                      <TrendingUp className="w-4 h-4" />
                      <span>{result.soldListingsCount} recently sold</span>
                    </div>
                    {result.fromCache && (
                      <Badge variant="outline" className="text-xs">Cached</Badge>
                    )}
                  </div>

                  {/* Use Price Button */}
                  {onSelectPrice && (
                    <Button
                      onClick={() => onSelectPrice(result.soldAvgPrice || result.avgPrice, result.imageUrl)}
                      className="w-full md:w-auto"
                    >
                      Use Suggested Price: {formatPrice(result.soldAvgPrice || result.avgPrice)}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Listings */}
          {result.listings.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Current eBay Listings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {result.listings.map((listing) => (
                    <div key={listing.id} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                      {listing.imageUrl && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary/50 shrink-0">
                          <img
                            src={listing.imageUrl}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-2">{listing.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {listing.condition && <span>{listing.condition}</span>}
                          {listing.seller && <span>• {listing.seller}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-foreground">{formatPrice(listing.price)}</p>
                        {listing.url && (
                          <a
                            href={listing.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
