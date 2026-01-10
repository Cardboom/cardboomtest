import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  Newspaper, Clock, Eye, ArrowRight, Sparkles, 
  TrendingUp, BookOpen, Lightbulb, Target, Shield, 
  GraduationCap, BarChart3, Zap
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  source_name: string | null;
  image_url: string | null;
  category: string | null;
  tags: string[] | null;
  view_count: number | null;
  created_at: string;
}

// Content categories matching the content engine
const CONTENT_CATEGORIES = {
  education: { label: 'Education', icon: GraduationCap, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  'market-analysis': { label: 'Market Analysis', icon: BarChart3, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  platform: { label: 'Platform', icon: Zap, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  guides: { label: 'Guides', icon: BookOpen, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  pokemon: { label: 'Pokémon', icon: Sparkles, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  'one-piece': { label: 'One Piece', icon: Target, color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  mtg: { label: 'Magic: The Gathering', icon: Shield, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  sports: { label: 'Sports Cards', icon: TrendingUp, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  grading: { label: 'Card Grading', icon: Lightbulb, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  market: { label: 'Market Updates', icon: TrendingUp, color: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
};

const Insights = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('cardboom_news')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = selectedCategory === 'all' 
    ? articles 
    : articles.filter(a => a.category === selectedCategory);

  const featuredArticle = articles[0];
  const categories = ['all', ...new Set(articles.map(a => a.category).filter(Boolean))];

  const getCategoryInfo = (category: string | null) => {
    if (!category) return CONTENT_CATEGORIES.market;
    return CONTENT_CATEGORIES[category as keyof typeof CONTENT_CATEGORIES] || CONTENT_CATEGORIES.market;
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>CardBoom Insights - TCG News, Guides & Market Analysis</title>
        <meta name="description" content="Expert TCG insights: Pokemon card grading guides, market analysis, One Piece TCG trends, MTG investing tips, and sports card news. AI-powered trading card intelligence." />
        <meta name="keywords" content="TCG insights, pokemon card grading, AI card grading, card market analysis, TCG investment guide, one piece cards, MTG prices, sports card news, PSA grading alternative, card collecting tips" />
        <link rel="canonical" href="https://cardboom.com/insights" />
        <meta property="og:title" content="CardBoom Insights - TCG News & Market Analysis" />
        <meta property="og:description" content="Expert trading card insights: guides, market analysis, and news for Pokemon, One Piece, MTG, and sports cards." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://cardboom.com/insights" />
        <meta name="twitter:card" content="summary_large_image" />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "CardBoom Insights",
            "description": "Expert TCG insights covering Pokemon, One Piece, MTG, sports cards - market analysis, grading guides, and investment strategies",
            "url": "https://cardboom.com/insights",
            "publisher": {
              "@type": "Organization",
              "name": "CardBoom",
              "logo": { "@type": "ImageObject", "url": "https://cardboom.com/logo.png" }
            },
            "blogPost": articles.slice(0, 10).map(article => ({
              "@type": "BlogPosting",
              "headline": article.title,
              "description": article.summary,
              "datePublished": article.created_at,
              "url": `https://cardboom.com/insights/${article.slug}`,
              "image": article.image_url,
              "author": { "@type": "Organization", "name": "CardBoom" }
            }))
          })}
        </script>
      </Helmet>

      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Newspaper className="w-4 h-4" />
            <span className="text-sm font-medium">CardBoom Insights</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            TCG <span className="text-primary">Insights</span> & News
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Expert guides, market analysis, and breaking news for trading card collectors and investors.
          </p>
        </div>

        {/* Featured Article */}
        {loading ? (
          <Skeleton className="h-[400px] w-full rounded-xl mb-8" />
        ) : featuredArticle ? (
          <Link to={`/insights/${featuredArticle.slug}`}>
            <Card className="group overflow-hidden mb-8 hover:shadow-xl transition-all border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Image Section */}
                <div className="relative h-[250px] md:h-[350px] overflow-hidden">
                  {featuredArticle.image_url ? (
                    <img 
                      src={featuredArticle.image_url} 
                      alt={featuredArticle.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Sparkles className="w-20 h-20 text-primary/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <Badge className={getCategoryInfo(featuredArticle.category).color}>
                      {getCategoryInfo(featuredArticle.category).label}
                    </Badge>
                    <Badge variant="secondary" className="gap-1 bg-black/50 text-white border-0">
                      <Sparkles className="w-3 h-3" />
                      Featured
                    </Badge>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6 md:p-8 flex flex-col justify-center">
                  <h2 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
                    {featuredArticle.title}
                  </h2>
                  <p className="text-muted-foreground line-clamp-3 mb-6">
                    {featuredArticle.summary || featuredArticle.content.slice(0, 200)}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(featuredArticle.created_at), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {featuredArticle.view_count || 0} views
                    </span>
                  </div>
                  <div className="flex items-center text-primary font-medium gap-2 group-hover:gap-3 transition-all">
                    Read Article <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ) : null}

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="flex-wrap h-auto gap-2 p-2 bg-muted/50">
            {categories.map(cat => {
              const info = cat === 'all' ? null : getCategoryInfo(cat);
              const Icon = info?.icon || Newspaper;
              return (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  className="text-xs gap-1.5"
                >
                  <Icon className="w-3 h-3" />
                  {cat === 'all' ? 'All Articles' : info?.label || cat}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Articles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
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
              <p>No articles found. Check back soon!</p>
            </div>
          ) : (
            filteredArticles.slice(1).map((article) => {
              const categoryInfo = getCategoryInfo(article.category);
              const CategoryIcon = categoryInfo.icon;
              
              return (
                <Link key={article.id} to={`/insights/${article.slug}`}>
                  <Card className="h-full group hover:shadow-lg transition-all hover:border-primary/30 overflow-hidden">
                    {/* Article Image */}
                    <div className="relative h-48 overflow-hidden">
                      {article.image_url ? (
                        <img 
                          src={article.image_url} 
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                          <CategoryIcon className="w-12 h-12 text-primary/30" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <Badge className={categoryInfo.color}>
                          {categoryInfo.label}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className="p-5">
                      <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                        {article.summary || article.content.slice(0, 120)}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(article.created_at), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {article.view_count || 0}
                        </span>
                      </div>
                      {article.tags && article.tags.length > 0 && (
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
              );
            })
          )}
        </div>

        {/* Newsletter CTA */}
        <Card className="mt-12 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border-primary/20">
          <CardContent className="p-8 text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-4" />
            <h3 className="font-display text-2xl font-bold mb-2">Get Weekly Insights</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Market analysis, grading tips, and investment strategies delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 px-4 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none"
              />
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Subscribe
              </button>
            </div>
          </CardContent>
        </Card>
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

export default Insights;
