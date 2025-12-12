import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { User, ShoppingBag, Store, ArrowLeft, Phone, CreditCard, Shield } from 'lucide-react';
import { z } from 'zod';

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
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    phone?: string;
    nationalId?: string;
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
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Format as Turkish phone
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
    <div className="min-h-screen bg-obsidian flex flex-col">
      {/* Header */}
      <header className="border-b border-platinum/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-platinum/70 hover:text-platinum transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cardboom
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-platinum mb-2">
              <span className="text-gold">Card</span>boom
            </h1>
            <p className="text-platinum/60">Join the premier collectibles marketplace</p>
          </div>

          {/* Auth Card */}
          <div className="bg-graphite/50 border border-platinum/10 rounded-2xl p-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-obsidian/50">
                <TabsTrigger value="login" className="data-[state=active]:bg-gold data-[state=active]:text-obsidian">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-gold data-[state=active]:text-obsidian">
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-platinum">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-obsidian border-platinum/20 text-platinum placeholder:text-platinum/40"
                      required
                    />
                    {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-platinum">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-obsidian border-platinum/20 text-platinum placeholder:text-platinum/40"
                      required
                    />
                    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gold hover:bg-gold/90 text-obsidian font-semibold"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <form onSubmit={handleSignUp} className="space-y-4">
                  {/* Security Notice */}
                  <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 flex items-start gap-2">
                    <Shield className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                    <p className="text-platinum/80 text-xs">
                      Your personal information is encrypted and securely stored. Required for regulatory compliance (KVKK/GDPR).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-name" className="text-platinum">Display Name</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Your display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-obsidian border-platinum/20 text-platinum placeholder:text-platinum/40"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-platinum">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-obsidian border-platinum/20 text-platinum placeholder:text-platinum/40"
                      required
                    />
                    {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-phone" className="text-platinum flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="0 5XX XXX XX XX"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className="bg-obsidian border-platinum/20 text-platinum placeholder:text-platinum/40"
                      required
                    />
                    {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-national-id" className="text-platinum flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      T.C. Kimlik No
                    </Label>
                    <Input
                      id="register-national-id"
                      type="text"
                      placeholder="XXXXXXXXXXX"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className="bg-obsidian border-platinum/20 text-platinum placeholder:text-platinum/40"
                      maxLength={11}
                      required
                    />
                    {errors.nationalId && <p className="text-red-500 text-sm">{errors.nationalId}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-platinum">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-obsidian border-platinum/20 text-platinum placeholder:text-platinum/40"
                      required
                    />
                    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                  </div>

                  {/* Account Type Selection */}
                  <div className="space-y-3">
                    <Label className="text-platinum">I want to:</Label>
                    <RadioGroup
                      value={accountType}
                      onValueChange={(value) => setAccountType(value as AccountType)}
                      className="grid grid-cols-1 gap-3"
                    >
                      <label
                        htmlFor="buyer"
                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          accountType === 'buyer'
                            ? 'border-gold bg-gold/10'
                            : 'border-platinum/20 hover:border-platinum/40'
                        }`}
                      >
                        <RadioGroupItem value="buyer" id="buyer" className="border-platinum/40" />
                        <ShoppingBag className={`w-5 h-5 ${accountType === 'buyer' ? 'text-gold' : 'text-platinum/60'}`} />
                        <div>
                          <p className="text-platinum font-medium">Buy Collectibles</p>
                          <p className="text-platinum/50 text-sm">Browse and purchase rare cards & figures</p>
                        </div>
                      </label>

                      <label
                        htmlFor="seller"
                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          accountType === 'seller'
                            ? 'border-gold bg-gold/10'
                            : 'border-platinum/20 hover:border-platinum/40'
                        }`}
                      >
                        <RadioGroupItem value="seller" id="seller" className="border-platinum/40" />
                        <Store className={`w-5 h-5 ${accountType === 'seller' ? 'text-gold' : 'text-platinum/60'}`} />
                        <div>
                          <p className="text-platinum font-medium">Sell Collectibles</p>
                          <p className="text-platinum/50 text-sm">List your items and reach collectors worldwide</p>
                        </div>
                      </label>

                      <label
                        htmlFor="both"
                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          accountType === 'both'
                            ? 'border-gold bg-gold/10'
                            : 'border-platinum/20 hover:border-platinum/40'
                        }`}
                      >
                        <RadioGroupItem value="both" id="both" className="border-platinum/40" />
                        <User className={`w-5 h-5 ${accountType === 'both' ? 'text-gold' : 'text-platinum/60'}`} />
                        <div>
                          <p className="text-platinum font-medium">Buy & Sell</p>
                          <p className="text-platinum/50 text-sm">Full access to all marketplace features</p>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gold hover:bg-gold/90 text-obsidian font-semibold"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer Text */}
          <p className="text-center text-platinum/40 text-sm mt-6">
            By continuing, you agree to Cardboom's Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
