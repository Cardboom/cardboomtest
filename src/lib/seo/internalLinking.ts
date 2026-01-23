/**
 * Internal Linking Architecture
 * Hub-and-spoke structure with related pages and breadcrumbs
 */

import type { 
  SEOPageData, 
  BreadcrumbItem, 
  InternalLink, 
  LinkCluster,
  RelatedEntity 
} from './types';
import { SITE_CONFIG, VERTICAL_CONFIG, URL_TO_DB_CATEGORY } from './config';

// ============= Hub Definitions =============
const CONTENT_HUBS: Record<string, LinkCluster> = {
  marketplace: {
    hubUrl: '/markets',
    hubName: 'Marketplace',
    spokes: [
      { anchor: 'Pokémon Cards', url: '/buy/pokemon-cards', relevance: 1, type: 'spoke' },
      { anchor: 'MTG Cards', url: '/buy/mtg-cards', relevance: 1, type: 'spoke' },
      { anchor: 'Yu-Gi-Oh! Cards', url: '/buy/yugioh-cards', relevance: 1, type: 'spoke' },
      { anchor: 'One Piece Cards', url: '/buy/one-piece-cards', relevance: 1, type: 'spoke' },
      { anchor: 'Lorcana Cards', url: '/buy/lorcana-cards', relevance: 0.9, type: 'spoke' },
      { anchor: 'Sports Cards', url: '/buy/nba-cards', relevance: 0.8, type: 'spoke' },
    ],
  },
  grading: {
    hubUrl: '/grading',
    hubName: 'Card Grading',
    spokes: [
      { anchor: 'How Card Grading Works', url: '/ai/how-card-grading-works', relevance: 1, type: 'spoke' },
      { anchor: 'Grading Costs 2026', url: '/ai/card-grading-costs-2026', relevance: 0.9, type: 'spoke' },
      { anchor: 'PSA vs BGS vs CGC', url: '/ai/psa-vs-bgs-vs-cgc-vs-cardboom', relevance: 0.95, type: 'spoke' },
      { anchor: 'AI Grading Explained', url: '/ai/ai-card-grading-explained', relevance: 0.9, type: 'spoke' },
      { anchor: 'Best Grading Companies', url: '/ai/best-card-grading-companies', relevance: 0.85, type: 'spoke' },
    ],
  },
  research: {
    hubUrl: '/ai',
    hubName: 'Research',
    spokes: [
      { anchor: 'Card Grading Questions', url: '/ai/card-grading-questions', relevance: 1, type: 'spoke' },
      { anchor: 'AI Grading FAQ', url: '/ai/ai-grading-faq', relevance: 0.95, type: 'spoke' },
      { anchor: 'Complete Grading Guide', url: '/ai/card-grading-guide', relevance: 0.9, type: 'spoke' },
    ],
  },
  deals: {
    hubUrl: '/deals',
    hubName: 'Deals',
    spokes: [
      { anchor: 'Pokemon Cards Under $10', url: '/deals/pokemon-cards-under-10', relevance: 1, type: 'spoke' },
      { anchor: 'Pokemon Cards Under $50', url: '/deals/pokemon-cards-under-50', relevance: 0.9, type: 'spoke' },
      { anchor: 'PSA 10 Pokemon Cards', url: '/deals/psa-10-pokemon-cards', relevance: 0.85, type: 'spoke' },
      { anchor: 'Charizard Cards', url: '/deals/charizard-cards', relevance: 0.8, type: 'spoke' },
    ],
  },
};

// ============= Breadcrumb Generation =============
export function generateBreadcrumbs(data: SEOPageData): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', url: '/' },
  ];
  
  switch (data.intent) {
    case 'product':
      breadcrumbs.push({ name: 'Marketplace', url: '/markets' });
      if (data.category) {
        const vertical = VERTICAL_CONFIG[data.category];
        breadcrumbs.push({ 
          name: vertical?.pluralName || `${data.category} Cards`, 
          url: `/buy/${vertical?.slug || data.category}-cards` 
        });
      }
      breadcrumbs.push({ name: data.entityName, url: '' });
      break;
      
    case 'category':
      breadcrumbs.push({ name: 'Marketplace', url: '/markets' });
      breadcrumbs.push({ name: data.entityName, url: '' });
      break;
      
    case 'collection':
      breadcrumbs.push({ name: 'Marketplace', url: '/markets' });
      breadcrumbs.push({ name: 'Deals', url: '/deals' });
      breadcrumbs.push({ name: data.entityName, url: '' });
      break;
      
    case 'guide':
    case 'comparison':
    case 'faq':
      breadcrumbs.push({ name: 'Research', url: '/ai' });
      if (data.subcategory) {
        breadcrumbs.push({ name: data.subcategory, url: `/ai/${data.subcategory.toLowerCase().replace(/\s+/g, '-')}` });
      }
      breadcrumbs.push({ name: data.entityName, url: '' });
      break;
      
    case 'article':
      breadcrumbs.push({ name: 'Blog', url: '/insights' });
      breadcrumbs.push({ name: data.entityName, url: '' });
      break;
      
    default:
      breadcrumbs.push({ name: data.entityName, url: '' });
  }
  
  return breadcrumbs;
}

// ============= Related Links Generation =============
export function generateRelatedLinks(
  data: SEOPageData,
  maxLinks: number = 6
): InternalLink[] {
  const links: InternalLink[] = [];
  
  // Get sibling categories
  if (data.category && (data.intent === 'product' || data.intent === 'category')) {
    const siblingCategories = Object.values(VERTICAL_CONFIG)
      .filter(v => v.dbKey !== data.category)
      .slice(0, 4)
      .map(v => ({
        anchor: v.pluralName,
        url: `/buy/${v.slug}-cards`,
        relevance: 0.7,
        type: 'sibling' as const,
      }));
    links.push(...siblingCategories);
  }
  
  // Add hub links based on intent
  switch (data.intent) {
    case 'product':
    case 'category':
    case 'collection':
      // Link to grading hub
      links.push({
        anchor: 'Card Grading Services',
        url: '/grading',
        relevance: 0.6,
        type: 'hub',
      });
      break;
      
    case 'guide':
    case 'comparison':
    case 'faq':
      // Link to marketplace
      links.push({
        anchor: 'Browse Marketplace',
        url: '/markets',
        relevance: 0.5,
        type: 'hub',
      });
      // Link to grading
      links.push({
        anchor: 'Start Grading',
        url: '/grading',
        relevance: 0.6,
        type: 'hub',
      });
      break;
  }
  
  // Sort by relevance and limit
  return links
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxLinks);
}

// ============= Get Hub for Page =============
export function getHubForPage(data: SEOPageData): LinkCluster | null {
  switch (data.intent) {
    case 'product':
    case 'category':
    case 'collection':
      return CONTENT_HUBS.marketplace;
    case 'guide':
    case 'comparison':
    case 'faq':
      return CONTENT_HUBS.research;
    default:
      return null;
  }
}

// ============= Get Spoke Links for Hub =============
export function getSpokesForHub(hubKey: string): InternalLink[] {
  return CONTENT_HUBS[hubKey]?.spokes || [];
}

// ============= Get Related Collections =============
export function getRelatedCollections(
  currentSlug: string,
  maxItems: number = 6
): RelatedEntity[] {
  const collections: RelatedEntity[] = [
    { name: 'Pokemon Cards Under $10', url: '/deals/pokemon-cards-under-10', type: 'collection' },
    { name: 'Pokemon Cards Under $50', url: '/deals/pokemon-cards-under-50', type: 'collection' },
    { name: 'PSA 10 Pokemon Cards', url: '/deals/psa-10-pokemon-cards', type: 'collection' },
    { name: 'PSA 10 Baseball Cards', url: '/deals/psa-10-baseball-cards', type: 'collection' },
    { name: 'Vintage Pokemon Cards', url: '/deals/vintage-pokemon-cards', type: 'collection' },
    { name: 'Japanese Pokemon Cards', url: '/deals/japanese-pokemon-cards', type: 'collection' },
    { name: 'Charizard Cards', url: '/deals/charizard-cards', type: 'collection' },
    { name: 'One Piece Cards Under $20', url: '/deals/one-piece-cards-under-20', type: 'collection' },
    { name: 'MTG Commander Cards', url: '/deals/mtg-commander-cards', type: 'collection' },
  ];
  
  return collections
    .filter(c => !c.url.includes(currentSlug))
    .slice(0, maxItems);
}

// ============= Category Cross-Links =============
export function getCategoryCrossLinks(
  currentCategory: string,
  maxItems: number = 5
): RelatedEntity[] {
  return Object.values(VERTICAL_CONFIG)
    .filter(v => v.dbKey !== currentCategory && v.dbKey !== URL_TO_DB_CATEGORY[currentCategory])
    .slice(0, maxItems)
    .map(v => ({
      name: v.pluralName,
      url: `/buy/${v.slug}-cards`,
      type: 'category' as const,
    }));
}

// ============= Canonical URL Generation =============
export function generateCanonicalUrl(path: string): string {
  // Remove trailing slashes
  const cleanPath = path.replace(/\/+$/, '').replace(/^\/+/, '/');
  return `${SITE_CONFIG.url}${cleanPath}`;
}

// ============= Should Noindex Check =============
export function shouldNoIndex(path: string, searchParams?: URLSearchParams): boolean {
  const NOINDEX_PATHS = [
    '/auth', '/wallet', '/vault', '/sell', '/profile',
    '/messages', '/trades', '/portfolio', '/admin',
    '/order-success', '/grading/new', '/grading/orders',
  ];
  
  const NOINDEX_PARAMS = ['sort', 'order', 'filter', 'min_price', 'max_price', 'condition', 'grade', 'page'];
  
  // Check path-based noindex
  if (NOINDEX_PATHS.some(p => path.startsWith(p))) {
    return true;
  }
  
  // Check param-based noindex
  if (searchParams) {
    for (const param of NOINDEX_PARAMS) {
      const value = searchParams.get(param);
      if (param === 'page' && value && parseInt(value) > 1) {
        return true;
      }
      if (param !== 'page' && value) {
        return true;
      }
    }
  }
  
  return false;
}
