import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { CartDrawer } from '@/components/CartDrawer';
import { Link } from 'react-router-dom';

const Blog = () => {
  const [cartOpen, setCartOpen] = useState(false);

  const posts = [
    {
      title: 'The Rise of Fractional Ownership in Collectibles',
      excerpt: 'How fractional ownership is democratizing access to high-value trading cards and collectibles.',
      category: 'Market Trends',
      date: '2024-12-10',
      readTime: '5 min read',
      image: '/placeholder.svg',
    },
    {
      title: 'Top 10 Pokemon Cards to Watch in 2025',
      excerpt: 'Our AI analysis reveals the most promising Pokemon cards for investment in the coming year.',
      category: 'Investment',
      date: '2024-12-08',
      readTime: '8 min read',
      image: '/placeholder.svg',
    },
    {
      title: 'How to Authenticate Your Trading Cards',
      excerpt: 'A comprehensive guide to understanding card grading and authentication services.',
      category: 'Guides',
      date: '2024-12-05',
      readTime: '10 min read',
      image: '/placeholder.svg',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">Blog</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Latest News & Insights
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Stay updated with market trends, collecting tips, and platform updates.
            </p>
          </div>

          <div className="grid gap-8">
            {posts.map((post) => (
              <Card key={post.title} className="overflow-hidden hover:border-primary/50 transition-colors">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/3 h-48 md:h-auto bg-muted" />
                    <div className="p-6 flex-1">
                      <Badge variant="secondary" className="mb-3">{post.category}</Badge>
                      <h3 className="font-semibold text-xl mb-2 hover:text-primary transition-colors cursor-pointer">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.readTime}
                          </span>
                        </div>
                        <span className="text-primary text-sm font-medium flex items-center gap-1 cursor-pointer hover:gap-2 transition-all">
                          Read More <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;