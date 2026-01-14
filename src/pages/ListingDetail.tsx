import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  ChevronLeft, Vault, Truck, ArrowLeftRight, MessageCircle, 
  ShoppingCart, TrendingUp, TrendingDown, Send, Trash2, User,
  Shield, BadgeCheck, Sparkles, Bot, Award, Globe, Layers, Hash, FileText, Clock, Heart, DollarSign, PiggyBank
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PurchaseDialog } from '@/components/purchase/PurchaseDialog';
import { CardPriceEstimates } from '@/components/CardPriceEstimates';
import { ListingOffersPanel } from '@/components/listing/ListingOffersPanel';
import { GradingDonationPanel } from '@/components/listing/GradingDonationPanel';
import { GradingCountdownPanel } from '@/components/grading/GradingCountdownPanel';
import { StartConversationDialog } from '@/components/messaging/StartConversationDialog';
import { ListThisCardDialog } from '@/components/item/ListThisCardDialog';
import { MakeOfferDialog } from '@/components/trading/MakeOfferDialog';
import { EditListingDialog } from '@/components/listing/EditListingDialog';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Pencil } from 'lucide-react';
import { isUUID, generateListingUrl } from '@/lib/listingUrl';
import { normalizeCategory, urlCategoryToDbCategory } from '@/lib/seoSlug';
import { CardShowcase } from '@/components/ui/card-showcase';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  price: number;
  currency?: string;
  status: string;
  allows_vault: boolean;
  allows_trade: boolean;
  allows_shipping: boolean;
  created_at: string;
  seller_id: string;
  image_url: string | null;
  // Card metadata
  set_name?: string | null;
  set_code?: string | null;
  card_number?: string | null;
  rarity?: string | null;
  language?: string | null;
  cvi_key?: string | null;
  ai_confidence?: number | null;
  market_item_id?: string | null;
  // Certification
  certification_status?: string | null;
  grading_order_id?: string | null;
  // External grading (PSA, BGS, CGC, etc.)
  grading_company?: string | null;
  grade?: string | null;
  // CBGI (internal) scores
  cbgi_score?: number | null;
  cbgi_grade_label?: string | null;
  // Donations
  accepts_grading_donations?: boolean;
  donation_goal_cents?: number;
  slug?: string | null;
}

interface GradingInfo {
  final_grade: number | null;
  grade_label: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { display_name: string | null } | null;
}

interface VoteCounts {
  up: number;
  down: number;
  userVote: 'up' | 'down' | null;
}

const getLanguageFlag = (lang?: string | null) => {
  const flags: Record<string, string> = {
    japanese: '🇯🇵',
    english: '🇺🇸',
    korean: '🇰🇷',
    chinese: '🇨🇳',
    german: '🇩🇪',
    french: '🇫🇷',
    italian: '🇮🇹',
    spanish: '🇪🇸',
    portuguese: '🇵🇹',
  };
  return flags[(lang || 'english').toLowerCase()] || '🌐';
};

const getCategoryLabel = (cat: string) => {
  const labels: Record<string, string> = {
    pokemon: 'Pokémon',
    onepiece: 'One Piece',
    yugioh: 'Yu-Gi-Oh!',
    mtg: 'Magic: The Gathering',
    lorcana: 'Disney Lorcana',
    nba: 'NBA',
    football: 'Football',
    tcg: 'TCG',
    figures: 'Figures',
    gaming: 'Gaming',
    coaching: 'Coaching',
  };
  return labels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
};

const ListingDetail = () => {
  const { id, category, slug } = useParams();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [listing, setListing] = useState<Listing | null>(null);
  const [gradingInfo, setGradingInfo] = useState<GradingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [votes, setVotes] = useState<VoteCounts>({ up: 0, down: 0, userVote: null });
  const [voting, setVoting] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offersKey, setOffersKey] = useState(0);
  const [sellerName, setSellerName] = useState('Seller');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Determine if we're using UUID or slug-based URL
  const isSlugRoute = Boolean(category && slug);
  const listingIdentifier = isSlugRoute ? slug : id;

  useEffect(() => {
    if (listingIdentifier) {
      fetchListing();
      fetchComments();
      fetchVotes();
    }
  }, [listingIdentifier, user]);

  const fetchListing = async () => {
    try {
      let data = null;
      let error = null;

      if (isSlugRoute && category && slug) {
        // SEO route: fetch by slug
        // First try exact match
        let result = await supabase
          .from('listings')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        data = result.data;
        error = result.error;
        
        // If not found, try matching by the ID suffix at the end of the slug
        // URL might be shortened (e.g., nami-cf5d22bd) but DB has full slug
        if (!data && !error) {
          // Extract ID suffix from the end of the URL slug (last 8 chars after hyphen)
          const idSuffixMatch = slug.match(/-([a-f0-9]{8})$/i);
          if (idSuffixMatch) {
            const idSuffix = idSuffixMatch[1];
            const partialResult = await supabase
              .from('listings')
              .select('*')
              .ilike('slug', `%-${idSuffix}`)
              .maybeSingle();
            data = partialResult.data;
            error = partialResult.error;
          }
        }
        
        // Last resort: try partial match from start
        if (!data && !error) {
          const partialResult = await supabase
            .from('listings')
            .select('*')
            .ilike('slug', `${slug}%`)
            .maybeSingle();
          data = partialResult.data;
          error = partialResult.error;
        }
      } else if (id && isUUID(id)) {
        // Legacy UUID route
        const result = await supabase
          .from('listings')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        data = result.data;
        error = result.error;

        // If found via UUID, redirect to SEO URL
        if (data && data.slug) {
          const seoUrl = generateListingUrl({
            id: data.id,
            category: data.category,
            slug: data.slug,
          });
          navigate(seoUrl, { replace: true });
          return;
        }
      } else if (id) {
        // Might be a slug passed as id (edge case)
        const result = await supabase
          .from('listings')
          .select('*')
          .eq('slug', id)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      setListing(data);

      // Fetch seller name
      if (data?.seller_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', data.seller_id)
          .single();
        if (profile?.display_name) {
          setSellerName(profile.display_name);
        }
      }
      
      // Check for CardBoom grading - multiple strategies
      let gradingData = null;
      
      // Strategy 0: Check if listing already has cbgi_score stored directly
      if (data?.cbgi_score && data.cbgi_score > 0) {
        gradingData = {
          final_grade: data.cbgi_score,
          grade_label: data.cbgi_grade_label || 'Graded'
        };
      }
      
      // Strategy 1: Match by grading_order_id (direct link)
      if (!gradingData && data?.grading_order_id) {
        const { data: directGrading } = await supabase
          .from('grading_orders')
          .select('final_grade, grade_label')
          .eq('id', data.grading_order_id)
          .eq('status', 'completed')
          .maybeSingle();
        gradingData = directGrading;
      }
      
      // Strategy 2: Match by market_item_id
      if (!gradingData && data?.market_item_id) {
        const { data: marketGrading } = await supabase
          .from('grading_orders')
          .select('final_grade, grade_label')
          .eq('market_item_id', data.market_item_id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        gradingData = marketGrading;
      }
      
      // Strategy 3: Check if this listing was created from a grading order
      if (!gradingData && data?.id) {
        const { data: linkedGrading } = await supabase
          .from('grading_orders')
          .select('final_grade, grade_label')
          .eq('listing_created_id', data.id)
          .eq('status', 'completed')
          .limit(1)
          .maybeSingle();
        gradingData = linkedGrading;
      }
      
      // Strategy 4: Match seller's grading orders by image URL
      if (!gradingData && data?.seller_id && data?.image_url) {
        const { data: imageGrading } = await supabase
          .from('grading_orders')
          .select('final_grade, grade_label')
          .eq('user_id', data.seller_id)
          .eq('front_image_url', data.image_url)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        gradingData = imageGrading;
      }
      
      // Strategy 5: Match by card name + seller (fuzzy fallback for same user's grades)
      if (!gradingData && data?.seller_id && data?.title) {
        const normalizedTitle = data.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const { data: nameMatches } = await supabase
          .from('grading_orders')
          .select('final_grade, grade_label, card_name')
          .eq('user_id', data.seller_id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(20);
        
        if (nameMatches) {
          const match = nameMatches.find(g => {
            const normalizedGradeName = (g.card_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return normalizedGradeName === normalizedTitle || 
                   normalizedTitle.includes(normalizedGradeName) ||
                   normalizedGradeName.includes(normalizedTitle);
          });
          if (match) {
            gradingData = { final_grade: match.final_grade, grade_label: match.grade_label };
          }
        }
      }
      
      if (gradingData) {
        setGradingInfo(gradingData);
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
      toast.error('Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('listing_comments')
        .select('*')
        .eq('listing_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchVotes = async () => {
    try {
      const { data: allVotes, error } = await supabase
        .from('price_votes')
        .select('*')
        .eq('listing_id', id);

      if (error) throw error;

      const upVotes = allVotes?.filter(v => v.vote_type === 'up').length || 0;
      const downVotes = allVotes?.filter(v => v.vote_type === 'down').length || 0;
      const userVote = user ? allVotes?.find(v => v.user_id === user.id)?.vote_type as 'up' | 'down' | null : null;

      setVotes({ up: upVotes, down: downVotes, userVote });
    } catch (error) {
      console.error('Error fetching votes:', error);
    }
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user) {
      toast.error('Please sign in to vote');
      navigate('/auth');
      return;
    }

    setVoting(true);
    try {
      if (votes.userVote === voteType) {
        // Remove vote
        const { error } = await supabase
          .from('price_votes')
          .delete()
          .eq('listing_id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success('Vote removed');
      } else if (votes.userVote) {
        // Update vote
        const { error } = await supabase
          .from('price_votes')
          .update({ vote_type: voteType })
          .eq('listing_id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success('Vote updated');
      } else {
        // New vote
        const { error } = await supabase
          .from('price_votes')
          .insert({
            listing_id: id,
            user_id: user.id,
            vote_type: voteType,
          });

        if (error) throw error;
        toast.success(`You predict the price will go ${voteType}!`);
      }

      fetchVotes();
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    } finally {
      setVoting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('Please sign in to comment');
      navigate('/auth');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('listing_comments')
        .insert({
          listing_id: id,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;
      
      // Send notification to listing owner (if not commenting on own listing)
      if (listing && listing.seller_id !== user.id) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              user_id: listing.seller_id,
              type: 'message',
              title: 'New comment on your listing',
              body: `Someone commented on "${listing.title}"`,
              data: { listing_id: id }
            }
          });
        } catch (notifError) {
          // Don't fail the comment if notification fails
        }
      }
      
      toast.success('Comment added');
      setNewComment('');
      fetchComments();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('listing_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      toast.success('Comment deleted');
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      nba: 'NBA',
      football: 'Football',
      tcg: 'TCG',
      figures: 'Figures',
    };
    return labels[cat] || cat.toUpperCase();
  };

  const totalVotes = votes.up + votes.down;
  const upPercent = totalVotes > 0 ? Math.round((votes.up / totalVotes) * 100) : 50;
  const downPercent = totalVotes > 0 ? Math.round((votes.down / totalVotes) * 100) : 50;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        <main className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Listing not found</h1>
          <Button onClick={() => navigate('/explorer')}>Back to Explorer</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4 gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Card Image with Pedestal Display */}
          <div className="lg:col-span-1">
            <div className="relative flex flex-col items-center justify-center py-8">
              {/* Grading Badges Overlay - positioned above pedestal */}
              <div className="absolute top-2 left-4 z-20 flex flex-col gap-2">
                {/* CBGI Badge first - CardBoom's grading with tiffany color */}
                {gradingInfo?.final_grade && (
                  <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
                    <Award className="w-4 h-4" />
                    <span className="font-bold text-sm">CBGI {gradingInfo.final_grade.toFixed(1)}</span>
                  </div>
                )}
                {/* External Grading Badge second (PSA, BGS, CGC) */}
                {listing.grading_company && listing.grade && (
                  <div className={cn(
                    "px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg font-bold text-sm",
                    listing.grade === '10' || listing.grade === '9.5' 
                      ? "bg-gradient-to-r from-gold to-premium text-background" 
                      : "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                  )}>
                    <Shield className="w-4 h-4" />
                    <span>{listing.grading_company} {listing.grade}</span>
                  </div>
                )}
              </div>
              
              {listing.image_url ? (
                <CardShowcase 
                  src={listing.image_url}
                  alt={listing.title}
                  grade={listing.grade || (gradingInfo?.final_grade ? `CBGI ${gradingInfo.final_grade.toFixed(1)}` : null)}
                  size="lg"
                />
              ) : (
                <div className="w-full h-[400px] flex items-center justify-center bg-secondary/50 rounded-xl glass">
                  <ShoppingCart className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-5">
            {/* Hero Section - Card Identity */}
            <div>
              {/* Category & Status Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs">{getCategoryLabel(listing.category)}</Badge>
                {listing.rarity && (
                  <Badge variant="outline" className="text-xs capitalize">{listing.rarity}</Badge>
                )}
                <Badge variant="outline" className="text-xs">{listing.condition}</Badge>
                <Badge className={cn(
                  "text-xs",
                  listing.status === 'active' ? 'bg-gain text-gain-foreground' : 'bg-secondary'
                )}>
                  {listing.status === 'active' ? 'Available' : listing.status}
                </Badge>
              </div>
              
              {/* Card Name */}
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight mb-2">
                {listing.title}
              </h1>
              
              {/* Set & Card Details Line */}
              {(listing.set_name || listing.set_code || listing.card_number) && (
                <p className="text-muted-foreground text-sm sm:text-base">
                  {listing.set_name && <span className="font-medium">{listing.set_name}</span>}
                  {listing.set_code && <span> • {listing.set_code}</span>}
                  {listing.card_number && <span> • #{listing.card_number}</span>}
                  {listing.language && (
                    <span className="ml-2">{getLanguageFlag(listing.language)}</span>
                  )}
                </p>
              )}
            </div>

            {/* Trust & Verification Strip */}
            <div className="flex flex-wrap gap-2">
              {/* External Grading Badge (PSA, BGS, CGC) */}
              {listing.grading_company && listing.grade && (
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
                  listing.grade === '10' || listing.grade === '9.5'
                    ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400"
                    : "bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400"
                )}>
                  <Shield className="w-3.5 h-3.5" />
                  {listing.grading_company} {listing.grade}
                </div>
              )}
              
              {/* CBGI Badge - CardBoom's grading (always show if available) */}
              {gradingInfo?.final_grade && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-xs font-semibold text-primary">
                  <Award className="w-3.5 h-3.5" />
                  CBGI {gradingInfo.final_grade.toFixed(1)}
                </div>
              )}
              
              {/* AI Identified Badge */}
              {listing.ai_confidence && listing.ai_confidence > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-xs font-medium text-muted-foreground">
                  <Bot className="w-3.5 h-3.5" />
                  AI Identified • {Math.round(listing.ai_confidence * 100)}%
                </div>
              )}
              
              {/* Show pending or ungraded status only if no grading at all */}
              {!listing.grading_company && !gradingInfo?.final_grade && (
                listing.certification_status === 'pending' ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    Grading in Progress
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border text-xs font-medium text-muted-foreground">
                    <Sparkles className="w-3.5 h-3.5" />
                    Ungraded
                  </div>
                )
              )}
              
              {/* CVI Key */}
              {listing.cvi_key && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-xs font-medium text-foreground">
                  <Shield className="w-3.5 h-3.5" />
                  CVI: {listing.cvi_key.split('|').slice(0, 3).join('-')}
                </div>
              )}
            </div>

            {/* Price */}
            <div className="glass rounded-xl p-5">
              <p className="text-muted-foreground text-xs mb-1">Price</p>
              <p className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                {formatPrice(listing.price)}
              </p>
            </div>

            {/* Card Details Grid */}
            <Card className="border-border/50">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  Card Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {/* CBGI Score */}
                  {gradingInfo?.final_grade && (
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">CBGI:</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-bold text-primary cursor-help">
                            {gradingInfo.final_grade.toFixed(1)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">CardBoom Grading Index - AI-powered condition assessment</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {/* PSA/BGS/CGC Grade */}
                  {listing.grading_company && listing.grade && (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-muted-foreground">{listing.grading_company}:</span>
                      <span className={cn(
                        "font-bold",
                        listing.grade === '10' || listing.grade === '9.5'
                          ? "text-amber-500"
                          : "text-blue-500"
                      )}>
                        {listing.grade}
                      </span>
                    </div>
                  )}
                  {listing.set_name && (
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Set:</span>
                      <span className="font-medium text-foreground">{listing.set_name}</span>
                    </div>
                  )}
                  {listing.set_code && (
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Code:</span>
                      <span className="font-medium text-foreground">{listing.set_code}</span>
                    </div>
                  )}
                  {listing.card_number && (
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Number:</span>
                      <span className="font-medium text-foreground">#{listing.card_number}</span>
                    </div>
                  )}
                  {listing.rarity && (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Rarity:</span>
                      <span className="font-medium text-foreground capitalize">{listing.rarity}</span>
                    </div>
                  )}
                  {listing.language && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Language:</span>
                      <span className="font-medium text-foreground capitalize">
                        {getLanguageFlag(listing.language)} {listing.language}
                      </span>
                    </div>
                  )}
                  {listing.condition && (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Condition:</span>
                      <span className="font-medium text-foreground capitalize">{listing.condition}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium text-foreground">{getCategoryLabel(listing.category)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price Estimates by Grade */}
            <CardPriceEstimates
              marketItemId={listing.market_item_id || undefined}
              cardName={listing.title}
              setName={listing.set_name || undefined}
              category={listing.category}
            />

            {/* Description */}
            {listing.description && (
              <p className="text-muted-foreground text-sm">{listing.description}</p>
            )}

            {/* Delivery Options */}
            <div className="flex flex-wrap gap-2">
              {listing.allows_vault && (
                <Badge variant="outline" className="gap-1">
                  <Vault className="h-3 w-3" /> Vault Storage
                </Badge>
              )}
              {listing.allows_trade && (
                <Badge variant="outline" className="gap-1">
                  <ArrowLeftRight className="h-3 w-3" /> Trade Online
                </Badge>
              )}
              {listing.allows_shipping && (
                <Badge variant="outline" className="gap-1">
                  <Truck className="h-3 w-3" /> Shipping
                </Badge>
              )}
            </div>

            {/* Actions - Show Buy Now for everyone except the seller */}
            {listing.status === 'active' && user?.id !== listing.seller_id && (
              <div className="flex flex-wrap gap-3">
                <Button 
                  size="lg" 
                  className="gap-2" 
                  onClick={() => {
                    if (!user) {
                      toast.info('Sign in to purchase this card');
                      navigate('/auth', { state: { returnTo: `/listing/${listing.id}` } });
                      return;
                    }
                    setPurchaseDialogOpen(true);
                  }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Buy Now
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="gap-2"
                  onClick={() => {
                    if (!user) {
                      toast.info('Sign in to make an offer');
                      navigate('/auth', { state: { returnTo: `/listing/${listing.id}` } });
                      return;
                    }
                    setOfferDialogOpen(true);
                  }}
                >
                  <DollarSign className="w-4 h-4" />
                  Make Offer
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="gap-2"
                  onClick={() => {
                    if (!user) {
                      toast.info('Sign in to message the seller');
                      navigate('/auth', { state: { returnTo: `/listing/${listing.id}` } });
                      return;
                    }
                    setMessageDialogOpen(true);
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Message Seller
                </Button>
                <ListThisCardDialog
                  cardName={listing.title}
                  category={listing.category}
                  setName={listing.set_name}
                  marketItemId={listing.market_item_id}
                  user={user}
                />
              </div>
            )}

            {/* Purchase Dialog */}
            <PurchaseDialog
              open={purchaseDialogOpen}
              onOpenChange={setPurchaseDialogOpen}
              listing={listing}
            />

            {/* Message Dialog */}
            <StartConversationDialog
              open={messageDialogOpen}
              onOpenChange={setMessageDialogOpen}
              listingId={listing.id}
              sellerId={listing.seller_id}
              sellerName={sellerName}
            />

            {/* Make Offer Dialog */}
            <MakeOfferDialog
              open={offerDialogOpen}
              onOpenChange={setOfferDialogOpen}
              listingId={listing.id}
              listingPrice={listing.price}
              sellerName={sellerName}
              sellerId={listing.seller_id}
              onOfferSent={() => setOffersKey(k => k + 1)}
            />

            {user?.id === listing.seller_id && (
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-primary/20 text-primary">This is your listing</Badge>
                
                {/* Edit Listing Button */}
                <EditListingDialog
                  listing={{
                    id: listing.id,
                    title: listing.title,
                    description: listing.description,
                    price: listing.price,
                    image_url: listing.image_url,
                    grading_order_id: listing.grading_order_id,
                    cbgi_score: listing.cbgi_score,
                  }}
                  onSuccess={() => window.location.reload()}
                />
                
                {/* Grade this listing button - only for ungraded cards without pending grading */}
                {!gradingInfo?.final_grade && 
                 listing.certification_status !== 'completed' && 
                 listing.certification_status !== 'pending' && 
                 !listing.grading_order_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
                    onClick={() => navigate(`/grading/new?listing=${listing.id}`)}
                  >
                    <Award className="w-4 h-4" />
                    Grade This Listing
                  </Button>
                )}
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Listing
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The listing will be permanently removed and cannot be recovered.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('listings')
                              .delete()
                              .eq('id', listing.id)
                              .eq('seller_id', user.id);
                            
                            if (error) throw error;
                            toast.success('Listing deleted successfully');
                            navigate('/profile');
                          } catch (err) {
                            console.error('Error deleting listing:', err);
                            toast.error('Failed to delete listing');
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>

        {/* Grading Countdown - Show when grading is in progress */}
        {listing.grading_order_id && listing.certification_status === 'pending' && (
          <div className="mb-6">
            <GradingCountdownPanel
              gradingOrderId={listing.grading_order_id}
              onComplete={() => {
                fetchListing();
              }}
            />
          </div>
        )}

        {/* Compact Grading Donation - Only for ungraded cards without pending grading */}
        {!gradingInfo?.final_grade && 
         listing.certification_status !== 'completed' && 
         listing.certification_status !== 'pending' && 
         !listing.grading_order_id && (
          <div className="mb-6">
            <GradingDonationPanel
              targetType="listing"
              targetId={listing.id}
              ownerId={listing.seller_id}
              acceptsDonations={listing.accepts_grading_donations || false}
              goalCents={listing.donation_goal_cents || 2000}
              isOwner={user?.id === listing.seller_id}
              cardTitle={listing.title}
              onToggleDonations={async (enabled) => {
                const { error } = await supabase
                  .from('listings')
                  .update({ accepts_grading_donations: enabled })
                  .eq('id', listing.id);
                if (!error) {
                  setListing(prev => prev ? { ...prev, accepts_grading_donations: enabled } : null);
                  toast.success(enabled ? 'Donations enabled' : 'Donations disabled');
                }
              }}
              onRefundAndDelist={async () => {
                fetchListing();
              }}
            />
          </div>
        )}

        {/* Offers Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Offers from Buyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ListingOffersPanel
              key={offersKey}
              listingId={listing.id}
              sellerId={listing.seller_id}
              isOwner={user?.id === listing.seller_id}
            />
          </CardContent>
        </Card>

        {/* Price Prediction Voting */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Price Prediction - Will it go up or down?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant={votes.userVote === 'up' ? 'default' : 'outline'}
                onClick={() => handleVote('up')}
                disabled={voting}
                className={cn(
                  "flex-1 h-16 gap-2 text-lg",
                  votes.userVote === 'up' && "bg-gain hover:bg-gain/90"
                )}
              >
                <TrendingUp className="w-6 h-6" />
                Going Up
              </Button>
              <Button
                variant={votes.userVote === 'down' ? 'default' : 'outline'}
                onClick={() => handleVote('down')}
                disabled={voting}
                className={cn(
                  "flex-1 h-16 gap-2 text-lg",
                  votes.userVote === 'down' && "bg-loss hover:bg-loss/90"
                )}
              >
                <TrendingDown className="w-6 h-6" />
                Going Down
              </Button>
            </div>
            
            {/* Vote Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gain font-medium">{votes.up} votes ({upPercent}%)</span>
                <span className="text-loss font-medium">{votes.down} votes ({downPercent}%)</span>
              </div>
              <div className="h-4 bg-secondary rounded-full overflow-hidden flex">
                <div 
                  className="bg-gain transition-all duration-500"
                  style={{ width: `${upPercent}%` }}
                />
                <div 
                  className="bg-loss transition-all duration-500"
                  style={{ width: `${downPercent}%` }}
                />
              </div>
              <p className="text-center text-muted-foreground text-sm">
                {totalVotes} total predictions
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Comment */}
            <div className="flex gap-2">
              <Textarea
                placeholder={user ? "Add a comment..." : "Sign in to comment"}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={!user}
                className="flex-1"
                rows={2}
              />
              <Button 
                onClick={handleSubmitComment}
                disabled={!user || submittingComment || !newComment.trim()}
                size="icon"
                className="h-auto"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="glass rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {comment.user_id === user?.id ? 'You' : 'Anonymous User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {comment.user_id === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-loss"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-foreground">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default ListingDetail;
