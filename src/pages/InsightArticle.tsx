import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { 
  Clock, Eye, ArrowLeft, Share2, Bookmark, 
  TrendingUp, BookOpen, Lightbulb, Target, Shield,
  GraduationCap, BarChart3, Zap, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

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

const InsightArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  const fetchArticle = async () => {
    try {
      // Fetch the article
      const { data, error } = await supabase
        .from('cardboom_news')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      if (!data) {
        navigate('/insights');
        return;
      }

      setArticle(data);

      // Increment view count
      await supabase
        .from('cardboom_news')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);

      // Fetch related articles
      const { data: related } = await supabase
        .from('cardboom_news')
        .select('*')
        .eq('is_published', true)
        .eq('category', data.category)
        .neq('id', data.id)
        .order('created_at', { ascending: false })
        .limit(3);

      setRelatedArticles(related || []);
    } catch (err) {
      console.error('Error fetching article:', err);
      navigate('/insights');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: article?.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const getCategoryInfo = (category: string | null) => {
    if (!category) return CONTENT_CATEGORIES.market;
    return CONTENT_CATEGORIES[category as keyof typeof CONTENT_CATEGORIES] || CONTENT_CATEGORIES.market;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-[400px] w-full rounded-xl mb-8" />
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-8" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </main>
      </div>
    );
  }

  if (!article) return null;

  const categoryInfo = getCategoryInfo(article.category);
  const CategoryIcon = categoryInfo.icon;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{article.title} | CardBoom Insights</title>
        <meta name="description" content={article.summary || article.content.slice(0, 160)} />
        <meta name="keywords" content={article.tags?.join(', ') || 'TCG, trading cards, card grading'} />
        <link rel="canonical" href={`https://cardboom.com/insights/${article.slug}`} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.summary || article.content.slice(0, 160)} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://cardboom.com/insights/${article.slug}`} />
        {article.image_url && <meta property="og:image" content={article.image_url} />}
        <meta name="twitter:card" content="summary_large_image" />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": article.title,
            "description": article.summary,
            "datePublished": article.created_at,
            "dateModified": article.created_at,
            "author": { "@type": "Organization", "name": "CardBoom" },
            "publisher": {
              "@type": "Organization",
              "name": "CardBoom",
              "logo": { "@type": "ImageObject", "url": "https://cardboom.com/logo.png" }
            },
            "image": article.image_url,
            "mainEntityOfPage": `https://cardboom.com/insights/${article.slug}`
          })}
        </script>
      </Helmet>

      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />

      <main>
        {/* Hero Image */}
        {article.image_url && (
          <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden">
            <img 
              src={article.image_url} 
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Back button */}
            <Link to="/insights" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Insights
            </Link>

            {/* Article Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Badge className={categoryInfo.color}>
                  <CategoryIcon className="w-3 h-3 mr-1" />
                  {categoryInfo.label}
                </Badge>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black mb-4">
                {article.title}
              </h1>
              
              {article.summary && (
                <p className="text-xl text-muted-foreground mb-6">
                  {article.summary}
                </p>
              )}

              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(article.created_at), 'MMMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {article.view_count || 0} views
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm">
                    <Bookmark className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            </div>

            {/* Article Content */}
            <article className="prose prose-lg dark:prose-invert max-w-none mb-12">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-muted-foreground leading-relaxed mb-4">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-2 mb-4 text-muted-foreground">{children}</ol>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                }}
              >
                {article.content}
              </ReactMarkdown>
            </article>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-12">
                {article.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {relatedArticles.map(related => {
                    const relatedInfo = getCategoryInfo(related.category);
                    return (
                      <Link key={related.id} to={`/insights/${related.slug}`}>
                        <Card className="h-full hover:border-primary/30 transition-colors group overflow-hidden">
                          {related.image_url && (
                            <div className="h-32 overflow-hidden">
                              <img 
                                src={related.image_url} 
                                alt={related.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                          )}
                          <CardContent className="p-4">
                            <Badge className={relatedInfo.color + " mb-2 text-xs"}>
                              {relatedInfo.label}
                            </Badge>
                            <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                              {related.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(related.created_at), 'MMM d, yyyy')}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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

export default InsightArticle;
