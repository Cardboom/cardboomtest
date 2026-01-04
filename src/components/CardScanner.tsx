import { useState } from 'react';
import { Search, Loader2, TrendingUp, Droplets, ExternalLink, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CardScanResult {
  cardName: string;
  setName?: string;
  cardNumber?: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  liquidity: string;
  imageUrl?: string;
  salesCount?: number;
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
      // Search in market_items table for matching cards
      // Use broader search - split keywords for better matching
      const searchTerms = cardName.trim().toLowerCase().split(/\s+/);
      
      let query = supabase
        .from('market_items')
        .select('*')
        .limit(20);

      // Use OR-style matching - match if any term is found
      if (searchTerms.length === 1) {
        query = query.ilike('name', `%${searchTerms[0]}%`);
      } else {
        // For multi-word searches, require all terms
        searchTerms.forEach(term => {
          query = query.ilike('name', `%${term}%`);
        });
      }

      if (setName.trim()) {
        query = query.ilike('set_name', `%${setName.trim()}%`);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw new Error(queryError.message);

      if (!data || data.length === 0) {
        setError('No matching cards found in our database. Try a different search term.');
        return;
      }

      // Calculate aggregate pricing from found items
      const prices = data.map(item => item.current_price).filter(p => p > 0);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // Determine liquidity based on number of matches
      let liquidity = 'low';
      if (data.length > 5) liquidity = 'high';
      else if (data.length > 2) liquidity = 'medium';

      const scanResult: CardScanResult = {
        cardName: cardName.trim(),
        setName: setName.trim() || undefined,
        cardNumber: cardNumber.trim() || undefined,
        avgPrice: Math.round(avgPrice * 100) / 100,
        minPrice: Math.round(minPrice * 100) / 100,
        maxPrice: Math.round(maxPrice * 100) / 100,
        liquidity,
        imageUrl: data[0]?.image_url || undefined,
        salesCount: data.length,
      };

      setResult(scanResult);
      onCardScanned?.(scanResult);
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
            Card Price Lookup
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
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search Price
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-xs text-primary mb-1">Market Avg</p>
                      <p className="text-lg font-bold text-foreground">{formatPrice(result.avgPrice)}</p>
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

                  {/* Match Count */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Package className="w-4 h-4" />
                      <span>{result.salesCount} matching items found</span>
                    </div>
                  </div>

                  {/* Use Price Button */}
                  {onSelectPrice && (
                    <Button
                      onClick={() => onSelectPrice(result.avgPrice, result.imageUrl)}
                      className="w-full md:w-auto"
                    >
                      Use Suggested Price: {formatPrice(result.avgPrice)}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};