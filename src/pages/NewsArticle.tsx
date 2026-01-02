import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowLeft, Clock, Eye, Share2, Bookmark, Newspaper } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

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

const NewsArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const [cartOpen, setCartOpen] = useState(false);
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchArticle(slug);
    }
  }, [slug]);

  const fetchArticle = async (articleSlug: string) => {
    try {
      // Fetch main article
      const { data, error } = await supabase
        .from('cardboom_news')
        .select('*')
        .eq('slug', articleSlug)
        .eq('is_published', true)
        .single();

      if (error) throw error;
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
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: article?.title,
        text: article?.summary,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-full max-w-3xl mb-4" />
          <Skeleton className="h-6 w-48 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </main>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <main className="container mx-auto px-4 py-16 text-center">
          <Newspaper className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
          <Link to="/news">
            <Button>Back to News</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{article.title} | Cardboom News</title>
        <meta name="description" content={article.summary || article.content.slice(0, 160)} />
        <meta name="keywords" content={article.tags?.join(', ')} />
        <link rel="canonical" href={`https://cardboom.com/news/${article.slug}`} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.summary || article.content.slice(0, 160)} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={article.created_at} />
        <meta property="article:section" content={CATEGORY_LABELS[article.category] || article.category} />
        {article.tags?.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        
        {/* JSON-LD for Article */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": article.title,
            "description": article.summary,
            "datePublished": article.created_at,
            "author": {
              "@type": "Organization",
              "name": "Cardboom"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Cardboom",
              "url": "https://cardboom.com"
            },
            "mainEntityOfPage": `https://cardboom.com/news/${article.slug}`
          })}
        </script>
      </Helmet>

      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Link */}
        <Link to="/news" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to News
        </Link>

        <article className="max-w-3xl mx-auto">
          {/* Article Header */}
          <header className="mb-8">
            <Badge className={CATEGORY_COLORS[article.category] || CATEGORY_COLORS.general}>
              {CATEGORY_LABELS[article.category] || article.category}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-black mt-4 mb-4">
              {article.title}
            </h1>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(article.created_at), 'MMMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {article.view_count} views
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </header>

          {/* Article Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>

          {/* Tags */}
          {article.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b">
              {article.tags.map(tag => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="max-w-3xl mx-auto mt-12">
            <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {relatedArticles.map((related) => (
                <Link key={related.id} to={`/news/${related.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-all hover:border-primary/30">
                    <CardContent className="p-4">
                      <Badge className={`${CATEGORY_COLORS[related.category] || CATEGORY_COLORS.general} text-xs mb-2`}>
                        {CATEGORY_LABELS[related.category] || related.category}
                      </Badge>
                      <h3 className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors">
                        {related.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(related.created_at), 'MMM d')}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
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

export default NewsArticle;
