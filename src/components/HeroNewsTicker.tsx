import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  created_at: string;
}

export function HeroNewsTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const { data: news } = useQuery({
    queryKey: ['hero-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cardboom_news')
        .select('id, title, slug, category, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as NewsItem[];
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (!news?.length) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % news.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [news?.length]);

  if (!news?.length) return null;

  const currentNews = news[currentIndex];
  
  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'pokemon': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case 'yugioh': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'mtg': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'sports': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'onepiece': return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'grading': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
      case 'market': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      default: return 'bg-primary/10 text-primary';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <Link 
        to={`/news/${currentNews.slug}`}
        className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-card/60 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all"
      >
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Latest
          </span>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentNews.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2"
            >
              {currentNews.category && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${getCategoryColor(currentNews.category)}`}>
                  {currentNews.category}
                </span>
              )}
              <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {currentNews.title}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
        
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </Link>
      
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mt-2">
        {news.map((_, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.preventDefault();
              setCurrentIndex(i);
            }}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              i === currentIndex ? 'bg-primary w-4' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
