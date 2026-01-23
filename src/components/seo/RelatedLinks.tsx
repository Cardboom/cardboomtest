/**
 * Related Links Component
 * Displays hub-and-spoke internal links for SEO
 */

import { Link } from 'react-router-dom';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InternalLink, RelatedEntity } from '@/lib/seo/types';

interface RelatedLinksProps {
  /** Links to display */
  links: (InternalLink | RelatedEntity)[];
  /** Section title */
  title?: string;
  /** Layout style */
  layout?: 'horizontal' | 'vertical' | 'grid';
  /** Additional className */
  className?: string;
  /** Show as pills/badges */
  pills?: boolean;
  /** Max links to show */
  maxLinks?: number;
}

export const RelatedLinks = ({
  links,
  title = 'Related',
  layout = 'horizontal',
  className,
  pills = false,
  maxLinks = 6,
}: RelatedLinksProps) => {
  if (!links || links.length === 0) return null;

  const displayLinks = links.slice(0, maxLinks);

  const layoutClasses = {
    horizontal: 'flex flex-wrap gap-2',
    vertical: 'flex flex-col gap-2',
    grid: 'grid grid-cols-2 md:grid-cols-3 gap-3',
  };

  const linkBaseClasses = pills
    ? 'px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-sm font-medium transition-colors'
    : 'text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1';

  return (
    <nav className={cn('space-y-3', className)} aria-label={title}>
      {title && (
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
      )}
      
      <ul className={layoutClasses[layout]}>
        {displayLinks.map((link, index) => {
          // Normalize to common structure
          const url = 'url' in link ? link.url : '';
          const anchor = 'anchor' in link ? link.anchor : ('name' in link ? link.name : '');
          const isExternal = url.startsWith('http');

          return (
            <li key={url || index}>
              {isExternal ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkBaseClasses}
                >
                  {anchor}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <Link to={url} className={linkBaseClasses}>
                  {anchor}
                  {!pills && <ChevronRight className="w-3 h-3" />}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

/**
 * Category Cross-Links for bottom of pages
 */
interface CategoryLinksProps {
  currentCategory?: string;
  categories: Array<{ name: string; url: string }>;
  className?: string;
}

export const CategoryLinks = ({
  currentCategory,
  categories,
  className,
}: CategoryLinksProps) => {
  const otherCategories = categories.filter(
    c => !currentCategory || !c.url.includes(currentCategory)
  );

  if (otherCategories.length === 0) return null;

  return (
    <section className={cn('py-8 border-t border-border/20', className)}>
      <div className="container mx-auto px-4">
        <h2 className="font-display text-xl font-bold mb-4 text-center">
          Explore More Categories
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {otherCategories.map((cat) => (
            <Link
              key={cat.url}
              to={cat.url}
              className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelatedLinks;
