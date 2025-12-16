import { HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqItems = [
  {
    question: "What is the Launch Tournament?",
    answer: "The Launch Tournament is our inaugural monthly competition where sellers compete for ₺5,000 worth of trading cards. It's designed specifically for smaller sellers with monthly sales volume under ₺50,000."
  },
  {
    question: "Who can participate?",
    answer: "Any seller on CardBoom whose total monthly sales volume is ₺50,000 or less can participate. This ensures fair competition among similar-sized sellers."
  },
  {
    question: "What are the prizes?",
    answer: "1st Place: ₺2,500 worth of cards\n2nd Place: ₺1,500 worth of cards\n3rd Place: ₺1,000 worth of cards\n\nPrizes are awarded as trading cards from our inventory, chosen based on winner preference."
  },
  {
    question: "How do I claim my prize cards?",
    answer: "Winners have two options: 1) Have the cards sold through CardBoom and receive the proceeds, or 2) Hold the cards in our secure Vault for at least 1 month. This ensures commitment to the platform."
  },
  {
    question: "What counts towards my sales volume?",
    answer: "Only completed sales made through CardBoom count towards your tournament ranking. This includes cards sold via direct purchase, accepted offers, and auction wins."
  },
  {
    question: "When does the tournament reset?",
    answer: "The tournament runs on a monthly cycle. Rankings reset on the 1st of each month at midnight (UTC). Winners are announced within 3 business days after month end."
  },
  {
    question: "What happens if I exceed ₺50,000 in sales?",
    answer: "If your monthly sales exceed ₺50,000, you'll be automatically moved to the standard tournament tier (coming soon) with larger prizes and no volume cap."
  },
  {
    question: "Can I track my progress?",
    answer: "Yes! Your current ranking and sales volume are displayed on the leaderboard. You can also see how close you are to other participants."
  },
  {
    question: "What if there's a tie?",
    answer: "In case of a tie in sales volume, the seller who reached that volume first wins the higher position. Timestamps are recorded for all transactions."
  },
  {
    question: "Are there any fees deducted from prizes?",
    answer: "No! The prize values are what you receive. CardBoom covers any platform fees associated with prize card transfers."
  }
];

export const TournamentFAQ = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Tournament FAQ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground whitespace-pre-line">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Schema markup for SEO */}
        <script type="application/ld+json">
          {JSON.stringify({
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
          })}
        </script>
      </CardContent>
    </Card>
  );
};