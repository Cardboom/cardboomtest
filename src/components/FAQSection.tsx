import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

const faqItems = [
  {
    question: "What is CardBoom and how does it work?",
    answer: "CardBoom is the premier marketplace for trading cards and collectibles. We connect buyers and sellers in a secure, transparent platform with real-time pricing, authentication services, and escrow protection. Whether you're trading Pokémon cards, sports memorabilia, Yu-Gi-Oh!, or One Piece TCG, CardBoom provides the tools you need to buy, sell, and track your collection's value."
  },
  {
    question: "How does CardBoom protect against fake or counterfeit cards?",
    answer: "CardBoom employs multiple layers of authentication: 1) We accept PSA, BGS, and CGC graded cards which come pre-authenticated. 2) Our Verified Seller program requires identity verification and performance history. 3) Every transaction includes buyer protection - if a card is proven counterfeit, you receive a full refund. 4) Our AI-powered card scanner helps detect common fakes before listing. 5) High-value items can be stored in our secure Vault facility with professional authentication."
  },
  {
    question: "What are Fractional Shares and how can I invest in expensive cards?",
    answer: "Fractional Ownership lets you buy shares of high-value 'grail' cards you couldn't afford alone. For example, a $50,000 PSA 10 Charizard can be divided into 1,000 shares at $50 each. You own a percentage of the card, earn proportional returns when it sells, and can trade your shares on our secondary market. It's like stock trading, but for collectibles. Daily verification ensures the physical card remains secure in our Vault."
  },
  {
    question: "How does the CardBoom Leaderboard work?",
    answer: "Our Leaderboard ranks collectors and traders based on XP (experience points) earned through platform activity. You earn XP for purchases, sales, listings, referrals, daily logins, and reviews. Higher levels unlock exclusive rewards like fee discounts, early access to drops, and special badges. Monthly tournaments award cash prizes to top performers, and our Hall of Fame celebrates legendary collectors."
  },
  {
    question: "How do I deposit money and what payment methods are accepted?",
    answer: "CardBoom Wallet supports multiple funding methods: 1) Credit/Debit cards via our secure 3D Secure payment processor. 2) Bank wire transfer - use your unique transfer code in the description for instant matching. 3) Wallet balance from sales. All funds are held securely and can be withdrawn to your verified bank account (IBAN) within 1-3 business days. We support TRY, USD, and EUR currencies."
  },
  {
    question: "Is CardBoom a registered and legitimate company?",
    answer: "Yes, CardBoom operates as a fully registered company in compliance with local e-commerce regulations. We maintain transparent fee structures, secure payment processing through licensed payment providers, and follow GDPR/KVKK data protection standards. Our platform is built on enterprise-grade infrastructure with bank-level encryption for all transactions."
  },
  {
    question: "What gaming services does CardBoom offer?",
    answer: "CardBoom Gaming Hub offers in-game currency, boosting services, and coaching for popular games including Valorant, PUBG Mobile, League of Legends, and more. Purchase Valorant Points (VP), PUBG UC, or connect with verified coaches for rank boosting and skill improvement. All gaming transactions are protected by our buyer guarantee."
  },
  {
    question: "How does Valorant boosting work on CardBoom?",
    answer: "Our Valorant boosting service connects you with verified, high-rank players who can help improve your competitive rank. Choose between account boosting (they play on your account) or duo boosting (play together). All boosters are vetted, and we offer rank guarantees. Pricing varies by current rank and target rank. Your account credentials are encrypted and never stored."
  },
  {
    question: "What TCG categories does CardBoom support?",
    answer: "CardBoom supports all major Trading Card Games: Pokémon TCG (vintage and modern), Magic: The Gathering, Yu-Gi-Oh!, One Piece TCG, Disney Lorcana, Dragon Ball Super, and sports cards including NBA, NFL, MLB, and soccer. We also support designer collectibles like KAWS and Bearbrick figures. New categories are added based on community demand."
  },
  {
    question: "How does the Vault storage service work?",
    answer: "CardBoom Vault is our secure storage facility for high-value collectibles. When you purchase with 'Vault' delivery, items are professionally stored, insured, and can be instantly traded or sold without shipping delays. Vault items are verified, photographed, and tracked. You can request physical delivery anytime. Storage is free for the first 90 days, then $2/month per item."
  },
  {
    question: "What are the fees for buying and selling on CardBoom?",
    answer: "Buyers pay a 3% buyer protection fee on purchases. Sellers pay a 5% commission on successful sales. Verified Sellers get reduced rates (3% commission). Wire transfer deposits under $500 have a 2% processing fee. There are no listing fees - you only pay when you sell. Fractional share trades have a 1% transaction fee."
  },
  {
    question: "How does the referral program work?",
    answer: "Invite friends with your unique referral code and earn rewards! You receive 50 XP and $5 wallet credit for each friend who signs up and makes their first purchase. Your referrals also get $5 off their first order. Top referrers earn additional bonuses and can qualify for our Ambassador program with higher commission rates on referred trades."
  },
  {
    question: "Can I trade cards directly with other users?",
    answer: "Yes! CardBoom supports peer-to-peer trades. Propose a trade by selecting items from your portfolio and the items you want from another collector. Both parties verify with photos, and trades are protected by our escrow system. You can add cash adjustments to balance uneven trades. All trades earn XP and count toward your trading reputation."
  },
  {
    question: "How do price alerts and watchlists work?",
    answer: "Add any card to your Watchlist to track its price movements. Set custom price alerts to get notified when a card drops below your target price or when new listings appear. Our AI also sends market insights about trending cards and arbitrage opportunities. Push notifications are available on mobile for instant alerts."
  },
  {
    question: "What is the Social Proof Score shown on cards?",
    answer: "The Social Proof Score is a real-time popularity indicator combining views, watchlist additions, searches, and recent sales. Higher scores indicate strong market demand - useful for identifying cards that may increase in value. We display live viewer counts ('X people watching') to help you make informed decisions, similar to hotel booking sites."
  },
  {
    question: "How do I become a Verified Seller?",
    answer: "Verified Sellers enjoy lower fees, priority support, and a trust badge on their profile. To qualify: 1) Complete identity verification with government ID. 2) Maintain a 4.5+ star rating. 3) Complete 10+ successful sales. 4) Subscribe to our Verified Seller plan ($9.99/month). Verified Sellers can also create Fractional listings for high-value items."
  },
  {
    question: "Is my personal and payment information secure?",
    answer: "Absolutely. CardBoom uses bank-grade 256-bit SSL encryption for all data transmission. Payment processing is handled by PCI-DSS compliant providers. We never store full credit card numbers. Two-factor authentication is available for account security. Our platform undergoes regular security audits, and we comply with GDPR and KVKK privacy regulations."
  },
  {
    question: "What happens if there's a dispute with a seller?",
    answer: "CardBoom's buyer protection covers all purchases. If an item doesn't match the description, is counterfeit, or never arrives, open a dispute within 14 days of delivery. Our support team reviews evidence from both parties and issues refunds when appropriate. Sellers with repeated disputes face account restrictions. Resolution typically takes 3-5 business days."
  }
];

export const FAQSection = () => {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <HelpCircle className="w-4 h-4" />
            Frequently Asked Questions
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Know About CardBoom
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get answers to common questions about trading cards, collectibles, authentication, payments, and our gaming services.
          </p>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="space-y-3">
          {faqItems.map((item, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border border-border/50 rounded-xl px-6 bg-card/50 backdrop-blur-sm data-[state=open]:bg-card data-[state=open]:shadow-lg transition-all"
            >
              <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary py-5 [&[data-state=open]>svg]:rotate-180">
                <span className="pr-4">{item.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Still have questions? We're here to help.
          </p>
          <a 
            href="/help" 
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            Visit our Help Center
            <span aria-hidden="true">→</span>
          </a>
        </div>

        {/* SEO Schema Markup - JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqItems.map(item => ({
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": item.answer
                }
              }))
            })
          }}
        />
      </div>
    </section>
  );
};
