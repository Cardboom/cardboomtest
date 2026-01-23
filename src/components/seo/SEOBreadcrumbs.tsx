/**
 * SEO Breadcrumbs Component
 * Renders accessible breadcrumb navigation with structured data
 */

import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/lib/seo/types';

interface SEOBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  separator?: 'chevron' | 'slash';
}

export const SEOBreadcrumbs = ({
  items,
  className,
  showHome = true,
  separator = 'chevron',
}: SEOBreadcrumbsProps) => {
  // Prepend home if not already present
  const allItems = showHome && items[0]?.name !== 'Home'
    ? [{ name: 'Home', url: '/' }, ...items]
    : items;

  const SeparatorIcon = separator === 'chevron' 
    ? () => <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
    : () => <span className="text-muted-foreground/60 mx-1">/</span>;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center flex-wrap gap-1 text-sm', className)}
    >
      <ol className="flex items-center flex-wrap gap-1" itemScope itemType="https://schema.org/BreadcrumbList">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isHome = item.name === 'Home';

          return (
            <li
              key={item.url || item.name}
              className="flex items-center gap-1"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {index > 0 && <SeparatorIcon />}
              
              {isLast || !item.url ? (
                <span
                  className="text-foreground font-medium truncate max-w-[200px]"
                  itemProp="name"
                  aria-current="page"
                >
                  {isHome ? <Home className="w-3.5 h-3.5" /> : item.name}
                </span>
              ) : (
                <Link
                  to={item.url}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
                  itemProp="item"
                >
                  <span itemProp="name">
                    {isHome ? <Home className="w-3.5 h-3.5" /> : item.name}
                  </span>
                </Link>
              )}
              
              <meta itemProp="position" content={String(index + 1)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default SEOBreadcrumbs;
