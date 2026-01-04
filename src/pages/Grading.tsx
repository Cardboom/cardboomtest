import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Award, Clock, Shield, ChevronRight, Zap, CheckCircle, ArrowRight, Camera, CreditCard, BarChart3, Sparkles, Target, Eye, Layers, Star, TrendingUp, Users, FileCheck, Lock, Cpu, Globe } from 'lucide-react';
import { GRADING_PRICE_USD } from '@/hooks/useGrading';
import { Collectible } from '@/types/collectible';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

export default function Grading() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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
        
        {/* Hreflang for all languages */}
        <link rel="alternate" hrefLang="en" href="https://cardboom.com/grading" />
        <link rel="alternate" hrefLang="tr" href="https://cardboom.com/grading?lang=tr" />
        <link rel="alternate" hrefLang="de" href="https://cardboom.com/grading?lang=de" />
        <link rel="alternate" hrefLang="fr" href="https://cardboom.com/grading?lang=fr" />
        <link rel="alternate" hrefLang="it" href="https://cardboom.com/grading?lang=it" />
        <link rel="alternate" hrefLang="ar" href="https://cardboom.com/grading?lang=ar" />
        <link rel="alternate" hrefLang="ja" href="https://cardboom.com/grading?lang=ja" />
        <link rel="alternate" hrefLang="ko" href="https://cardboom.com/grading?lang=ko" />
        <link rel="alternate" hrefLang="x-default" href="https://cardboom.com/grading" />
        
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
      
      <main className="pt-4 md:pt-6">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.05),transparent_40%)]" />
          
          <div className="container mx-auto px-4 py-10 md:py-16 lg:py-20 relative">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                {/* Left Content */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-primary/10 rounded-full text-sm font-semibold text-primary border border-primary/20">
                    <Sparkles className="w-4 h-4" />
                    CardBoom Grading Index
                  </div>
                  
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
                    Know Your Card's
                    <span className="block text-primary">True Value</span>
                  </h1>
                  
                  <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                    Professional AI-powered grading in under 24 hours. Get detailed subgrades for corners, edges, surface, and centering — all for just ${GRADING_PRICE_USD}.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <Button 
                      size="lg" 
                      className="h-14 px-8 text-lg font-bold rounded-xl gap-2 shadow-lg shadow-primary/25"
                      onClick={() => navigate('/grading/new')}
                    >
                      Grade Your Card
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                    
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="h-14 px-8 text-lg font-semibold rounded-xl"
                      onClick={() => navigate('/grading/orders')}
                    >
                      View My Orders
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span>No subscription</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span>Pay per card</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span>Results in 24h</span>
                    </div>
                  </div>
                </motion.div>

                {/* Right - Sample Grade Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 rounded-3xl blur-3xl" />
                  
                  <div className="relative bg-card rounded-3xl p-8 border border-border shadow-2xl">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-bold rounded-full shadow-lg">
                      Sample Result
                    </div>
                    
                    {/* Grade Circle */}
                    <div className="text-center py-8">
                      <motion.div 
                        className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-2xl shadow-emerald-500/30"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                      >
                        <div className="text-center">
                          <div className="text-5xl font-black">9.5</div>
                          <div className="text-xs uppercase tracking-widest opacity-90 font-semibold">Gem Mint</div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Subgrades */}
                    <div className="grid grid-cols-2 gap-4">
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
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50"
                        >
                          <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                          <span className={`px-3 py-1 rounded-lg text-sm font-bold text-white ${item.color}`}>
                            {item.value}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-border/50 text-center">
                      <p className="text-sm text-muted-foreground">Estimated Market Value</p>
                      <p className="text-2xl font-bold text-foreground">$245 - $320</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="py-8 border-y border-border/50 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="p-3 rounded-xl bg-primary/10">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-black mb-4">How It Works</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get your card graded in three simple steps. No appointments, no shipping, no waiting weeks.
              </p>
            </motion.div>
            
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-3 gap-6">
                {steps.map((step, i) => (
                  <motion.div 
                    key={step.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.15 }}
                    className="relative group"
                  >
                    <div className={`relative p-8 rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/30`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-4xl font-black text-muted-foreground/30">{i + 1}</span>
                          <div className={`p-3 rounded-xl ${step.iconBg}`}>
                            <step.icon className={`w-6 h-6 ${step.iconColor}`} />
                          </div>
                        </div>
                        <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                        <p className="text-muted-foreground">{step.description}</p>
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
        <section className="py-16 bg-muted/30 border-y border-border/50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-black mb-3">Supported Card Types</h2>
              <p className="text-muted-foreground">We grade all major trading card games and sports cards</p>
            </motion.div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {categories.map((cat, i) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="p-6 rounded-2xl bg-card border border-border text-center hover:border-primary/50 transition-colors cursor-pointer group"
                >
                  <div className="text-4xl mb-3">{cat.image}</div>
                  <div className="font-bold text-sm mb-1">{cat.name}</div>
                  <div className="text-xs text-muted-foreground">{cat.count}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-black mb-4">Why Choose CardBoom Grading</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Industry-leading accuracy powered by advanced AI technology
              </p>
            </motion.div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-lg group"
                >
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feature.label}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-muted/30 border-y border-border/50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-black mb-3">What Collectors Say</h2>
              <p className="text-muted-foreground">Join thousands of satisfied users</p>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {testimonials.map((testimonial, i) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="p-6 rounded-2xl bg-card border border-border"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="flex text-yellow-500">
                        {[...Array(testimonial.rating)].map((_, j) => (
                          <Star key={j} className="w-3 h-3 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">"{testimonial.text}"</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto"
            >
              <div className="relative rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
                
                <div className="relative p-10 md:p-16 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-white/10 rounded-full text-sm font-semibold text-primary-foreground">
                    <Zap className="w-4 h-4" />
                    Simple Pricing
                  </div>
                  
                  <h2 className="text-3xl md:text-5xl font-black text-primary-foreground mb-4">
                    ${GRADING_PRICE_USD} per card
                  </h2>
                  <p className="text-lg text-primary-foreground/80 mb-8 max-w-md mx-auto">
                    No subscription. No hidden fees. Just fast, accurate AI grading.
                  </p>
                  
                  <Button 
                    size="lg" 
                    variant="secondary"
                    className="h-14 px-10 text-lg font-bold rounded-xl gap-2"
                    onClick={() => navigate('/grading/new')}
                  >
                    Start Grading Now
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  
                  <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-primary-foreground/70">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      <span>Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>24h Guarantee</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>Money Back</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Teaser */}
        <section className="py-16 border-t border-border/50">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-xl font-bold mb-2">Have Questions?</h3>
            <p className="text-muted-foreground mb-4">Check out our FAQ or contact support</p>
            <Button variant="outline" onClick={() => navigate('/help')}>
              View Help Center
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}