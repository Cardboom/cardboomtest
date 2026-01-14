import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Newspaper } from 'lucide-react';
import { formatCategoryName } from '@/lib/categoryFormatter';

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  image_url: string | null;
  category: string | null;
  created_at: string;
}

export const NewsPanel = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('cardboom_news')
        .select('id, title, slug, summary, image_url, category, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category?.toLowerCase()) {
      case 'pokemon': return 'bg-yellow-500/20 text-yellow-400';
      case 'yugioh': return 'bg-purple-500/20 text-purple-400';
      case 'onepiece': return 'bg-red-500/20 text-red-400';
      case 'sports': return 'bg-blue-500/20 text-blue-400';
      case 'grading': return 'bg-emerald-500/20 text-emerald-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="h-[100px] md:h-[140px] rounded-[18px] bg-card/50 animate-pulse" />
    );
  }

  if (news.length === 0) return null;

  // Double news for seamless loop
  const loopedNews = [...news, ...news];

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-[18px]",
        "bg-[#f5f5f7] dark:bg-gradient-to-br dark:from-[#0a0f1a] dark:via-[#0d1321] dark:to-[#101820]",
        "border border-black/[0.04] dark:border-white/5",
        "h-[120px] md:h-[160px]",
        "shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_40px_rgba(0,0,0,0.3)]"
      )}
      style={{ backdropFilter: 'blur(22px)' }}
    >
      {/* Noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Accent line - Tiffany brand color */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent" />

      {/* Header - Tiffany branding */}
      <div className="absolute top-2 left-3 flex items-center gap-1.5 z-10">
        <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
          <Newspaper className="w-2.5 h-2.5 text-primary" />
        </div>
        <span className="font-sans text-[10px] md:text-[11px] text-primary uppercase tracking-widest font-bold">
          CARDBOOM NEWS
        </span>
      </div>

      {/* Auto-scrolling horizontal container */}
      <div className="absolute inset-x-0 top-8 bottom-2 overflow-hidden">
        <div 
          className="flex gap-3 h-full px-3"
          style={{ 
            animation: 'newsMarquee 120s linear infinite',
            width: 'max-content'
          }}
        >
          {loopedNews.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              onClick={() => navigate(`/news/${item.slug}`)}
              className={cn(
                "flex-shrink-0 w-[220px] md:w-[280px] h-full",
                "rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/5",
                "overflow-hidden cursor-pointer group",
                "hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:border-black/[0.06] dark:hover:border-white/10 transition-all duration-200"
              )}
            >
              <div className="flex h-full items-center">
                {/* Image */}
                {item.image_url && (
                  <div className="w-20 md:w-24 h-[80%] flex-shrink-0 overflow-hidden rounded-l-lg ml-1">
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                
                {/* Content */}
                <div className="flex-1 px-2 py-1 flex flex-col justify-center min-w-0">
                  {item.category && (
                    <span className={cn(
                      "inline-block w-fit px-1.5 py-0.5 rounded text-[8px] font-sans font-bold uppercase mb-1",
                      getCategoryColor(item.category)
                    )}>
                      {formatCategoryName(item.category)}
                    </span>
                  )}
                  <h3 className="font-sans font-bold text-[10px] md:text-[11px] text-foreground/90 leading-tight line-clamp-2 group-hover:text-foreground transition-colors">
                    {item.title}
                  </h3>
                  <p className="font-sans text-[8px] text-gray-500 mt-1">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes newsMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};