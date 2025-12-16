import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, ArrowLeft, ArrowRight, MessageSquare, ThumbsUp, Share2, Bookmark, User } from 'lucide-react';
import { getArticleBySlug, getRelatedArticles, BlogArticle } from '@/data/blogArticles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

interface Comment {
  id: string;
  author: string;
  content: string;
  date: string;
  likes: number;
}

const Article = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<BlogArticle[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (slug) {
      const foundArticle = getArticleBySlug(slug);
      if (foundArticle) {
        setArticle(foundArticle);
        setRelatedArticles(getRelatedArticles(slug, 3));
        // Load mock comments
        setComments([
          {
            id: '1',
            author: 'CardCollector92',
            content: 'Great article! Really helped me understand the basics. Looking forward to more content like this.',
            date: '2024-12-14',
            likes: 12
          },
          {
            id: '2',
            author: 'TCGInvestor',
            content: 'The section on grading was especially useful. Would love to see a deeper dive into BGS subgrades.',
            date: '2024-12-13',
            likes: 8
          },
          {
            id: '3',
            author: 'PokeFan2000',
            content: 'Been collecting for years but learned something new today. Thanks Cardboom team!',
            date: '2024-12-12',
            likes: 5
          }
        ]);
      } else {
        navigate('/blog');
      }
    }
  }, [slug, navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!user) {
      toast.error('Please sign in to comment');
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate comment submission
    const newCommentObj: Comment = {
      id: Date.now().toString(),
      author: user.email?.split('@')[0] || 'Anonymous',
      content: newComment,
      date: new Date().toISOString().split('T')[0],
      likes: 0
    };

    setComments([newCommentObj, ...comments]);
    setNewComment('');
    toast.success('Comment posted successfully!');
    setIsSubmitting(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title,
          text: article?.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Convert markdown-like content to HTML-like sections
  const renderContent = (content: string) => {
    const lines = content.trim().split('\n');
    const elements: JSX.Element[] = [];
    let currentList: string[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (currentList.length > 0 && listType) {
        const ListTag = listType === 'ol' ? 'ol' : 'ul';
        elements.push(
          <ListTag key={elements.length} className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} list-inside space-y-2 my-4 text-muted-foreground`}>
            {currentList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ListTag>
        );
        currentList = [];
        listType = null;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={index} className="font-display text-3xl md:text-4xl font-bold mt-8 mb-4 text-foreground">
            {trimmedLine.substring(2)}
          </h1>
        );
      } else if (trimmedLine.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={index} className="font-display text-2xl font-bold mt-8 mb-3 text-foreground">
            {trimmedLine.substring(3)}
          </h2>
        );
      } else if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={index} className="font-display text-xl font-semibold mt-6 mb-2 text-foreground">
            {trimmedLine.substring(4)}
          </h3>
        );
      } else if (trimmedLine.startsWith('- **') || trimmedLine.startsWith('* **')) {
        if (listType !== 'ul') flushList();
        listType = 'ul';
        const content = trimmedLine.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        currentList.push(content);
      } else if (trimmedLine.match(/^\d+\./)) {
        if (listType !== 'ol') flushList();
        listType = 'ol';
        currentList.push(trimmedLine.replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
      } else if (trimmedLine.startsWith('- ')) {
        if (listType !== 'ul') flushList();
        listType = 'ul';
        currentList.push(trimmedLine.substring(2));
      } else if (trimmedLine === '') {
        flushList();
      } else if (trimmedLine) {
        flushList();
        const formattedLine = trimmedLine
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        elements.push(
          <p key={index} className="text-muted-foreground leading-relaxed my-4" dangerouslySetInnerHTML={{ __html: formattedLine }} />
        );
      }
    });

    flushList();
    return elements;
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{article.title} | Cardboom Blog</title>
        <meta name="description" content={article.excerpt} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.excerpt} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="keywords" content={article.tags.join(', ')} />
        <link rel="canonical" href={`https://cardboom.com/blog/${article.slug}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": article.title,
            "description": article.excerpt,
            "author": {
              "@type": "Person",
              "name": article.author
            },
            "datePublished": article.date,
            "publisher": {
              "@type": "Organization",
              "name": "Cardboom",
              "logo": {
                "@type": "ImageObject",
                "url": "https://cardboom.com/logo.png"
              }
            }
          })}
        </script>
      </Helmet>

      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="max-w-4xl mx-auto mb-8">
          <Link to="/blog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>

        {/* Article Header */}
        <article className="max-w-4xl mx-auto">
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant="default">{article.category}</Badge>
              {article.featured && <Badge variant="secondary">Featured</Badge>}
            </div>
            
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground leading-tight">
              {article.title}
            </h1>
            
            <p className="text-xl text-muted-foreground mb-6">
              {article.excerpt}
            </p>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{article.author.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-foreground">{article.author}</div>
                  <div className="text-xs">{article.authorRole}</div>
                </div>
              </div>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(article.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {article.readTime}
              </span>
            </div>
          </header>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mb-8">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Bookmark className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>

          <Separator className="mb-8" />

          {/* Article Content */}
          <div className="prose prose-lg max-w-none">
            {renderContent(article.content)}
          </div>

          {/* Tags */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex flex-wrap gap-2">
              {article.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-primary/20">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Comments Section */}
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              Comments ({comments.length})
            </h2>

            {/* Comment Form */}
            <Card className="mb-8">
              <CardContent className="p-4">
                <Textarea
                  placeholder={user ? "Share your thoughts..." : "Sign in to leave a comment"}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={!user}
                  className="mb-4 min-h-[100px]"
                />
                <div className="flex justify-between items-center">
                  {!user && (
                    <p className="text-sm text-muted-foreground">
                      <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to join the discussion
                    </p>
                  )}
                  <Button 
                    onClick={handleSubmitComment} 
                    disabled={!user || isSubmitting || !newComment.trim()}
                    className="ml-auto"
                  >
                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map(comment => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{comment.author.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-muted-foreground mb-3">{comment.content}</p>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          {comment.likes}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <section className="mt-12 pt-8 border-t border-border">
              <h2 className="font-display text-2xl font-bold mb-6">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {relatedArticles.map(related => (
                  <Link key={related.slug} to={`/blog/${related.slug}`}>
                    <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                      <CardContent className="p-4">
                        <Badge variant="secondary" className="mb-2">{related.category}</Badge>
                        <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-2">
                          {related.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{related.excerpt}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* CTA */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8 text-center">
              <h3 className="font-display text-2xl font-bold mb-2">Ready to Start Investing?</h3>
              <p className="text-muted-foreground mb-4">
                Join thousands of collectors using Cardboom to track, buy, and sell trading cards.
              </p>
              <Button size="lg" onClick={() => navigate('/auth')}>
                Create Free Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Article;
