import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { User, ShoppingBag, Store, ArrowLeft, Phone, CreditCard, Shield, Sparkles, TrendingUp, Star } from 'lucide-react';
import { z } from 'zod';
import { motion } from 'framer-motion';
import cardboomLogo from '@/assets/cardboom-logo.png';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const phoneSchema = z.string().regex(/^(\+90|0)?[5][0-9]{9}$/, 'Please enter a valid Turkish phone number');
const nationalIdSchema = z.string().regex(/^[1-9][0-9]{10}$/, 'Please enter a valid 11-digit T.C. Kimlik No');

type AccountType = 'buyer' | 'seller' | 'both';

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('buyer');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    phone?: string;
    nationalId?: string;
    terms?: string;
  }>({});

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          navigate('/');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateLoginForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignupForm = () => {
    const newErrors: { 
      email?: string; 
      password?: string; 
      phone?: string;
      nationalId?: string;
      terms?: string;
    } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    const phoneResult = phoneSchema.safeParse(phone);
    if (!phoneResult.success) {
      newErrors.phone = phoneResult.error.errors[0].message;
    }

    const nationalIdResult = nationalIdSchema.safeParse(nationalId);
    if (!nationalIdResult.success) {
      newErrors.nationalId = nationalIdResult.error.errors[0].message;
    }

    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLoginForm()) return;
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back!');
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignupForm()) return;
    
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split('@')[0],
          account_type: accountType,
          phone: phone,
          national_id: nationalId,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created successfully! Welcome to Cardboom!');
    }
    setLoading(false);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('90')) {
      return '+' + digits.slice(0, 12);
    } else if (digits.startsWith('0')) {
      return digits.slice(0, 11);
    } else if (digits.startsWith('5')) {
      return '0' + digits.slice(0, 10);
    }
    return digits.slice(0, 11);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 backdrop-blur-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.button 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Cardboom
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-65px)] p-6">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding */}
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:block"
          >
            <div className="space-y-8">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <img 
                  src={cardboomLogo} 
                  alt="Cardboom" 
                  className="h-20 w-auto object-contain"
                />
              </div>

              {/* Features */}
              <div className="space-y-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-start gap-4 p-4 rounded-xl glass"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Live Market Data</h3>
                    <p className="text-muted-foreground text-sm">Track real-time prices across all categories</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-start gap-4 p-4 rounded-xl glass"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Star className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Earn XP & Rewards</h3>
                    <p className="text-muted-foreground text-sm">Level up and unlock exclusive benefits</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start gap-4 p-4 rounded-xl glass"
                >
                  <div className="w-12 h-12 rounded-xl bg-premium/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-premium" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Verified Sellers</h3>
                    <p className="text-muted-foreground text-sm">Trade with confidence on our secure platform</p>
                  </div>
                </motion.div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Active Traders', value: '50K+' },
                  { label: 'Items Listed', value: '2.1M' },
                  { label: 'Daily Volume', value: '$5.2M' },
                ].map((stat, i) => (
                  <motion.div 
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="text-center p-4 rounded-xl bg-secondary/50"
                  >
                    <div className="text-2xl font-bold font-display text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Side - Auth Form */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Mobile Logo */}
            <div className="text-center mb-6 lg:hidden">
              <img 
                src={cardboomLogo} 
                alt="Cardboom" 
                className="h-14 w-auto object-contain mx-auto"
              />
            </div>

            {/* Auth Card */}
            <div className="glass rounded-2xl p-8 shadow-2xl border border-border/50">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-secondary/50 p-1 rounded-xl">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium transition-all"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium transition-all"
                  >
                    Register
                  </TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-foreground font-medium">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
                        required
                      />
                      {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-foreground font-medium">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
                        required
                      />
                      {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-semibold text-lg rounded-xl shadow-lg hover:shadow-glow transition-all"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    {/* Early Access Benefits Banner */}
                    <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-purple-400 font-semibold">
                        <Sparkles className="w-5 h-5" />
                        Early Access Benefits
                      </div>
                      <ul className="grid grid-cols-2 gap-2 text-xs">
                        <li className="flex items-center gap-2 text-foreground/80">
                          <span className="text-primary">✓</span>
                          <strong>2x XP Bonus</strong>
                        </li>
                        <li className="flex items-center gap-2 text-foreground/80">
                          <span className="text-primary">✓</span>
                          <strong>Beta Tester Badge</strong>
                        </li>
                        <li className="flex items-center gap-2 text-foreground/80">
                          <span className="text-primary">✓</span>
                          <strong>Reduced Fees</strong>
                        </li>
                        <li className="flex items-center gap-2 text-foreground/80">
                          <span className="text-primary">✓</span>
                          <strong>Daily Streak Bonuses</strong>
                        </li>
                      </ul>
                    </div>

                    {/* Security Notice */}
                    <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-start gap-3">
                      <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-foreground/80 text-xs">
                        Your personal information is encrypted and securely stored. Required for regulatory compliance (KVKK/GDPR).
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-name" className="text-foreground font-medium">Display Name</Label>
                        <Input
                          id="register-name"
                          type="text"
                          placeholder="Your name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-email" className="text-foreground font-medium">Email</Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
                          required
                        />
                        {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-phone" className="text-foreground font-medium flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5" />
                          Phone
                        </Label>
                        <Input
                          id="register-phone"
                          type="tel"
                          placeholder="05XX XXX XX XX"
                          value={phone}
                          onChange={(e) => setPhone(formatPhone(e.target.value))}
                          className="h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
                          required
                        />
                        {errors.phone && <p className="text-destructive text-xs">{errors.phone}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-national-id" className="text-foreground font-medium flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5" />
                          T.C. Kimlik No
                        </Label>
                        <Input
                          id="register-national-id"
                          type="text"
                          placeholder="XXXXXXXXXXX"
                          value={nationalId}
                          onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 11))}
                          className="h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
                          maxLength={11}
                          required
                        />
                        {errors.nationalId && <p className="text-destructive text-xs">{errors.nationalId}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-foreground font-medium">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
                        required
                      />
                      {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
                    </div>

                    {/* Account Type Selection */}
                    <div className="space-y-3">
                      <Label className="text-foreground font-medium">I want to:</Label>
                      <RadioGroup
                        value={accountType}
                        onValueChange={(value) => setAccountType(value as AccountType)}
                        className="grid grid-cols-3 gap-3"
                      >
                        {[
                          { value: 'buyer', icon: ShoppingBag, label: 'Buy', desc: 'Purchase collectibles' },
                          { value: 'seller', icon: Store, label: 'Sell', desc: 'List your items' },
                          { value: 'both', icon: User, label: 'Both', desc: 'Full access' },
                        ].map((option) => (
                          <label
                            key={option.value}
                            htmlFor={option.value}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer transition-all text-center ${
                              accountType === option.value
                                ? 'border-primary bg-primary/10 shadow-lg'
                                : 'border-border/50 hover:border-primary/50 bg-secondary/30'
                            }`}
                          >
                            <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                            <option.icon className={`w-6 h-6 ${accountType === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
                            <div>
                              <p className="text-foreground font-medium text-sm">{option.label}</p>
                              <p className="text-muted-foreground text-xs">{option.desc}</p>
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Terms Checkbox */}
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="w-5 h-5 mt-0.5 rounded border-border/50 bg-secondary/50 text-primary focus:ring-primary/50"
                        />
                        <span className="text-sm text-muted-foreground">
                          I have read and agree to the{' '}
                          <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>,{' '}
                          <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>,{' '}
                          <a href="/kvkk" target="_blank" className="text-primary hover:underline">KVKK Aydınlatma Metni</a>, and{' '}
                          <a href="/mesafeli-satis-sozlesmesi" target="_blank" className="text-primary hover:underline">Mesafeli Satış Sözleşmesi</a>
                        </span>
                      </label>
                      {errors.terms && <p className="text-destructive text-xs">{errors.terms}</p>}
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-semibold text-lg rounded-xl shadow-lg hover:shadow-glow transition-all mt-2"
                    >
                      {loading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer Text */}
            <p className="text-center text-muted-foreground text-sm mt-6">
              Operated by Brainbaby Bilişim A.Ş.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;