import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '@/lib/seoUtils';

interface CardWarsSchemaProps {
  activeBattleCount?: number;
  totalPrizePool?: number;
}

/**
 * SEO/AEO Schema for Card Wars / TCG Card Battles
 * Optimizes for: "TCG card battles", "trading card competitions", "card voting games"
 */
export const CardWarsSchema = ({ 
  activeBattleCount = 0, 
  totalPrizePool = 100 
}: CardWarsSchemaProps) => {
  const canonicalUrl = `${SITE_URL}/card-wars`;
  
  // Structured data for the Card Wars game/competition
  const gameSchema = {
    '@context': 'https://schema.org',
    '@type': 'Game',
    name: 'Card Wars Arena - TCG Card Battles',
    description: 'Vote on epic trading card battles and compete for prizes. Daily TCG card competitions featuring Pokémon, MTG, Yu-Gi-Oh!, One Piece, and sports cards.',
    url: canonicalUrl,
    genre: ['Trading Card Game', 'Voting Competition', 'Card Battles'],
    gamePlatform: 'Web',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free to vote, Pro members compete for prize pools',
    },
    provider: {
      '@type': 'Organization',
      name: 'CardBoom',
      url: SITE_URL,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '2450',
      bestRating: '5',
      worstRating: '1',
    },
  };

  // FAQ Schema for AEO (Answer Engine Optimization)
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Card Wars on CardBoom?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Card Wars is a daily TCG card battle competition where users vote on head-to-head matchups between iconic trading cards. Pro members can stake points and share prize pools when their chosen card wins.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I participate in TCG card battles?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Simply create a free CardBoom account and vote for your favorite card in each daily battle. Pro subscribers receive $2.50 in monthly gems to stake in battles and compete for cash prizes.',
        },
      },
      {
        '@type': 'Question',
        name: 'What trading cards are featured in Card Wars battles?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Card Wars features battles between cards from Pokémon, Magic: The Gathering (MTG), Yu-Gi-Oh!, One Piece TCG, Lorcana, Digimon, Dragon Ball, NBA, and NFL sports cards.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do Card Wars prize pools work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Pro members stake CardBoom Gems in each battle. When the battle ends, all gems staked on the winning card are split proportionally among the winners based on their contribution to the winning pool.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is Card Wars free to play?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! Voting in Card Wars is completely free for all registered users. Pro members ($9.99/month) receive $2.50 in free monthly gems to compete for prize pools and enjoy additional benefits.',
        },
      },
    ],
  };

  // Event schema for active battles
  const eventSchema = activeBattleCount > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: `Card Wars: ${activeBattleCount} Active TCG Card Battles`,
    description: `${activeBattleCount} live trading card battles with $${totalPrizePool} in total prize pools. Vote now on CardBoom!`,
    url: canonicalUrl,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url: canonicalUrl,
    },
    organizer: {
      '@type': 'Organization',
      name: 'CardBoom',
      url: SITE_URL,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      validFrom: new Date().toISOString(),
    },
  } : null;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>Card Wars Arena | TCG Card Battles & Voting Competitions | CardBoom</title>
      <meta 
        name="description" 
        content="Vote on epic TCG card battles daily! Compete in Pokémon, MTG, Yu-Gi-Oh!, One Piece card matchups. Pro members win cash prizes from shared prize pools. Free to play!" 
      />
      <meta 
        name="keywords" 
        content="TCG card battles, trading card competition, card wars, pokemon card battles, mtg card duels, yugioh battles, card voting game, TCG competitions, trading card games, card battle arena" 
      />
      
      {/* Canonical */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content="Card Wars Arena - Daily TCG Card Battles | CardBoom" />
      <meta 
        property="og:description" 
        content="Vote on epic trading card battles. Pokémon vs MTG, Yu-Gi-Oh! showdowns, sports card matchups. Pro members compete for real prizes!" 
      />
      <meta property="og:image" content={`${SITE_URL}/og-card-wars.png`} />
      <meta property="og:site_name" content="CardBoom" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Card Wars Arena - TCG Card Battles" />
      <meta 
        name="twitter:description" 
        content="Daily trading card battles with real prizes. Vote for your champion!" 
      />
      <meta name="twitter:image" content={`${SITE_URL}/og-card-wars.png`} />
      
      {/* Robots */}
      <meta name="robots" content="index, follow, max-image-preview:large" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(gameSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
      {eventSchema && (
        <script type="application/ld+json">
          {JSON.stringify(eventSchema)}
        </script>
      )}
    </Helmet>
  );
};

export default CardWarsSchema;
