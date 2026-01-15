import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  Shield,
  Zap,
  Gift,
  Star,
  CheckCircle2,
  ArrowRight,
  Youtube,
  Instagram,
  Twitch,
  Video,
  Sparkles,
  Trophy,
  Target,
  Rocket,
  Heart,
  Eye,
  Share2,
  Clock,
  Verified,
} from "lucide-react";

const CreatorInvite = () => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    creatorName: "",
    email: "",
    platform: "",
    handle: "",
    followers: "",
    categories: [] as string[],
    bio: "",
    portfolioUrl: "",
    agreeTerms: false,
  });

  // Fetch real platform stats
  const { data: platformStats } = useQuery({
    queryKey: ['creator-platform-stats'],
    queryFn: async () => {
      // Get active user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total volume (all orders - matching homepage logic)
      const { data: orders } = await supabase
        .from('orders')
        .select('price');

      const monthlyVolume = orders?.reduce((sum, o) => sum + (o.price || 0), 0) || 0;

      return {
        activeCollectors: userCount || 0,
        monthlyVolume,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Format stats for display
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K+`;
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K+`;
    return `$${num}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agreeTerms) {
      toast({
        title: "Please accept the terms",
        description: "You must agree to the creator terms to apply.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Store application in database (table will be created by migration)
      const { error } = await supabase.from("creator_applications" as any).insert({
        creator_name: formData.creatorName,
        email: formData.email,
        platform: formData.platform,
        handle: formData.handle,
        follower_count: formData.followers,
        categories: formData.categories,
        bio: formData.bio,
        portfolio_url: formData.portfolioUrl,
        status: "pending",
      } as any);

      if (error) throw error;

      toast({
        title: "Application Submitted! 🎉",
        description: "We'll review your application and get back to you within 48 hours.",
      });

      // Reset form
      setFormData({
        creatorName: "",
        email: "",
        platform: "",
        handle: "",
        followers: "",
        categories: [],
        bio: "",
        portfolioUrl: "",
        agreeTerms: false,
      });
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Application Received",
        description: "Thanks for your interest! We'll be in touch soon.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: DollarSign,
      title: "Revenue Share",
      description: "Earn up to 30% revenue share on tips, subscriptions, and referral commissions from your audience.",
      highlight: "Up to 30%",
    },
    {
      icon: Users,
      title: "TCG-Focused Audience",
      description: "Access passionate collectors actively looking for trusted voices in the TCG space.",
      highlight: "Growing Community",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Track your performance with detailed insights on views, engagement, and earnings in real-time.",
      highlight: "Real-time Data",
    },
    {
      icon: Shield,
      title: "Verified Creator Badge",
      description: "Stand out with our verified badge that builds trust and credibility with your audience.",
      highlight: "Trust Badge",
    },
    {
      icon: Zap,
      title: "Priority Features",
      description: "Get early access to new features, beta tools, and direct input on platform development.",
      highlight: "Early Access",
    },
    {
      icon: Gift,
      title: "Creator Perks",
      description: "Exclusive merch, event invites, free grading credits, and partnership opportunities.",
      highlight: "Exclusive Perks",
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Apply",
      description: "Fill out the application form below with your creator info and content samples.",
      icon: Rocket,
    },
    {
      step: 2,
      title: "Get Verified",
      description: "Our team reviews your application and verifies your creator status within 48 hours.",
      icon: Verified,
    },
    {
      step: 3,
      title: "Create & Share",
      description: "Start posting Reels, sharing market calls, and building your CardBoom presence.",
      icon: Video,
    },
    {
      step: 4,
      title: "Earn & Grow",
      description: "Monetize your content, grow your following, and unlock additional perks.",
      icon: TrendingUp,
    },
  ];

  const creatorPerks = [
    { icon: Trophy, text: "Featured on homepage & discovery" },
    { icon: Star, text: "5 free AI grading credits/month" },
    { icon: Target, text: "Priority customer support" },
    { icon: Share2, text: "Cross-promotion opportunities" },
    { icon: Eye, text: "Boosted visibility for 30 days" },
    { icon: Heart, text: "Exclusive creator Discord access" },
    { icon: Clock, text: "Early access to new features" },
    { icon: Gift, text: "Monthly creator giveaways" },
  ];

  const faqs = [
    {
      question: "What content can I post on CardBoom Reels?",
      answer: "You can post TCG-related content including pack openings, card showcases, market analysis, collection tours, grading reveals, trade videos, and educational content. All content must be original and follow our community guidelines.",
    },
    {
      question: "How does the revenue share work?",
      answer: "Creators earn through multiple streams: up to 30% of tips received, 20% of subscription fees from your followers, and 10% commission on sales generated through your referral links. Payments are processed monthly with a minimum threshold of $50.",
    },
    {
      question: "Do I need to post exclusively on CardBoom?",
      answer: "No! We encourage cross-posting. You can share your content on TikTok, YouTube, Instagram, and CardBoom simultaneously. Many creators repurpose their existing content for our platform.",
    },
    {
      question: "What are the requirements to become a verified creator?",
      answer: "We look for creators with at least 1,000 followers on any platform, consistent TCG-related content, and a genuine passion for the hobby. Quality matters more than follower count.",
    },
    {
      question: "How long does the application review take?",
      answer: "Most applications are reviewed within 48 hours. You'll receive an email notification with the decision and next steps.",
    },
    {
      question: "Can I link my existing social media accounts?",
      answer: "Yes! You can link your YouTube, TikTok, Instagram, Twitch, and Twitter accounts to your CardBoom creator profile for cross-platform visibility.",
    },
  ];

  const categories = [
    "Pokémon",
    "Magic: The Gathering",
    "Yu-Gi-Oh!",
    "One Piece",
    "Lorcana",
    "Sports Cards",
    "Vintage Cards",
    "Grading & Authentication",
    "Market Analysis",
    "Collectible Figures",
  ];

  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  return (
    <>
      <Helmet>
        <title>Become a Creator | CardBoom - Join the TCG Creator Community</title>
        <meta
          name="description"
          content="Join CardBoom's creator program. Earn revenue, grow your audience, and connect with 50,000+ TCG collectors. Apply now for exclusive perks and verified status."
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />

        {/* Video Hero Section - Phygitals Style */}
        <section className="relative min-h-[80vh] flex items-center overflow-hidden">
          {/* Video Background */}
          <div className="absolute inset-0 z-0">
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/videos/creator-hero.mp4" type="video/mp4" />
            </video>
            {/* Overlay gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>
          
          <div className="container relative z-10 mx-auto px-4 py-24">
            <div className="max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Badge variant="secondary" className="mb-6 px-4 py-1.5 bg-background/80 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Creator Program Now Open
                </Badge>

                <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                  Turn Your TCG Passion Into{" "}
                  <span className="text-primary">Income</span>
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground mb-8">
                  Join CardBoom's creator community. Share your collection, market insights,
                  and pack openings with collectors who value your expertise.
                </p>

                <div className="flex flex-wrap gap-4 mb-8">
                  <Button size="lg" className="gap-2" onClick={() => document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" })}>
                    Apply Now
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2 bg-background/50 backdrop-blur-sm" onClick={() => document.getElementById("benefits")?.scrollIntoView({ behavior: "smooth" })}>
                    <Play className="w-4 h-4" />
                    See Benefits
                  </Button>
                </div>

                {/* Platform Icons */}
                <div className="flex items-center gap-6 text-muted-foreground">
                  <span className="text-sm">Cross-post from:</span>
                  <div className="flex gap-4">
                    <Youtube className="w-6 h-6 hover:text-red-500 transition-colors cursor-pointer" />
                    <Instagram className="w-6 h-6 hover:text-pink-500 transition-colors cursor-pointer" />
                    <Twitch className="w-6 h-6 hover:text-purple-500 transition-colors cursor-pointer" />
                    <Video className="w-6 h-6 hover:text-primary transition-colors cursor-pointer" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section - Separate from hero for clarity */}
        <section className="py-12 bg-muted/30 border-y border-border/50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            >
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">
                  {platformStats ? formatNumber(platformStats.activeCollectors) : '—'}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Active Collectors</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">
                  {platformStats ? formatCurrency(platformStats.monthlyVolume) : '—'}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Monthly Volume</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">30%</div>
                <div className="text-sm text-muted-foreground mt-1">Revenue Share</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">48hrs</div>
                <div className="text-sm text-muted-foreground mt-1">Approval Time</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Why Creators Choose CardBoom
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We've built the platform TCG creators deserve—with real monetization,
                engaged audiences, and tools that help you grow.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="h-full hover:border-primary/50 transition-colors group">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <benefit.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{benefit.title}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {benefit.highlight}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Getting started is simple. Apply today and start earning within days.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {howItWorks.map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="text-center relative"
                >
                  {i < howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                  )}
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 text-primary mb-4 relative">
                    <step.icon className="w-8 h-8" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Creator Perks Grid */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Exclusive Creator Perks
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Beyond revenue share, verified creators get access to premium benefits.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {creatorPerks.map((perk, i) => (
                <motion.div
                  key={perk.text}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="h-full hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <perk.icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium">{perk.text}</span>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Application Form */}
        <section id="apply" className="py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Apply to Become a Creator
                </h2>
                <p className="text-muted-foreground">
                  Tell us about yourself and your content. We review all applications within 48 hours.
                </p>
              </div>

              <Card className="border-primary/20">
                <CardContent className="p-6 md:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="creatorName">Creator / Channel Name *</Label>
                        <Input
                          id="creatorName"
                          placeholder="Your creator name"
                          value={formData.creatorName}
                          onChange={(e) => setFormData({ ...formData, creatorName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* Platform Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="platform">Primary Platform *</Label>
                        <Select
                          value={formData.platform}
                          onValueChange={(value) => setFormData({ ...formData, platform: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="twitch">Twitch</SelectItem>
                            <SelectItem value="twitter">Twitter/X</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="handle">Username / Handle *</Label>
                        <Input
                          id="handle"
                          placeholder="@yourhandle"
                          value={formData.handle}
                          onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* Follower Count */}
                    <div className="space-y-2">
                      <Label htmlFor="followers">Follower / Subscriber Count *</Label>
                      <Select
                        value={formData.followers}
                        onValueChange={(value) => setFormData({ ...formData, followers: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-1000">0 - 1,000</SelectItem>
                          <SelectItem value="1000-5000">1,000 - 5,000</SelectItem>
                          <SelectItem value="5000-10000">5,000 - 10,000</SelectItem>
                          <SelectItem value="10000-50000">10,000 - 50,000</SelectItem>
                          <SelectItem value="50000-100000">50,000 - 100,000</SelectItem>
                          <SelectItem value="100000+">100,000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Categories */}
                    <div className="space-y-3">
                      <Label>Content Categories *</Label>
                      <p className="text-sm text-muted-foreground">Select all that apply to your content</p>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                          <Badge
                            key={category}
                            variant={formData.categories.includes(category) ? "default" : "outline"}
                            className="cursor-pointer transition-colors"
                            onClick={() => toggleCategory(category)}
                          >
                            {formData.categories.includes(category) && (
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                            )}
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                      <Label htmlFor="bio">About You & Your Content *</Label>
                      <Textarea
                        id="bio"
                        placeholder="Tell us about your content style, what makes you unique, and why you want to join CardBoom..."
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={4}
                        required
                      />
                    </div>

                    {/* Portfolio URL */}
                    <div className="space-y-2">
                      <Label htmlFor="portfolioUrl">Link to Your Best Content</Label>
                      <Input
                        id="portfolioUrl"
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        value={formData.portfolioUrl}
                        onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Share a link to a video or post that represents your best work
                      </p>
                    </div>

                    {/* Terms */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={formData.agreeTerms}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, agreeTerms: checked as boolean })
                        }
                      />
                      <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                        I agree to the CardBoom Creator Terms and understand that my content must be original and follow community guidelines. I confirm that I own or have rights to share the content I post.
                      </Label>
                    </div>

                    {/* Submit */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        "Submitting..."
                      ) : (
                        <>
                          Submit Application
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
            </motion.div>

            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <AccordionItem value={`faq-${i}`} className="bg-card border rounded-lg px-6">
                      <AccordionTrigger className="text-left hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Grow Your TCG Influence?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join hundreds of creators already earning and growing on CardBoom.
                Your audience is waiting.
              </p>
              <Button size="lg" onClick={() => document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" })}>
                Apply Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default CreatorInvite;
