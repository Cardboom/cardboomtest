import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowRight, TrendingUp, Shield, Lightbulb, Target } from 'lucide-react';
import { useState } from 'react';
import { CartDrawer } from '@/components/CartDrawer';

const Blog = () => {
  const [cartOpen, setCartOpen] = useState(false);

  const posts = [
    {
      title: 'The Rise of Fractional Ownership in Collectibles',
      excerpt: 'How fractional ownership is democratizing access to high-value trading cards and collectibles. Own pieces of grails starting from just $10.',
      category: 'Market Trends',
      date: '2024-12-10',
      readTime: '5 min read',
      icon: TrendingUp,
      featured: true,
    },
    {
      title: 'Top 10 Pokemon Cards to Watch in 2025',
      excerpt: 'Our AI analysis reveals the most promising Pokemon cards for investment in the coming year. From Base Set classics to modern chase cards.',
      category: 'Investment',
      date: '2024-12-08',
      readTime: '8 min read',
      icon: Target,
    },
    {
      title: 'How to Authenticate Your Trading Cards',
      excerpt: 'A comprehensive guide to understanding card grading and authentication services. Learn the difference between PSA, BGS, and CGC.',
      category: 'Guides',
      date: '2024-12-05',
      readTime: '10 min read',
      icon: Shield,
    },
    {
      title: 'Understanding Card Condition: Raw vs. Graded',
      excerpt: 'Should you grade your cards? We break down the pros and cons of raw vs. professionally graded cards and when each makes sense.',
      category: 'Education',
      date: '2024-12-03',
      readTime: '6 min read',
      icon: Lightbulb,
    },
    {
      title: 'Sports Card Market Update: December 2024',
      excerpt: 'Monthly market analysis covering NBA, NFL, and soccer cards. See which players are trending up and where opportunities exist.',
      category: 'Market Analysis',
      date: '2024-12-01',
      readTime: '7 min read',
      icon: TrendingUp,
    },
    {
      title: 'Building Your First Portfolio: A Beginner\'s Guide',
      excerpt: 'New to card collecting? Learn how to start building a diversified portfolio with our step-by-step guide for beginners.',
      category: 'Guides',
      date: '2024-11-28',
      readTime: '12 min read',
      icon: Target,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">Blog</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Latest News & Insights
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Stay updated with market trends, collecting tips, investment strategies, and platform updates.
            </p>
          </div>

          {/* Featured Post */}
          {posts[0] && (() => {
            const FeaturedIcon = posts[0].icon;
            return (
            <Card className="mb-8 overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-2/5 h-64 md:h-auto bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <FeaturedIcon className="w-24 h-24 text-primary/40 group-hover:text-primary/60 transition-colors" />
                  </div>
                  <div className="p-8 flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="default">{posts[0].category}</Badge>
                      <Badge variant="secondary">Featured</Badge>
                    </div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold mb-3 group-hover:text-primary transition-colors">
                      {posts[0].title}
                    </h2>
                    <p className="text-muted-foreground mb-6">{posts[0].excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(posts[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {posts[0].readTime}
                        </span>
                      </div>
                      <span className="text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read Article <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
          })()}

          {/* Other Posts */}
          <div className="grid md:grid-cols-2 gap-6">
            {posts.slice(1).map((post) => {
              const PostIcon = post.icon;
              return (
              <Card key={post.title} className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <PostIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="mb-2">{post.category}</Badge>
                      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.readTime}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
