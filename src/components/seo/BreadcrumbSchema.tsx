import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { generateBreadcrumbSchema, SITE_URL } from '@/lib/seoUtils';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * SEO-optimized Breadcrumb component with BreadcrumbList schema markup
 * Renders both visible breadcrumbs and structured data for rich results
 */
export const BreadcrumbSchema = ({ items, className = '' }: BreadcrumbSchemaProps) => {
  // Prepend Home to the breadcrumb trail
  const fullItems: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    ...items,
  ];

  // Generate schema data
  const schemaItems = fullItems.map((item, index) => ({
    name: item.name,
    url: item.href || '',
  }));

  const schema = generateBreadcrumbSchema(schemaItems);

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      </Helmet>
      
      <nav 
        aria-label="Breadcrumb" 
        className={`flex items-center gap-1 text-sm text-muted-foreground flex-wrap ${className}`}
      >
        <ol 
          className="flex items-center gap-1 flex-wrap"
          itemScope 
          itemType="https://schema.org/BreadcrumbList"
        >
          {fullItems.map((item, index) => {
            const isLast = index === fullItems.length - 1;
            
            return (
              <li 
                key={index}
                className="flex items-center gap-1"
                itemProp="itemListElement" 
                itemScope 
                itemType="https://schema.org/ListItem"
              >
                {index > 0 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                )}
                
                {isLast || !item.href ? (
                  <span 
                    className="text-foreground font-medium truncate max-w-[200px]"
                    itemProp="name"
                  >
                    {index === 0 ? <Home className="w-3.5 h-3.5" /> : item.name}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className="hover:text-foreground transition-colors flex items-center gap-1"
                    itemProp="item"
                  >
                    <span itemProp="name">
                      {index === 0 ? <Home className="w-3.5 h-3.5" /> : item.name}
                    </span>
                  </Link>
                )}
                
                <meta itemProp="position" content={String(index + 1)} />
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};

export default BreadcrumbSchema;
