import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Newspaper, TrendingUp, Clock, Eye, ArrowRight, Flame, Sparkles } from 'lucide-react';

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string;
  source_name: string;
  image_url: string | null;
  category: string;
  tags: string[];
  view_count: number;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All News',
  pokemon: 'Pokémon',
  yugioh: 'Yu-Gi-Oh!',
  mtg: 'Magic: The Gathering',
  sports: 'Sports Cards',
  onepiece: 'One Piece',
  lorcana: 'Disney Lorcana',
  grading: 'Card Grading',
  market: 'Market Updates',
  general: 'General',
};

const CATEGORY_COLORS: Record<string, string> = {
  pokemon: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  yugioh: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  mtg: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  sports: 'bg-green-500/10 text-green-600 border-green-500/20',
  onepiece: 'bg-red-500/10 text-red-600 border-red-500/20',
  lorcana: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  grading: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  market: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  general: 'bg-muted text-muted-foreground border-border',
};

const News = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('cardboom_news')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = selectedCategory === 'all' 
    ? articles 
    : articles.filter(a => a.category === selectedCategory);

  const featuredArticle = articles[0];
  const recentArticles = articles.slice(1, 4);
  const categories = ['all', ...new Set(articles.map(a => a.category))];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Cardboom News - Trading Card & Collectibles News</title>
        <meta name="description" content="Stay updated with the latest trading card game news, market updates, grading news, and collectibles industry insights from Cardboom." />
        <meta name="keywords" content="TCG news, Pokemon news, Yu-Gi-Oh news, sports cards news, card grading, collectibles market" />
        <link rel="canonical" href="https://cardboom.com/news" />
        <meta property="og:title" content="Cardboom News - TCG & Collectibles News" />
        <meta property="og:description" content="Latest trading card game news and market updates." />
        <meta property="og:type" content="website" />
        
        {/* JSON-LD for News Articles */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsMediaOrganization",
            "name": "Cardboom News",
            "url": "https://cardboom.com/news",
            "description": "Trading card and collectibles news coverage"
          })}
        </script>
      </Helmet>

      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Newspaper className="w-4 h-4" />
            <span className="text-sm font-medium">Cardboom News</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            TCG & Collectibles <span className="text-primary">News</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Stay ahead of the market with the latest trading card news, grading updates, and industry insights.
          </p>
        </div>

        {/* Featured Article */}
        {loading ? (
          <Skeleton className="h-[400px] w-full rounded-xl mb-8" />
        ) : featuredArticle ? (
          <Link to={`/news/${featuredArticle.slug}`}>
            <Card className="group overflow-hidden mb-8 hover:shadow-xl transition-all border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="grid md:grid-cols-2 gap-6 p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className={CATEGORY_COLORS[featuredArticle.category] || CATEGORY_COLORS.general}>
                      {CATEGORY_LABELS[featuredArticle.category] || featuredArticle.category}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Flame className="w-3 h-3" />
                      Featured
                    </Badge>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold group-hover:text-primary transition-colors">
                    {featuredArticle.title}
                  </h2>
                  <p className="text-muted-foreground line-clamp-3">
                    {featuredArticle.summary || featuredArticle.content.slice(0, 200)}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(featuredArticle.created_at), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {featuredArticle.view_count} views
                    </span>
                  </div>
                  <Button className="gap-2">
                    Read More <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="relative h-[200px] md:h-full rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Sparkles className="w-20 h-20 text-primary/30" />
                </div>
              </div>
            </Card>
          </Link>
        ) : null}

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="flex-wrap h-auto gap-2 p-2 bg-muted/50">
            {categories.map(cat => (
              <TabsTrigger 
                key={cat} 
                value={cat}
                className="text-xs"
              >
                {CATEGORY_LABELS[cat] || cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Articles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-4" />
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))
          ) : filteredArticles.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No news articles found. Check back soon!</p>
            </div>
          ) : (
            filteredArticles.map((article) => (
              <Link key={article.id} to={`/news/${article.slug}`}>
                <Card className="h-full group hover:shadow-lg transition-all hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={CATEGORY_COLORS[article.category] || CATEGORY_COLORS.general}>
                        {CATEGORY_LABELS[article.category] || article.category}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                      {article.summary || article.content.slice(0, 150)}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(article.created_at), 'MMM d')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {article.view_count}
                      </span>
                    </div>
                    {article.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {article.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </main>

      <Footer />
      <CartDrawer 
        isOpen={cartOpen} 
        onClose={() => setCartOpen(false)} 
        items={[]} 
        onRemoveItem={() => {}} 
      />
    </div>
  );
};

export default News;
