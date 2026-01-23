/**
 * Programmatic SEO Type Definitions
 * Core types for scalable SEO page generation
 */

// ============= Page Intent Types =============
export type PageIntent = 
  | 'product'           // Individual product/card pages
  | 'category'          // Category listing pages
  | 'collection'        // Curated collections (longtail)
  | 'comparison'        // Comparison pages (vs pages)
  | 'guide'             // Educational guides
  | 'faq'               // FAQ pages
  | 'article'           // Blog/news articles
  | 'landing'           // Marketing landing pages
  | 'profile'           // User/seller profiles
  | 'transactional';    // Checkout/order pages (noindex)

// ============= Schema Types =============
export type SchemaType = 
  | 'Product'
  | 'CollectionPage'
  | 'FAQPage'
  | 'Article'
  | 'WebPage'
  | 'BreadcrumbList'
  | 'Organization'
  | 'Dataset'
  | 'ItemList'
  | 'Offer'
  | 'AggregateOffer'
  | 'AggregateRating';

// ============= Page Data Interfaces =============
export interface SEOPageData {
  /** Page intent determines template and content generation strategy */
  intent: PageIntent;
  
  /** Primary entity name (card name, category name, article title) */
  entityName: string;
  
  /** Entity type for schema (Pokemon Card, MTG Card, etc) */
  entityType?: string;
  
  /** Category/vertical */
  category?: string;
  
  /** Subcategory or set name */
  subcategory?: string;
  
  /** Unique identifier (canonical key, slug, id) */
  identifier: string;
  
  /** Primary image URL */
  image?: string;
  
  /** Additional images */
  images?: string[];
  
  /** Price data for products */
  pricing?: PriceData;
  
  /** Rating data */
  rating?: RatingData;
  
  /** Date information */
  dates?: DateData;
  
  /** Custom FAQs */
  faqs?: FAQItem[];
  
  /** Related entities for internal linking */
  related?: RelatedEntity[];
  
  /** Keywords for content generation */
  keywords?: string[];
  
  /** Custom meta overrides */
  customMeta?: CustomMetaData;
}

export interface PriceData {
  current?: number;
  low?: number;
  high?: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  offerCount?: number;
  condition?: 'new' | 'used' | 'refurbished';
}

export interface RatingData {
  value: number;
  count: number;
  best?: number;
  worst?: number;
}

export interface DateData {
  published?: string;
  modified?: string;
  expires?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface RelatedEntity {
  name: string;
  url: string;
  type: 'category' | 'product' | 'article' | 'collection';
  image?: string;
}

export interface CustomMetaData {
  title?: string;
  description?: string;
  keywords?: string[];
  noIndex?: boolean;
  noFollow?: boolean;
  canonicalOverride?: string;
}

// ============= Breadcrumb Types =============
export interface BreadcrumbItem {
  name: string;
  url: string;
}

// ============= Generated Content Types =============
export interface GeneratedSEOContent {
  title: string;
  description: string;
  h1: string;
  keywords: string[];
  faqs: FAQItem[];
  introText?: string;
  contentBlocks?: ContentBlock[];
}

export interface ContentBlock {
  type: 'paragraph' | 'list' | 'comparison' | 'cta';
  heading?: string;
  content: string | string[];
}

// ============= Internal Linking Types =============
export interface InternalLink {
  anchor: string;
  url: string;
  relevance: number; // 0-1 score for prioritization
  type: 'hub' | 'spoke' | 'sibling' | 'child' | 'parent';
}

export interface LinkCluster {
  hubUrl: string;
  hubName: string;
  spokes: InternalLink[];
}

// ============= Page Template Config =============
export interface PageTemplateConfig {
  intent: PageIntent;
  schemaTypes: SchemaType[];
  generateFAQs: boolean;
  generateRelated: boolean;
  indexable: boolean;
  cacheStrategy: 'static' | 'dynamic' | 'revalidate';
  revalidateSeconds?: number;
}

// ============= Category/Vertical Configuration =============
export interface VerticalConfig {
  slug: string;
  dbKey: string;
  displayName: string;
  pluralName: string;
  description: string;
  keywords: string[];
  parent?: string;
  children?: string[];
  faqs?: FAQItem[];
  contentTemplates?: Record<string, string>;
}

// ============= URL Pattern Definitions =============
export interface URLPattern {
  pattern: RegExp;
  intent: PageIntent;
  extractParams: (match: RegExpMatchArray) => Record<string, string>;
}
