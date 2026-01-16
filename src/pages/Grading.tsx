import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Award, Clock, Shield, ChevronRight, Zap, CheckCircle, ArrowRight, Camera, CreditCard, BarChart3, Sparkles, Target, Eye, Layers, Star, TrendingUp, Users, FileCheck, Lock, Cpu, Globe, Fingerprint, History, QrCode, Link, Package, DollarSign, Percent } from 'lucide-react';
import { GRADING_PRICE_USD } from '@/hooks/useGrading';
import { Collectible } from '@/types/collectible';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Grading() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Auth-aware navigation to grading flow
  const handleStartGrading = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.info("Please sign in to grade your cards");
      navigate('/auth?returnTo=/grading/new');
      return;
    }
    navigate('/grading/new');
  }, [navigate]);

  const stats = [
    { value: '50K+', label: 'Cards Graded', icon: FileCheck },
    { value: '99.2%', label: 'Accuracy Rate', icon: Target },
    { value: '<24h', label: 'Turnaround', icon: Clock },
    { value: '4.9★', label: 'User Rating', icon: Star },
  ];

  const steps = [
    { 
      icon: Camera, 
      title: 'Upload Photos', 
      description: 'Snap clear photos of front and back of your card',
      color: 'from-blue-500/20 to-blue-600/5',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500'
    },
    { 
      icon: CreditCard, 
      title: 'Quick Payment', 
      description: `Just $${GRADING_PRICE_USD} per card - no hidden fees`,
      color: 'from-emerald-500/20 to-emerald-600/5',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500'
    },
    { 
      icon: BarChart3, 
      title: 'Get Results', 
      description: 'Receive detailed grade breakdown within 24 hours',
      color: 'from-purple-500/20 to-purple-600/5',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-500'
    },
  ];

  const features = [
    { icon: Cpu, label: 'AI-Powered Analysis', description: 'Advanced neural networks trained on millions of graded cards' },
    { icon: Eye, label: 'Subgrade Breakdown', description: 'Corners, edges, surface, and centering scores' },
    { icon: Clock, label: 'Lightning Fast', description: 'Results delivered in under 24 hours guaranteed' },
    { icon: Shield, label: 'Bank-Level Security', description: 'Your images are encrypted and never shared' },
    { icon: TrendingUp, label: 'Market Insights', description: 'See estimated value based on grade' },
    { icon: Globe, label: 'All Major TCGs', description: 'Pokémon, MTG, Yu-Gi-Oh!, Sports & more' },
  ];

  const certificationSteps = [
    { icon: Camera, label: 'AI Analysis', description: 'High-resolution scanning with neural network evaluation' },
    { icon: Package, label: 'Packaging', description: 'Premium archival-quality protective holder' },
    { icon: Layers, label: 'Welding', description: 'Ultrasonic sealing for tamper-proof encapsulation' },
    { icon: Award, label: 'Label Certification', description: 'Holographic security label with unique QR code' },
  ];

  const pricingTiers = [
    { name: 'Standard', price: 15, days: '20-25', description: 'Best value for non-urgent grading', popular: false },
    { name: 'Express', price: 25, days: '7-10', description: 'Faster turnaround when time matters', popular: true },
    { name: 'Priority', price: 50, days: '2-3', description: 'Rush service for urgent submissions', popular: false },
  ];

  const addOns = [
    { name: 'Autograph Verification', price: 8, description: 'For signed cards' },
    { name: 'Oversized Cards', price: 5, description: 'Jumbo, box topper, etc.' },
    { name: 'Relabel/Recase', price: 10, description: 'New holder, same grade' },
  ];

  const testimonials = [
    { name: 'Alex M.', avatar: 'A', text: 'Got my results in 6 hours. The AI nailed the grade - exactly matched PSA later!', rating: 5 },
    { name: 'Sarah K.', avatar: 'S', text: 'Perfect for checking cards before sending to PSA. Saved me hundreds in submission fees.', rating: 5 },
    { name: 'Mike R.', avatar: 'M', text: 'The subgrade breakdown helped me understand exactly why my card wasn\'t a 10.', rating: 5 },
  ];

  const categories = [
    { name: 'Pokémon', image: '🔥', count: '25K+ graded' },
    { name: 'Magic: The Gathering', image: '⚡', count: '12K+ graded' },
    { name: 'Yu-Gi-Oh!', image: '🌟', count: '8K+ graded' },
    { name: 'Sports Cards', image: '🏀', count: '5K+ graded' },
  ];

  const seoContent = {
    en: {
      title: "AI Card Grading | TCG Card Grading Service | CardBoom Grading Index",
      description: "Professional AI-powered TCG card grading in 24 hours. Grade Pokémon, MTG, Yu-Gi-Oh!, One Piece & sports cards. Get accurate grades for corners, edges, surface & centering. PSA alternative with instant results.",
      keywords: "card grading, TCG card grading, AI card grading, Pokemon card grading, MTG grading, Yu-Gi-Oh grading, sports card grading, PSA alternative, BGS alternative, CGC alternative, card authentication, trading card grading, collectible card grading, professional card grading, online card grading, instant card grading, card condition check, grading service",
    },
    tr: {
      title: "Kart Derecelendirme | TCG Kart Notlama | CardBoom Grading Index",
      description: "Profesyonel AI destekli TCG kart derecelendirme 24 saat içinde. Pokémon, MTG, Yu-Gi-Oh!, One Piece ve spor kartlarını notlatın. Köşeler, kenarlar, yüzey ve merkezleme için doğru notlar alın.",
      keywords: "kart derecelendirme, kart notlama, AI kart değerlendirme, Pokemon kart notlama, MTG notlama, Yu-Gi-Oh notlama, koleksiyon kartı notlama, profesyonel kart derecelendirme, online kart notlama, kart durumu kontrolü",
    },
    de: {
      title: "Kartengrading | TCG Kartenbewertung | CardBoom Grading Index",
      description: "Professionelles KI-gestütztes TCG-Kartengrading in 24 Stunden. Pokémon, MTG, Yu-Gi-Oh!, One Piece & Sportkarten bewerten. Genaue Noten für Ecken, Kanten, Oberfläche & Zentrierung.",
      keywords: "Kartengrading, TCG Kartenbewertung, KI Kartengrading, Pokemon Kartenbewertung, MTG Grading, Yu-Gi-Oh Grading, Sammelkartenbewertung, professionelles Kartengrading",
    },
    fr: {
      title: "Notation de Cartes | Service de Grading TCG | CardBoom Grading Index",
      description: "Notation professionnelle de cartes TCG par IA en 24 heures. Notez vos cartes Pokémon, MTG, Yu-Gi-Oh!, One Piece et sports. Notes précises pour coins, bords, surface et centrage.",
      keywords: "notation cartes, grading cartes TCG, notation IA cartes, notation cartes Pokemon, notation MTG, notation Yu-Gi-Oh, évaluation cartes collection, service notation cartes",
    },
    it: {
      title: "Valutazione Carte | Servizio Grading TCG | CardBoom Grading Index",
      description: "Valutazione professionale di carte TCG con IA in 24 ore. Valuta Pokémon, MTG, Yu-Gi-Oh!, One Piece e carte sportive. Voti precisi per angoli, bordi, superficie e centratura.",
      keywords: "valutazione carte, grading carte TCG, valutazione IA carte, valutazione carte Pokemon, grading MTG, grading Yu-Gi-Oh, valutazione carte collezionabili, servizio valutazione carte",
    },
    ar: {
      title: "تصنيف البطاقات | خدمة تقييم بطاقات TCG | CardBoom",
      description: "تصنيف احترافي لبطاقات TCG بالذكاء الاصطناعي خلال 24 ساعة. قيّم بطاقات بوكيمون وMTG ويوغي يو وOne Piece والرياضة.",
      keywords: "تصنيف البطاقات, تقييم بطاقات TCG, تصنيف بطاقات بوكيمون, تقييم البطاقات الجماعية",
    },
    ja: {
      title: "カードグレーディング | TCGカード鑑定 | CardBoom Grading Index",
      description: "24時間以内のプロフェッショナルAIカードグレーディング。ポケモン、MTG、遊戯王、ワンピース、スポーツカードを鑑定。角、エッジ、表面、センタリングの正確な評価。",
      keywords: "カードグレーディング, TCGカード鑑定, AIカード評価, ポケモンカード鑑定, MTGグレーディング, 遊戯王グレーディング, トレカ鑑定, PSA代替",
    },
    ko: {
      title: "카드 그레이딩 | TCG 카드 감정 | CardBoom Grading Index",
      description: "24시간 이내 전문 AI 카드 그레이딩. 포켓몬, MTG, 유희왕, 원피스, 스포츠 카드 감정. 코너, 엣지, 표면, 센터링 정확한 등급.",
      keywords: "카드 그레이딩, TCG 카드 감정, AI 카드 평가, 포켓몬 카드 감정, MTG 그레이딩, 유희왕 그레이딩, 트레이딩 카드 감정",
    },
  };

  const currentLang = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('lang')) || 'en';
  const seo = seoContent[currentLang as keyof typeof seoContent] || seoContent.en;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "CardBoom AI Card Grading",
    "alternateName": ["CardBoom Grading Index", "AI Card Grading", "TCG Card Grading"],
    "description": seo.description,
    "url": "https://cardboom.com/grading",
    "provider": {
      "@type": "Organization",
      "name": "CardBoom",
      "url": "https://cardboom.com",
      "logo": "https://cardboom.com/cardboom-logo.png"
    },
    "serviceType": "Card Grading Service",
    "areaServed": "Worldwide",
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Card Grading Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "AI Card Grading",
            "description": "Professional AI-powered card grading with subgrades"
          },
          "price": GRADING_PRICE_USD,
          "priceCurrency": "USD"
        }
      ]
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "5234",
      "bestRating": "5"
    }
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does AI card grading work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our AI analyzes high-resolution photos of your card's front and back, evaluating corners, edges, surface condition, and centering using advanced machine learning trained on millions of graded cards."
        }
      },
      {
        "@type": "Question",
        "name": "How long does card grading take?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "AI grading results are delivered within 24 hours, compared to weeks or months with traditional grading services like PSA or BGS."
        }
      },
      {
        "@type": "Question",
        "name": "What types of cards can be graded?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We grade all major TCG cards including Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece, Lorcana, and sports cards like NBA, NFL, and baseball."
        }
      },
      {
        "@type": "Question",
        "name": "Is AI grading as accurate as PSA grading?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our AI grading has a 99.2% accuracy rate when compared to professional grading services. It provides detailed subgrades for corners, edges, surface, and centering."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords} />
        <link rel="canonical" href="https://cardboom.com/grading" />
        
        {/* Open Graph */}
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://cardboom.com/grading" />
        <meta property="og:image" content="https://cardboom.com/og-grading.jpg" />
        <meta property="og:site_name" content="CardBoom" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        
        {/* Robots */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        
        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        <script type="application/ld+json">{JSON.stringify(faqStructuredData)}</script>
      </Helmet>
      
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      <CartDrawer 
        items={cartItems} 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        onRemoveItem={(id) => setCartItems(items => items.filter(item => item.id !== id))}
      />
      
      <main className="pt-2 md:pt-6">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.05),transparent_40%)]" />
          
          <div className="container mx-auto px-4 py-6 md:py-16 lg:py-20 relative">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                {/* Left Content */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-center lg:text-left"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 md:mb-6 bg-primary/10 rounded-full text-xs md:text-sm font-semibold text-primary border border-primary/20">
                    <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                    CardBoom Grading Index
                  </div>
                  
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 md:mb-6 leading-[1.1]">
                    Know Your Card's
                    <span className="block text-primary">True Value</span>
                  </h1>
                  
                  <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
                    Professional AI-powered grading in under 24 hours. Get detailed subgrades for corners, edges, surface, and centering — all for just ${GRADING_PRICE_USD}.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8 justify-center lg:justify-start">
                    <Button 
                      size="lg" 
                      className="h-12 md:h-14 px-6 md:px-8 text-base md:text-lg font-bold rounded-xl gap-2 shadow-lg shadow-primary/25"
                      onClick={handleStartGrading}
                    >
                      Grade Your Card
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                    </Button>
                    
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="h-12 md:h-14 px-6 md:px-8 text-base md:text-lg font-semibold rounded-xl"
                      onClick={() => navigate('/grading/orders')}
                    >
                      View My Orders
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 md:gap-6 text-xs md:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                      <span>No subscription</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                      <span>Pay per card</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                      <span>Results in 24h</span>
                    </div>
                  </div>
                </motion.div>

                {/* Right - Sample Grade Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="relative hidden md:block"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 rounded-3xl blur-3xl" />
                  
                  <div className="relative bg-card rounded-2xl md:rounded-3xl p-6 md:p-8 border border-border shadow-2xl">
                    <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 px-3 md:px-4 py-1 md:py-1.5 bg-primary text-primary-foreground text-xs md:text-sm font-bold rounded-full shadow-lg">
                      Sample Result
                    </div>
                    
                    {/* Grade Circle */}
                    <div className="text-center py-6 md:py-8">
                      <motion.div 
                        className="inline-flex items-center justify-center w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-2xl shadow-emerald-500/30"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                      >
                        <div className="text-center">
                          <div className="text-4xl md:text-5xl font-black">9.5</div>
                          <div className="text-[10px] md:text-xs uppercase tracking-widest opacity-90 font-semibold">Gem Mint</div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Subgrades */}
                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                      {[
                        { label: 'Corners', value: 9.5, color: 'bg-emerald-500' },
                        { label: 'Edges', value: 10, color: 'bg-emerald-500' },
                        { label: 'Surface', value: 9, color: 'bg-yellow-500' },
                        { label: 'Centering', value: 9.5, color: 'bg-emerald-500' },
                      ].map((item, i) => (
                        <motion.div 
                          key={item.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
                          className="flex items-center justify-between p-2.5 md:p-4 bg-muted/50 rounded-lg md:rounded-xl border border-border/50"
                        >
                          <span className="text-xs md:text-sm font-medium text-muted-foreground">{item.label}</span>
                          <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-md md:rounded-lg text-xs md:text-sm font-bold text-white ${item.color}`}>
                            {item.value}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border/50 text-center">
                      <p className="text-xs md:text-sm text-muted-foreground">Estimated Market Value</p>
                      <p className="text-xl md:text-2xl font-bold text-foreground">$245 - $320</p>
                    </div>
                  </div>
                </motion.div>

                {/* Mobile Sample Card - Compact */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="md:hidden bg-card rounded-2xl p-4 border border-border shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shrink-0">
                      <div className="text-center">
                        <div className="text-2xl font-black">9.5</div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Sample Grade Result</p>
                      <p className="font-bold">Gem Mint Condition</p>
                      <div className="flex gap-2 mt-1 text-xs">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-600 rounded">Corners 9.5</span>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-600 rounded">Edges 10</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="py-4 md:py-8 border-y border-border/50 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex items-center gap-2 md:gap-4"
                >
                  <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-primary/10">
                    <stat.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-lg md:text-2xl font-black text-foreground">{stat.value}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 md:py-20 lg:py-28">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 md:mb-16"
            >
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mb-2 md:mb-4">How It Works</h2>
              <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Get your card graded in three simple steps.
              </p>
            </motion.div>
            
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                {steps.map((step, i) => (
                  <motion.div 
                    key={step.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.15 }}
                    className="relative group"
                  >
                    <div className={`relative p-5 md:p-8 rounded-xl md:rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/30`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                          <span className="text-2xl md:text-4xl font-black text-muted-foreground/30">{i + 1}</span>
                          <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${step.iconBg}`}>
                            <step.icon className={`w-5 h-5 md:w-6 md:h-6 ${step.iconColor}`} />
                          </div>
                        </div>
                        <h3 className="text-base md:text-xl font-bold mb-1 md:mb-2">{step.title}</h3>
                        <p className="text-sm md:text-base text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    
                    {i < steps.length - 1 && (
                      <ChevronRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground/30" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Supported Categories */}
        <section className="py-10 md:py-16 bg-muted/30 border-y border-border/50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 md:mb-12"
            >
              <h2 className="text-xl md:text-2xl lg:text-3xl font-black mb-2 md:mb-3">Supported Card Types</h2>
              <p className="text-sm md:text-base text-muted-foreground">All major TCGs and sports cards</p>
            </motion.div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto">
              {categories.map((cat, i) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-card border border-border text-center hover:border-primary/50 transition-colors cursor-pointer group"
                >
                  <div className="text-2xl md:text-4xl mb-2 md:mb-3">{cat.image}</div>
                  <div className="font-bold text-xs md:text-sm mb-0.5 md:mb-1">{cat.name}</div>
                  <div className="text-[10px] md:text-xs text-muted-foreground">{cat.count}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-12 md:py-20 lg:py-28">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 md:mb-16"
            >
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mb-2 md:mb-4">Why Choose CardBoom</h2>
              <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Industry-leading AI accuracy
              </p>
            </motion.div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 max-w-5xl mx-auto">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-lg group"
                >
                  <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-primary/10 w-fit mb-2 md:mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm md:text-lg mb-1 md:mb-2">{feature.label}</h3>
                  <p className="text-muted-foreground text-xs md:text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Card Passport Section */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-premium/5" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-premium/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12 md:mb-16"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-premium/10 text-premium mb-4">
                <Fingerprint className="w-4 h-4" />
                <span className="text-sm font-semibold">Digital Certificate</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
                CardBoom <span className="text-gradient bg-gradient-to-r from-primary to-premium bg-clip-text text-transparent">Card Passport</span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Every card graded or sold through CardBoom receives a unique digital passport — 
                an immutable record that travels with the card forever.
              </p>
            </motion.div>

            {/* Passport Visual */}
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                {/* Left - Passport Preview */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div className="relative p-6 md:p-8 rounded-2xl md:rounded-3xl bg-gradient-to-br from-card via-card to-muted border border-border shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-premium flex items-center justify-center">
                          <Fingerprint className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">Card Passport</h4>
                          <p className="text-xs text-muted-foreground">CB-2025-XXXX-XXXX</p>
                        </div>
                      </div>
                      <QrCode className="w-16 h-16 text-muted-foreground/30" />
                    </div>

                    {/* Card Preview */}
                    <div className="flex gap-4 mb-6">
                      <div className="w-24 h-32 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-4xl shadow-lg">
                        🔥
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold mb-1">Charizard VMAX</h5>
                        <p className="text-sm text-muted-foreground mb-2">Pokémon • 2021 • Shining Fates</p>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-md">
                            CBGI 9.5
                          </span>
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">
                            Verified Authentic
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-3 border-t border-border pt-4">
                      <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ownership History</h6>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div className="flex-1 text-sm">
                          <span className="font-medium">Graded by CardBoom</span>
                          <span className="text-muted-foreground ml-2">Jan 2025</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div className="flex-1 text-sm">
                          <span className="font-medium">Sold on CardBoom</span>
                          <span className="text-muted-foreground ml-2">Jan 2025</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                        <div className="flex-1 text-sm text-muted-foreground">
                          Future transactions logged here...
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
                  <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-tr from-premium/20 to-transparent rounded-full blur-2xl" />
                </motion.div>

                {/* Right - Features */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    {[
                      {
                        icon: Fingerprint,
                        title: 'Unique CardBoom ID',
                        description: 'Every card gets a permanent, unforgeable digital identity that can be verified anytime.',
                        color: 'text-primary bg-primary/10'
                      },
                      {
                        icon: Camera,
                        title: 'High-Resolution Images',
                        description: 'Original grading photos preserved forever — front, back, and detail shots.',
                        color: 'text-blue-500 bg-blue-500/10'
                      },
                      {
                        icon: History,
                        title: 'Complete Grade History',
                        description: 'Every grading event recorded — initial grade, regrades, and professional submissions.',
                        color: 'text-emerald-500 bg-emerald-500/10'
                      },
                      {
                        icon: Link,
                        title: 'Ownership Trail',
                        description: 'Track every sale and transfer through CardBoom\'s ecosystem.',
                        color: 'text-purple-500 bg-purple-500/10'
                      },
                      {
                        icon: Shield,
                        title: 'Tamper-Proof Record',
                        description: 'Immutable digital certificate that travels with the card — even if it resells.',
                        color: 'text-amber-500 bg-amber-500/10'
                      },
                    ].map((feature, i) => (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex gap-4 p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className={`p-2.5 rounded-lg ${feature.color} flex-shrink-0`}>
                          <feature.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-semibold mb-1">{feature.title}</h5>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-premium/10 border border-primary/20">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Coming Soon:</span> Scan any CardBoom-verified card's 
                      QR code to instantly view its complete passport history.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-16 bg-muted/30 border-y border-border/50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 md:mb-12"
            >
              <h2 className="text-xl md:text-2xl lg:text-3xl font-black mb-2 md:mb-3">What Collectors Say</h2>
              <p className="text-sm md:text-base text-muted-foreground">Join thousands of satisfied users</p>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
              {testimonials.map((testimonial, i) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-card border border-border"
                >
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm md:text-base">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-sm md:text-base">{testimonial.name}</div>
                      <div className="flex text-yellow-500">
                        {[...Array(testimonial.rating)].map((_, j) => (
                          <Star key={j} className="w-2.5 h-2.5 md:w-3 md:h-3 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">"{testimonial.text}"</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Certification Process Section */}
        <section className="py-12 md:py-20 lg:py-28 bg-muted/20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 md:mb-16"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 bg-primary/10 rounded-full text-xs md:text-sm font-semibold text-primary border border-primary/20">
                <Award className="w-3 h-3 md:w-4 md:h-4" />
                Professional Certification
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mb-2 md:mb-4">How We Certify Your Cards</h2>
              <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Industry-standard packaging, ultrasonic welding, and tamper-proof label certification
              </p>
            </motion.div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 max-w-5xl mx-auto mb-12">
              {certificationSteps.map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="relative p-4 md:p-6 rounded-xl md:rounded-2xl bg-card border border-border text-center group hover:border-primary/30 transition-all hover:shadow-lg"
                >
                  <div className="absolute -top-2 -left-2 md:-top-3 md:-left-3 w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs md:text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-primary/10 w-fit mx-auto mb-3 md:mb-4 group-hover:bg-primary/20 transition-colors">
                    <step.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm md:text-lg mb-1 md:mb-2">{step.label}</h3>
                  <p className="text-muted-foreground text-xs md:text-sm">{step.description}</p>
                </motion.div>
              ))}
            </div>

            {/* No Minimums / No Value Upcharges Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto p-4 md:p-6 rounded-xl md:rounded-2xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20"
            >
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm md:text-base">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold">No Minimum Card Requirements</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold">No Upcharges Based on Card Value</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold">Half-Point Grading Scale</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pricing Tiers Section */}
        <section className="py-12 md:py-20 lg:py-28">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 md:mb-16"
            >
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mb-2 md:mb-4">Pricing & Turnaround Times</h2>
              <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose the speed that fits your needs. Batch discounts available for 3+ cards.
              </p>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto mb-8">
              {pricingTiers.map((tier, i) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className={`relative p-5 md:p-8 rounded-xl md:rounded-2xl border ${
                    tier.popular 
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' 
                      : 'border-border bg-card'
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                      Most Popular
                    </div>
                  )}
                  <div className="text-center mb-4 md:mb-6">
                    <h3 className="text-lg md:text-xl font-bold mb-1">{tier.name}</h3>
                    <div className="text-3xl md:text-4xl font-black text-primary mb-1">
                      ${tier.price}<span className="text-sm md:text-base font-normal text-muted-foreground">/card</span>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">{tier.days} business days</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mb-4">{tier.description}</p>
                  <Button 
                    className={`w-full ${tier.popular ? '' : 'variant-outline'}`}
                    variant={tier.popular ? 'default' : 'outline'}
                    onClick={handleStartGrading}
                  >
                    Select {tier.name}
                  </Button>
                </motion.div>
              ))}
            </div>

            {/* Add-ons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto"
            >
              <h3 className="text-lg font-bold mb-4 text-center">Optional Add-ons</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {addOns.map((addon) => (
                  <div key={addon.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div>
                      <p className="font-medium text-sm">{addon.name}</p>
                      <p className="text-xs text-muted-foreground">{addon.description}</p>
                    </div>
                    <span className="font-bold text-primary">+${addon.price}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Batch Discount Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto mt-8 p-4 md:p-6 rounded-xl bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Percent className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Batch Discounts & Vault Storage</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Save up to 35% on bulk submissions. Store unused credits in your vault for future use.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-background border">3+ cards: 10% off</span>
                    <span className="px-2 py-1 rounded-full bg-background border">5+ cards: 15% off</span>
                    <span className="px-2 py-1 rounded-full bg-background border">10+ cards: 25% off</span>
                    <span className="px-2 py-1 rounded-full bg-background border">25+ cards: 35% off</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12 md:py-20 bg-muted/30 border-t border-border/50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto"
            >
              <div className="relative rounded-2xl md:rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
                
                <div className="relative p-6 md:p-10 lg:p-16 text-center">
                  <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 mb-4 md:mb-6 bg-white/10 rounded-full text-xs md:text-sm font-semibold text-primary-foreground">
                    <Zap className="w-3 h-3 md:w-4 md:h-4" />
                    Get Started Today
                  </div>
                  
                  <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-primary-foreground mb-2 md:mb-4">
                    Starting at ${GRADING_PRICE_USD}/card
                  </h2>
                  <p className="text-sm md:text-lg text-primary-foreground/80 mb-6 md:mb-8 max-w-md mx-auto">
                    Professional certification with packaging, welding & holographic labels included.
                  </p>
                  
                  <Button 
                    size="lg" 
                    variant="secondary"
                    className="h-12 md:h-14 px-6 md:px-10 text-base md:text-lg font-bold rounded-xl gap-2"
                    onClick={handleStartGrading}
                  >
                    Start Grading Now
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                  
                  <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mt-6 md:mt-8 text-xs md:text-sm text-primary-foreground/70">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Lock className="w-3 h-3 md:w-4 md:h-4" />
                      <span>Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Clock className="w-3 h-3 md:w-4 md:h-4" />
                      <span>24h Guarantee</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Shield className="w-3 h-3 md:w-4 md:h-4" />
                      <span>Money Back</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Teaser */}
        <section className="py-10 md:py-16 border-t border-border/50">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">Have Questions?</h3>
            <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">Check out our FAQ or contact support</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/help')}>
              View Help Center
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}