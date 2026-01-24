/**
 * FAQ Section Component with Schema Markup
 * Renders FAQ accordion with proper structured data
 */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FAQItem } from '@/lib/seo/types';

interface FAQSectionProps {
  faqs: FAQItem[];
  title?: string;
  className?: string;
  /** Limit number of FAQs shown */
  limit?: number;
  /** Start collapsed */
  defaultClosed?: boolean;
  /** Schema already rendered by parent (UniversalSEO) */
  skipSchema?: boolean;
}

export const FAQSectionSEO = ({
  faqs,
  title = 'Frequently Asked Questions',
  className,
  limit,
  defaultClosed = false,
  skipSchema = false,
}: FAQSectionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultClosed ? null : 0);
  
  const displayFaqs = limit ? faqs.slice(0, limit) : faqs;

  if (displayFaqs.length === 0) return null;

  return (
    <section className={cn('py-8', className)} aria-labelledby="faq-heading">
      {title && (
        <h2 
          id="faq-heading"
          className="font-display text-2xl font-bold mb-6 text-center"
        >
          {title}
        </h2>
      )}
      
      <div 
        className="max-w-3xl mx-auto space-y-3"
        itemScope 
        itemType="https://schema.org/FAQPage"
      >
        {displayFaqs.map((faq, index) => (
          <article
            key={index}
            className="border border-border/50 rounded-lg overflow-hidden bg-card"
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
              aria-expanded={openIndex === index}
              aria-controls={`faq-answer-${index}`}
            >
              <h3 
                className="font-semibold pr-4"
                itemProp="name"
              >
                {faq.question}
              </h3>
              <ChevronDown 
                className={cn(
                  'w-5 h-5 text-muted-foreground transition-transform flex-shrink-0',
                  openIndex === index && 'rotate-180'
                )} 
              />
            </button>
            
            <div
              id={`faq-answer-${index}`}
              className={cn(
                'overflow-hidden transition-all duration-200',
                openIndex === index ? 'max-h-96' : 'max-h-0'
              )}
              itemScope
              itemProp="acceptedAnswer"
              itemType="https://schema.org/Answer"
            >
              <div 
                className="px-5 pb-4 text-muted-foreground text-sm leading-relaxed"
                itemProp="text"
              >
                {faq.answer}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

// Export with both names for compatibility
export { FAQSectionSEO as FAQSection };
export default FAQSectionSEO;
