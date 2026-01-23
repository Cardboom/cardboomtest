/**
 * Dynamic Content Generation for Programmatic SEO
 * Generates unique, intent-matched content to avoid thin content and duplication
 */

import type { 
  SEOPageData, 
  GeneratedSEOContent, 
  FAQItem, 
  PageIntent,
  ContentBlock 
} from './types';
import { 
  SITE_CONFIG, 
  VERTICAL_CONFIG, 
  TITLE_TEMPLATES, 
  DESCRIPTION_TEMPLATES,
  SEO_LIMITS 
} from './config';

// ============= Title Generation =============
export function generateTitle(data: SEOPageData): string {
  const template = TITLE_TEMPLATES[data.intent];
  
  // Start with custom override if provided
  if (data.customMeta?.title) {
    return truncate(data.customMeta.title, SEO_LIMITS.titleMax);
  }
  
  let title = template
    .replace('{name}', data.entityName)
    .replace('{site}', SITE_CONFIG.name)
    .replace('{category}', data.category || '')
    .replace('{subcategory}', data.subcategory || '');
  
  // Add condition/variant info for products
  if (data.intent === 'product' && data.pricing?.condition) {
    const conditionMap = { new: 'New', used: 'Used', refurbished: 'Refurbished' };
    title = title.replace('Price & Market Data', `Buy ${conditionMap[data.pricing.condition]}`);
  }
  
  return truncate(title, SEO_LIMITS.titleMax);
}

// ============= Description Generation =============
export function generateDescription(data: SEOPageData): string {
  const template = DESCRIPTION_TEMPLATES[data.intent];
  
  // Custom override
  if (data.customMeta?.description) {
    return truncate(data.customMeta.description, SEO_LIMITS.descriptionMax);
  }
  
  // Build price info string
  let priceInfo = '';
  if (data.pricing?.current) {
    priceInfo = `at $${data.pricing.current.toFixed(0)}`;
  } else if (data.pricing?.low && data.pricing?.high) {
    priceInfo = `from $${data.pricing.low.toFixed(0)}`;
  }
  
  // Build condition string
  let condition = 'All conditions available';
  if (data.pricing?.condition) {
    const conditionMap = { new: 'Brand new', used: 'Pre-owned', refurbished: 'Certified refurbished' };
    condition = conditionMap[data.pricing.condition];
  }
  
  // Get vertical description if available
  const verticalConfig = data.category ? VERTICAL_CONFIG[data.category] : null;
  const categoryDescription = verticalConfig?.description || '';
  
  let description = template
    .replace('{name}', data.entityName)
    .replace('{site}', SITE_CONFIG.name)
    .replace('{priceInfo}', priceInfo)
    .replace('{condition}', condition)
    .replace('{description}', categoryDescription || `Discover ${data.entityName} on ${SITE_CONFIG.name}.`);
  
  return truncate(description, SEO_LIMITS.descriptionMax);
}

// ============= H1 Generation =============
export function generateH1(data: SEOPageData): string {
  switch (data.intent) {
    case 'product':
      return data.entityName;
    case 'category':
      return `Buy ${data.entityName} Online`;
    case 'collection':
      return data.entityName;
    case 'comparison':
      return `${data.entityName} Comparison`;
    case 'guide':
      return data.entityName;
    case 'faq':
      return `${data.entityName} - Frequently Asked Questions`;
    case 'article':
      return data.entityName;
    default:
      return data.entityName;
  }
}

// ============= FAQ Generation =============
export function generateFAQs(data: SEOPageData): FAQItem[] {
  // Return custom FAQs if provided
  if (data.faqs && data.faqs.length > 0) {
    return data.faqs.slice(0, SEO_LIMITS.faqsMax);
  }
  
  // Get vertical-specific FAQs
  const verticalConfig = data.category ? VERTICAL_CONFIG[data.category] : null;
  const verticalFAQs = verticalConfig?.faqs || [];
  
  // Generate intent-specific FAQs
  const generatedFAQs = generateIntentFAQs(data);
  
  // Combine and dedupe
  const allFAQs = [...verticalFAQs, ...generatedFAQs];
  const uniqueFAQs = deduplicateFAQs(allFAQs);
  
  return uniqueFAQs.slice(0, SEO_LIMITS.faqsMax);
}

function generateIntentFAQs(data: SEOPageData): FAQItem[] {
  const { entityName, intent, category } = data;
  const verticalConfig = category ? VERTICAL_CONFIG[category] : null;
  const categoryName = verticalConfig?.pluralName || `${category} cards`;
  
  switch (intent) {
    case 'product':
      return [
        {
          question: `What is the current price of ${entityName}?`,
          answer: data.pricing?.current 
            ? `The current market price for ${entityName} is approximately $${data.pricing.current.toFixed(2)}. Prices update in real-time based on market activity.`
            : `Check our live price tracker for the current value of ${entityName}. Prices update based on recent sales and listings.`,
        },
        {
          question: `Is ${entityName} a good investment?`,
          answer: `Investment potential depends on factors like rarity, condition, and market trends. Use our price history chart to analyze ${entityName}'s performance over time.`,
        },
        {
          question: `How do I verify authenticity of ${entityName}?`,
          answer: `${SITE_CONFIG.name} offers AI-powered grading and partners with PSA, BGS, and CGC for professional authentication. All sellers are verified.`,
        },
      ];
      
    case 'category':
      return [
        {
          question: `Are ${categoryName} on ${SITE_CONFIG.name} authentic?`,
          answer: `Yes, all ${categoryName} sold on ${SITE_CONFIG.name} are from verified sellers. We offer buyer protection and dispute resolution to ensure authenticity.`,
        },
        {
          question: `How do I sell my ${categoryName}?`,
          answer: `Create a free account, click "Sell", upload photos of your cards, and set your price. Our AI helps grade your cards and suggests competitive pricing.`,
        },
        {
          question: `What payment methods are accepted for ${categoryName}?`,
          answer: `We accept credit/debit cards and wallet balance. All transactions are secured with buyer protection.`,
        },
        {
          question: `Do you offer grading services for ${categoryName}?`,
          answer: `Yes! ${SITE_CONFIG.name} offers AI-powered card grading and partners with professional grading companies like PSA, BGS, and CGC.`,
        },
      ];
      
    case 'collection':
      return [
        {
          question: `Where can I find ${entityName.toLowerCase()}?`,
          answer: `${SITE_CONFIG.name} offers a curated selection of ${entityName.toLowerCase()} from verified sellers. Browse our marketplace for the best deals with buyer protection.`,
        },
        {
          question: `How do I know I'm getting a good price?`,
          answer: `${SITE_CONFIG.name} provides real-time market data and price history so you can compare prices and find the best deals.`,
        },
      ];
      
    case 'guide':
    case 'comparison':
      return [
        {
          question: `How often is this information updated?`,
          answer: `Our research is updated regularly to reflect current market conditions and industry changes. Check the "Last Updated" date for the most recent revision.`,
        },
        {
          question: `Can I trust this information?`,
          answer: `All content is based on publicly available data, official company information, and expert analysis. We strive for neutrality and accuracy.`,
        },
      ];
      
    default:
      return [];
  }
}

function deduplicateFAQs(faqs: FAQItem[]): FAQItem[] {
  const seen = new Set<string>();
  return faqs.filter(faq => {
    const key = faq.question.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============= Keywords Generation =============
export function generateKeywords(data: SEOPageData): string[] {
  const keywords: string[] = [];
  
  // Custom keywords
  if (data.customMeta?.keywords) {
    keywords.push(...data.customMeta.keywords);
  }
  
  // Data-provided keywords
  if (data.keywords) {
    keywords.push(...data.keywords);
  }
  
  // Vertical keywords
  const verticalConfig = data.category ? VERTICAL_CONFIG[data.category] : null;
  if (verticalConfig?.keywords) {
    keywords.push(...verticalConfig.keywords);
  }
  
  // Entity-based keywords
  keywords.push(data.entityName.toLowerCase());
  if (data.category) {
    keywords.push(`${data.category} cards`);
    keywords.push(`buy ${data.category}`);
  }
  
  // Intent-based keywords
  switch (data.intent) {
    case 'product':
      keywords.push(`${data.entityName} price`, `${data.entityName} value`, `buy ${data.entityName}`);
      break;
    case 'category':
      keywords.push(`${data.entityName} for sale`, `cheap ${data.entityName}`, `${data.entityName} marketplace`);
      break;
    case 'comparison':
      keywords.push(`${data.entityName} comparison`, `best ${data.entityName}`);
      break;
  }
  
  // Dedupe and limit
  const unique = [...new Set(keywords.map(k => k.toLowerCase()))];
  return unique.slice(0, SEO_LIMITS.keywordsMax);
}

// ============= Content Block Generation =============
export function generateContentBlocks(data: SEOPageData): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const verticalConfig = data.category ? VERTICAL_CONFIG[data.category] : null;
  
  switch (data.intent) {
    case 'category':
      blocks.push({
        type: 'paragraph',
        heading: `About ${data.entityName}`,
        content: verticalConfig?.description || 
          `${SITE_CONFIG.name} is the premier marketplace for ${data.entityName.toLowerCase()}. Whether you're looking for rare vintage items, tournament staples, or the latest releases, our verified sellers offer competitive prices with full buyer protection.`,
      });
      
      blocks.push({
        type: 'list',
        heading: 'Why Buy on CardBoom',
        content: [
          'AI-powered card grading for accurate condition assessment',
          'Verified sellers with buyer protection on every purchase',
          'Real-time market prices and price history tracking',
          'Secure payments and tracked shipping',
          'Dispute resolution if anything goes wrong',
        ],
      });
      break;
      
    case 'product':
      if (data.pricing?.current) {
        blocks.push({
          type: 'paragraph',
          heading: 'Market Overview',
          content: `${data.entityName} is currently valued at $${data.pricing.current.toFixed(2)} based on recent market activity. Track price trends and find the best deals on ${SITE_CONFIG.name}.`,
        });
      }
      break;
      
    case 'collection':
      blocks.push({
        type: 'cta',
        content: `Browse our curated selection of ${data.entityName.toLowerCase()} from verified sellers with buyer protection.`,
      });
      break;
  }
  
  return blocks;
}

// ============= Full Content Generation =============
export function generateSEOContent(data: SEOPageData): GeneratedSEOContent {
  return {
    title: generateTitle(data),
    description: generateDescription(data),
    h1: generateH1(data),
    keywords: generateKeywords(data),
    faqs: generateFAQs(data),
    contentBlocks: generateContentBlocks(data),
  };
}

// ============= Utility Functions =============
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ============= Content Uniqueness Helpers =============
/**
 * Adds variability to content to avoid duplication across pages
 */
export function addContentVariability(
  baseContent: string,
  data: SEOPageData,
  seed: number = 0
): string {
  const variations = [
    { find: 'Buy', replace: ['Shop', 'Purchase', 'Get', 'Find'] },
    { find: 'best', replace: ['top', 'finest', 'premier', 'leading'] },
    { find: 'competitive', replace: ['great', 'fair', 'attractive', 'excellent'] },
    { find: 'verified', replace: ['trusted', 'authenticated', 'vetted', 'proven'] },
  ];
  
  let result = baseContent;
  const entityHash = hashString(data.identifier + seed);
  
  variations.forEach((v, i) => {
    const variantIndex = (entityHash + i) % v.replace.length;
    const regex = new RegExp(`\\b${v.find}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      // Preserve case
      if (match[0] === match[0].toUpperCase()) {
        return v.replace[variantIndex].charAt(0).toUpperCase() + v.replace[variantIndex].slice(1);
      }
      return v.replace[variantIndex];
    });
  });
  
  return result;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
