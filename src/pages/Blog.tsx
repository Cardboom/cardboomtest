import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowRight, TrendingUp, Shield, Lightbulb, Target, BookOpen, Newspaper } from 'lucide-react';
import { useState } from 'react';
import { CartDrawer } from '@/components/CartDrawer';
import { Link } from 'react-router-dom';
import { blogArticles } from '@/data/blogArticles';
import { Helmet } from 'react-helmet-async';

const categoryIcons: Record<string, any> = {
  'Market Trends': TrendingUp,
  'Investment': Target,
  'Guides': BookOpen,
  'Education': Lightbulb,
  'Market Analysis': TrendingUp,
  'Platform': Shield,
};

const Blog = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(blogArticles.map(a => a.category))];
  
  const filteredArticles = selectedCategory 
    ? blogArticles.filter(a => a.category === selectedCategory)
    : blogArticles;

  const featuredArticle = blogArticles.find(a => a.featured);
  const otherArticles = filteredArticles.filter(a => !a.featured || selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Blog & News | Cardboom - TCG Investment Insights</title>
        <meta name="description" content="Stay updated with the latest trading card market trends, investment strategies, collecting tips, and platform updates from Cardboom." />
        <meta property="og:title" content="Blog & News | Cardboom" />
        <meta property="og:description" content="Expert insights on TCG investing, card grading, market analysis, and more." />
        <meta name="keywords" content="TCG blog, trading cards, pokemon cards investment, card grading guide, TCG market analysis" />
        <link rel="canonical" href="https://cardboom.com/blog" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "Cardboom Blog",
            "description": "Expert insights on TCG investing and collecting",
            "url": "https://cardboom.com/blog",
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

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-4">
              <Newspaper className="w-4 h-4" />
              Blog & News
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Latest News & Insights
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Stay updated with market trends, collecting tips, investment strategies, and platform updates.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            <Badge 
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer px-4 py-2"
              onClick={() => setSelectedCategory(null)}
            >
              All Articles
            </Badge>
            {categories.map(category => (
              <Badge 
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer px-4 py-2"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>

          {/* Featured Post */}
          {featuredArticle && !selectedCategory && (
            <Link to={`/blog/${featuredArticle.slug}`}>
              <Card className="mb-8 overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-2/5 h-64 md:h-auto bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      {(() => {
                        const Icon = categoryIcons[featuredArticle.category] || TrendingUp;
                        return <Icon className="w-24 h-24 text-primary/40 group-hover:text-primary/60 transition-colors" />;
                      })()}
                    </div>
                    <div className="p-8 flex-1">
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="default">{featuredArticle.category}</Badge>
                        <Badge variant="secondary">Featured</Badge>
                      </div>
                      <h2 className="font-display text-2xl md:text-3xl font-bold mb-3 group-hover:text-primary transition-colors">
                        {featuredArticle.title}
                      </h2>
                      <p className="text-muted-foreground mb-6">{featuredArticle.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(featuredArticle.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {featuredArticle.readTime}
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
            </Link>
          )}

          {/* Other Posts */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherArticles.map((post) => {
              const PostIcon = categoryIcons[post.category] || TrendingUp;
              return (
                <Link key={post.slug} to={`/blog/${post.slug}`}>
                  <Card className="h-full overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group">
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
                </Link>
              );
            })}
          </div>

          {/* Newsletter CTA */}
          <Card className="mt-12 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-8 text-center">
              <h3 className="font-display text-2xl font-bold mb-2">Stay Updated</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Get the latest market insights and investment tips delivered to your inbox.
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
