import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Bell, Heart } from 'lucide-react';
import { useCatalogCard, useCatalogCardPrice } from '@/hooks/useCatalogCard';
import { CatalogPricePanel } from '@/components/catalog/CatalogPricePanel';
import { CatalogPriceChart } from '@/components/catalog/CatalogPriceChart';
import { CatalogCardListings } from '@/components/catalog/CatalogCardListings';
import { ShareButton } from '@/components/ShareButton';
import { PriceReportButton } from '@/components/catalog/PriceReportButton';
import { UniversalSEO } from '@/components/seo/UniversalSEO';
import { SEOBreadcrumbs } from '@/components/seo/SEOBreadcrumbs';

const gameLabels: Record<string, string> = {
  pokemon: 'Pokémon',
  mtg: 'Magic: The Gathering',
  onepiece: 'One Piece',
  yugioh: 'Yu-Gi-Oh!',
  lorcana: 'Disney Lorcana',
  digimon: 'Digimon',
};

const CatalogCardPage = () => {
  const { game, canonicalKey } = useParams();
  const fullKey = canonicalKey || '';
  
  const { data: card, isLoading: cardLoading } = useCatalogCard(fullKey);
  const { data: price, isLoading: priceLoading } = useCatalogCardPrice(card?.id);

  if (cardLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Card Not Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find this card in our catalog.
          </p>
          <Button asChild>
            <Link to="/explorer">Browse Cards</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const pageTitle = `${card.name} - ${card.set_name || card.game} | CardBoom`;
  const pageDescription = `${card.name} price guide and market data. Track prices, view listings, and analyze trends on CardBoom.`;
  const canonicalUrl = `https://cardboom.com/catalog/${card.game}/${card.canonical_key}`;

  return (
    <div className="min-h-screen bg-background">
      <UniversalSEO
        data={{
          intent: 'product',
          entityName: card.name,
          entityType: `${gameLabels[card.game] || card.game} Card`,
          identifier: `catalog/${card.game}/${card.canonical_key}`,
          category: card.game,
          subcategory: card.set_name || undefined,
          image: card.image_url || undefined,
          pricing: price?.has_price && price?.price_usd ? {
            current: price.price_usd,
            availability: 'InStock',
          } : undefined,
          keywords: [card.name, gameLabels[card.game] || card.game, card.set_name, 'price guide', 'trading card'].filter(Boolean) as string[],
          customMeta: {
            title: pageTitle,
            description: pageDescription,
            canonicalOverride: canonicalUrl,
          },
        }}
        breadcrumbs={[
          { name: 'Home', url: 'https://cardboom.com/' },
          { name: 'Catalog', url: 'https://cardboom.com/explorer' },
          { name: gameLabels[card.game] || card.game, url: `https://cardboom.com/explorer?game=${card.game}` },
          { name: card.name, url: canonicalUrl },
        ]}
      />

      <Header cartCount={0} onCartClick={() => {}} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link to="/explorer" className="hover:text-foreground">Catalog</Link>
          <span>/</span>
          <Link to={`/explorer?game=${card.game}`} className="hover:text-foreground capitalize">
            {gameLabels[card.game] || card.game}
          </Link>
          <span>/</span>
          <span className="text-foreground">{card.name}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Card Image */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="glass overflow-hidden">
              <CardContent className="p-4">
                <div className="aspect-[2.5/3.5] relative">
                  <img
                    src={card.image_url || '/placeholder.svg'}
                    alt={card.name}
                    className="w-full h-full object-contain rounded-lg"
                    loading="eager"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Heart className="w-4 h-4 mr-2" />
                Watchlist
              </Button>
              <Button variant="outline" className="flex-1">
                <Bell className="w-4 h-4 mr-2" />
                Alert
              </Button>
              <ShareButton 
                title={card.name} 
                url={canonicalUrl}
              />
            </div>

            {/* Card Details */}
            <Card className="glass">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-foreground">Card Details</h3>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Game</span>
                  <Badge variant="secondary">{gameLabels[card.game] || card.game}</Badge>
                </div>
                {card.set_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Set</span>
                    <span className="font-medium">{card.set_name}</span>
                  </div>
                )}
                {card.card_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Number</span>
                    <span className="font-medium">{card.set_code}-{card.card_number}</span>
                  </div>
                )}
                {card.rarity && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rarity</span>
                    <Badge variant="outline">{card.rarity}</Badge>
                  </div>
                )}
                {card.color && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Color</span>
                    <span className="font-medium capitalize">{card.color}</span>
                  </div>
                )}
                {card.card_type && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Card Type</span>
                    <span className="font-medium">{card.card_type}</span>
                  </div>
                )}
                {card.cost !== null && card.cost !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost</span>
                    <span className="font-medium">{card.cost}</span>
                  </div>
                )}
                {card.power !== null && card.power !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Power</span>
                    <span className="font-medium">{card.power.toLocaleString()}</span>
                  </div>
                )}
                {card.counter !== null && card.counter !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Counter</span>
                    <span className="font-medium">+{card.counter.toLocaleString()}</span>
                  </div>
                )}
                {card.attribute && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attribute</span>
                    <span className="font-medium">{card.attribute}</span>
                  </div>
                )}
                {card.subtypes && card.subtypes.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtype(s)</span>
                    <span className="font-medium text-right">{card.subtypes.join(' / ')}</span>
                  </div>
                )}
                {card.variant && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Variant</span>
                    <span className="font-medium">{card.variant}</span>
                  </div>
                )}
                {card.finish && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Finish</span>
                    <span className="font-medium">{card.finish}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Effect Text */}
            {card.effect_text && (
              <Card className="glass">
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-foreground">Effect</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {card.effect_text}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Pricing & Listings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <header>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="secondary" className="capitalize">
                  {gameLabels[card.game] || card.game}
                </Badge>
                {card.set_code && card.card_number && (
                  <Badge variant="outline" className="font-mono">
                    {card.set_code}-{card.card_number.padStart(3, '0')}
                  </Badge>
                )}
                {card.rarity && <Badge variant="outline">{card.rarity}</Badge>}
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                {card.name}
              </h1>
              {card.set_name && (
                <p className="text-muted-foreground text-lg">
                  {card.set_name}
                  {card.card_number && ` • #${card.card_number}`}
                </p>
              )}
            </header>

            {/* Price Panel */}
            <div className="space-y-2">
              <CatalogPricePanel 
                price={price} 
                isLoading={priceLoading}
                cardName={card.name}
                setCode={card.set_code}
                cardNumber={card.card_number}
                game={card.game}
                catalogCardId={card.id}
              />
              <div className="flex justify-end">
                <PriceReportButton
                  catalogCardId={card.id}
                  currentPrice={price?.price_usd}
                  cardName={card.name}
                />
              </div>
            </div>

            {/* Price Chart */}
            {card.id && (
              <CatalogPriceChart catalogCardId={card.id} cardName={card.name} />
            )}

            {/* Active Listings */}
            {card.id && (
              <CatalogCardListings catalogCardId={card.id} />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CatalogCardPage;
