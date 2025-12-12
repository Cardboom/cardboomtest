import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BadgeCheck, Upload, FileText, Building2, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const MONTHLY_FEE = 19.99;

const VerifiedSellerPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [formData, setFormData] = useState({
    businessName: '',
    businessAddress: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      fetchData(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchData = async (userId: string) => {
    try {
      // Fetch verification status
      const { data: verif, error: verifError } = await supabase
        .from('verified_sellers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (verifError) throw verifError;
      setVerification(verif);

      if (verif) {
        setFormData({
          businessName: verif.business_name || '',
          businessAddress: verif.business_address || '',
        });
      }

      // Fetch wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError) throw walletError;
      if (wallet) setWalletBalance(Number(wallet.balance));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!formData.businessName.trim()) {
      toast.error('Please enter your business name');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('verified_sellers')
        .insert({
          user_id: session.user.id,
          business_name: formData.businessName,
          business_address: formData.businessAddress,
          verification_status: 'pending',
        });

      if (error) throw error;

      toast.success('Application submitted! We will review your request.');
      fetchData(session.user.id);
    } catch (error: any) {
      console.error('Error applying:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubscribe = async () => {
    if (walletBalance < MONTHLY_FEE) {
      toast.error('Insufficient wallet balance. Please add funds first.');
      navigate('/wallet');
      return;
    }

    toast.info('Subscription payment from wallet coming soon.');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-gain text-gain-foreground"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'pending':
        return <Badge className="bg-gold text-gold-foreground"><Clock className="h-3 w-3 mr-1" /> Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <BadgeCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Verified Seller Program
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Get verified to build trust, unlock premium features, and increase your sales.
            </p>
          </div>

          {/* Benefits */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Benefits</CardTitle>
              <CardDescription>What you get as a verified seller</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: BadgeCheck, title: 'Verified Badge', desc: 'Stand out with a trusted seller badge' },
                  { icon: Building2, title: 'Business Profile', desc: 'Display your business information' },
                  { icon: FileText, title: 'Priority Support', desc: 'Dedicated support for verified sellers' },
                  { icon: Upload, title: 'Higher Limits', desc: 'Increased listing and transaction limits' },
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                    <benefit.icon className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{benefit.title}</p>
                      <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status / Application */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Verification Status</CardTitle>
                  <CardDescription>
                    ${MONTHLY_FEE}/month • Paid from wallet balance
                  </CardDescription>
                </div>
                {verification && getStatusBadge(verification.verification_status)}
              </div>
            </CardHeader>
            <CardContent>
              {!verification ? (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      placeholder="Your business or seller name"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessAddress">Business Address</Label>
                    <Textarea
                      id="businessAddress"
                      placeholder="Your business address (optional)"
                      value={formData.businessAddress}
                      onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      After approval, you'll need ${MONTHLY_FEE} in your wallet to activate your subscription.
                      Your current balance: ${walletBalance.toFixed(2)}
                    </p>
                  </div>

                  <Button onClick={handleApply} disabled={submitting} className="w-full">
                    {submitting ? 'Submitting...' : 'Apply for Verification'}
                  </Button>
                </div>
              ) : verification.verification_status === 'approved' ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-gain/10 border border-gain/30 text-center">
                    <CheckCircle className="h-8 w-8 text-gain mx-auto mb-2" />
                    <p className="font-medium text-foreground">You're a Verified Seller!</p>
                    {verification.subscription_active ? (
                      <p className="text-sm text-muted-foreground">
                        Subscription active until {new Date(verification.subscription_ends_at).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Activate your subscription to display the verified badge
                      </p>
                    )}
                  </div>

                  {!verification.subscription_active && (
                    <Button onClick={handleSubscribe} className="w-full">
                      Activate Subscription (${MONTHLY_FEE}/mo)
                    </Button>
                  )}
                </div>
              ) : verification.verification_status === 'pending' ? (
                <div className="p-6 text-center">
                  <Clock className="h-12 w-12 text-gold mx-auto mb-4" />
                  <p className="font-medium text-foreground mb-2">Application Under Review</p>
                  <p className="text-sm text-muted-foreground">
                    We're reviewing your application. This usually takes 1-2 business days.
                  </p>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="font-medium text-foreground mb-2">Application Rejected</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Unfortunately, your application was not approved. Please contact support for more information.
                  </p>
                  <Button variant="outline" onClick={() => setVerification(null)}>
                    Apply Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VerifiedSellerPage;
