import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft, Phone, CreditCard, Sparkles, TrendingUp, Star, Smartphone, Mail, Link, Loader2 } from 'lucide-react';
import { PhoneInputWithCountry } from '@/components/ui/phone-input';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlatformStats, formatStatValue } from '@/hooks/usePlatformStats';
import { useRememberMe } from '@/hooks/useRememberMe';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { TwoFactorVerify } from '@/components/auth/TwoFactorVerify';
import { OTPInput } from '@/components/auth/OTPInput';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { trackSignUpEvent } from '@/lib/tracking';
import cardboomLogo from '@/assets/cardboom-logo.png';
import cardboomLogoDark from '@/assets/cardboom-logo-dark.png';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
// Universal phone validation - accepts international format with country code
const phoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, 'Please enter a valid phone number with country code');
// National ID allows letters and numbers for international IDs (passport, tax ID, etc.)
const nationalIdSchema = z.string().regex(/^[A-Za-z0-9]{5,20}$/, 'Please enter a valid ID (5-20 alphanumeric characters)');
const otpSchema = z.string().length(6, 'OTP must be 6 digits');

type LoginMethod = 'email' | 'phone' | 'magic-link';

const AUTH_VIDEOS = [
  '/videos/boom-packs-hero.mp4',
  '/videos/hero-video.mp4',
];

const Auth = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const platformStats = usePlatformStats();
  const { rememberMe, setRememberMe, savedEmail, saveRememberMe } = useRememberMe();
  const { isAvailable: biometricAvailable, biometryType, isNativePlatform, authenticateWithBiometrics } = useBiometricAuth();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedFees, setAcceptedFees] = useState(false);
  const [acceptedConsignment, setAcceptedConsignment] = useState(false);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [loginPhone, setLoginPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetCountryCode, setResetCountryCode] = useState('+1');
  const [resetOtp, setResetOtp] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetVerified, setResetVerified] = useState(false);
  const [loginCountryCode, setLoginCountryCode] = useState('+1');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [pending2FAUser, setPending2FAUser] = useState<{ id: string; phone: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingUser, setOnboardingUser] = useState<{ id: string; email: string; displayName?: string } | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    phone?: string;
    nationalId?: string;
    terms?: string;
    fees?: string;
    consignment?: string;
    loginPhone?: string;
    otp?: string;
    resetPhone?: string;
    resetEmail?: string;
    resetOtp?: string;
    newPassword?: string;
    magicLinkEmail?: string;
  }>({});

  // Rotate videos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % AUTH_VIDEOS.length);
    }, 15000); // Change video every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Load saved email on mount
  useEffect(() => {
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, [savedEmail]);

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
      fees?: string;
      consignment?: string;
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

    if (!acceptedFees) {
      newErrors.fees = 'You must accept the platform fees and commissions';
    }

    if (!acceptedConsignment) {
      newErrors.consignment = 'You must accept the consignment agreement';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLoginForm()) return;
    
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
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
      // Save remember me preference
      saveRememberMe(email, rememberMe);
      toast.success('Welcome back!');
    }
    setLoading(false);
  };

  const handleMagicLink = async () => {
    const emailResult = emailSchema.safeParse(magicLinkEmail);
    if (!emailResult.success) {
      setErrors({ magicLinkEmail: emailResult.error.errors[0].message });
      return;
    }
    setErrors({});
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: magicLinkEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      setMagicLinkSent(true);
      toast.success('Magic link sent! Check your email.');
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const phoneResult = phoneSchema.safeParse(loginPhone);
    if (!phoneResult.success) {
      setErrors({ loginPhone: phoneResult.error.errors[0].message });
      return;
    }
    setErrors({});
    
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('send-sms', {
        body: { phone: loginPhone, type: 'login_otp' }
      });

      if (response.error || !response.data?.success) {
        toast.error(response.data?.error || 'Failed to send OTP');
      } else {
        setOtpSent(true);
        toast.success('Verification code sent from CARDBOOM!');
      }
    } catch (err) {
      toast.error('Failed to send verification code');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpResult = otpSchema.safeParse(otp);
    if (!otpResult.success) {
      setErrors({ otp: otpResult.error.errors[0].message });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      // Verify OTP via our edge function
      const verifyResponse = await supabase.functions.invoke('verify-sms-otp', {
        body: { phone: loginPhone, otp, type: 'login_otp' }
      });

      if (verifyResponse.error || !verifyResponse.data?.success) {
        toast.error(verifyResponse.data?.error || 'Invalid verification code');
        setLoading(false);
        return;
      }

      // If we got a verification link, use it to complete login
      if (verifyResponse.data?.verificationLink) {
        // Extract the token from the magic link and verify the OTP token
        const linkUrl = new URL(verifyResponse.data.verificationLink);
        const token = linkUrl.searchParams.get('token');
        const type = linkUrl.searchParams.get('type');
        
        if (token && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as 'magiclink',
          });
          
          if (error) {
            toast.error('Login failed. Please try again.');
          } else {
            toast.success('Welcome to CardBoom!');
          }
        } else {
          toast.error('Login failed. Please try again.');
        }
      } else {
        toast.error('Login failed. No account found with this phone.');
      }
    } catch (err) {
      toast.error('Verification failed');
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
          display_name: email.split('@')[0],
          account_type: 'both', // Default to both buyer and seller
          phone: phone,
          national_id: nationalId,
          referred_by_code: referralCode || null,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message);
      }
      setLoading(false);
    } else {
      // Track signup event for retargeting pixels
      trackSignUpEvent('email');
      toast.success('Account created successfully! Welcome to Cardboom!');
      setLoading(false);
      // Redirect to success page for conversion tracking
      navigate('/signup-success');
    }
  };

  // Forgot password handlers - Email method
  const handleSendResetEmail = async () => {
    const emailResult = emailSchema.safeParse(resetEmail);
    if (!emailResult.success) {
      setErrors({ resetEmail: emailResult.error.errors[0].message });
      return;
    }
    setErrors({});
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password reset link sent to your email!');
        setForgotPasswordMode(false);
        setResetEmail('');
      }
    } catch (err) {
      toast.error('Failed to send reset email');
    }
    setLoading(false);
  };

  // Forgot password handlers - Phone method
  const handleSendResetOtp = async () => {
    if (!resetPhone || resetPhone.length < 10) {
      setErrors({ resetPhone: 'Please enter a valid phone number' });
      return;
    }
    setErrors({});
    
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('send-sms', {
        body: { phone: resetPhone, type: 'password_reset' }
      });

      if (response.error || !response.data?.success) {
        toast.error(response.data?.error || 'Failed to send verification code');
      } else {
        setResetOtpSent(true);
        toast.success('Reset code sent from CARDBOOM!');
      }
    } catch (err) {
      toast.error('Failed to send verification code');
    }
    setLoading(false);
  };

  const handleVerifyResetOtp = async () => {
    const otpResult = otpSchema.safeParse(resetOtp);
    if (!otpResult.success) {
      setErrors({ resetOtp: otpResult.error.errors[0].message });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const verifyResponse = await supabase.functions.invoke('verify-sms-otp', {
        body: { phone: resetPhone, otp: resetOtp, type: 'password_reset' }
      });

      if (verifyResponse.error || !verifyResponse.data?.success) {
        toast.error(verifyResponse.data?.error || 'Invalid verification code');
      } else {
        setResetVerified(true);
        toast.success('Phone verified! Enter your new password.');
      }
    } catch (err) {
      toast.error('Verification failed');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordResult = passwordSchema.safeParse(newPassword);
    if (!passwordResult.success) {
      setErrors({ newPassword: passwordResult.error.errors[0].message });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      // Phone should already be in E.164 format from PhoneInputWithCountry
      let formattedPhone = resetPhone;
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

      // Find user by phone number
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('phone', formattedPhone)
        .single();

      if (!profile?.email) {
        toast.error('No account found with this phone number');
        setLoading(false);
        return;
      }

      // Use Supabase admin to update password (requires email flow)
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password reset link sent to your email!');
        setForgotPasswordMode(false);
        setResetPhone('');
        setResetOtp('');
        setResetOtpSent(false);
        setResetVerified(false);
        setNewPassword('');
      }
    } catch (err) {
      toast.error('Password reset failed');
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
      {/* Video Background - Rotating */}
      <div className="absolute inset-0 z-0">
        {AUTH_VIDEOS.map((video, index) => (
          <video
            key={video}
            autoPlay
            loop
            muted
            playsInline
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-1000 ${
              index === currentVideoIndex ? 'opacity-30' : 'opacity-0'
            }`}
          >
            <source src={video} type="video/mp4" />
          </video>
        ))}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90" />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-[1]">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 z-[2] bg-[linear-gradient(hsl(var(--border)/0.2)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.2)_1px,transparent_1px)] bg-[size:60px_60px]" />

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
            {t.auth.backToHome}
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
              {/* Logo - Extra Large and Centered directly above features */}
              <div className="flex justify-center mb-4">
                <img 
                  src={isDark ? cardboomLogoDark : cardboomLogo} 
                  alt="Cardboom" 
                  width={384}
                  height={384}
                  className="h-64 lg:h-80 xl:h-96 w-auto object-contain"
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
                  { label: 'Total Card Value', value: platformStats.isLoading ? '...' : formatStatValue(platformStats.totalCardValue, '$') },
                  { label: 'Items Listed', value: platformStats.isLoading ? '...' : formatStatValue(platformStats.itemsListed) },
                  { label: 'Total Volume', value: platformStats.isLoading ? '...' : formatStatValue(platformStats.totalVolume, '$') },
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
            {/* Mobile Logo - Compact and positioned at top */}
            <div className="text-center mb-4 lg:hidden">
              <img 
                src={isDark ? cardboomLogoDark : cardboomLogo} 
                alt="Cardboom" 
                width={80}
                height={80}
                className="h-16 md:h-20 w-auto object-contain mx-auto"
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
                    {t.auth.signIn}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium transition-all"
                  >
                    {t.auth.register}
                  </TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <div className="space-y-5">
                    {forgotPasswordMode ? (
                      /* Forgot Password Flow */
                      <div className="space-y-4">
                        <div className="text-center mb-4">
                          <h3 className="text-lg font-semibold text-foreground">Reset Password</h3>
                          <p className="text-sm text-muted-foreground">Choose how you'd like to reset your password</p>
                        </div>

                        {/* Method Toggle */}
                        <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl">
                          <button
                            type="button"
                            onClick={() => { setResetMethod('email'); setResetOtpSent(false); }}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                              resetMethod === 'email' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Mail className="w-4 h-4" />
                            Email
                          </button>
                          <button
                            type="button"
                            onClick={() => { setResetMethod('phone'); setResetOtpSent(false); }}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                              resetMethod === 'phone' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Phone className="w-4 h-4" />
                            Phone
                          </button>
                        </div>

                        {resetMethod === 'email' ? (
                          /* Email Reset */
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="reset-email" className="text-foreground font-medium">Email Address</Label>
                              <Input
                                id="reset-email"
                                type="email"
                                placeholder="your@email.com"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="h-12 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
                              />
                              {errors.resetEmail && <p className="text-destructive text-sm">{errors.resetEmail}</p>}
                            </div>
                            <Button
                              type="button"
                              onClick={handleSendResetEmail}
                              disabled={loading || !resetEmail}
                              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 font-semibold rounded-xl"
                            >
                              {loading ? 'Sending...' : 'Send Reset Link'}
                            </Button>
                          </div>
                        ) : !resetOtpSent ? (
                          /* Phone Reset - Enter Number */
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-foreground font-medium">Phone Number</Label>
                              <PhoneInputWithCountry
                                value={resetPhone}
                                onChange={(fullNumber, countryCode) => {
                                  setResetPhone(fullNumber);
                                  setResetCountryCode(countryCode);
                                }}
                                placeholder="5XX XXX XX XX"
                                error={errors.resetPhone}
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={handleSendResetOtp}
                              disabled={loading || !resetPhone}
                              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 font-semibold rounded-xl"
                            >
                              {loading ? 'Sending...' : 'Send Verification Code'}
                            </Button>
                          </div>
                        ) : !resetVerified ? (
                          /* Phone Reset - Enter OTP */
                          <div className="space-y-5">
                            <div className="text-center space-y-2">
                              <Label className="text-foreground font-medium text-lg">Enter Verification Code</Label>
                              <p className="text-muted-foreground text-sm">
                                We sent a 6-digit code to <span className="text-foreground font-medium">{resetPhone}</span>
                              </p>
                            </div>
                            
                            <OTPInput
                              value={resetOtp}
                              onChange={setResetOtp}
                              length={6}
                              error={errors.resetOtp}
                              autoFocus
                            />
                            
                            <Button
                              type="button"
                              onClick={handleVerifyResetOtp}
                              disabled={loading || resetOtp.length !== 6}
                              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 font-semibold rounded-xl"
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                'Verify Code'
                              )}
                            </Button>
                            
                            <div className="flex items-center justify-between text-sm">
                              <button
                                type="button"
                                onClick={handleSendResetOtp}
                                disabled={loading}
                                className="text-primary hover:text-primary/80 transition-colors"
                              >
                                Resend code
                              </button>
                              <button
                                type="button"
                                onClick={() => setResetOtpSent(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Change number
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Phone Reset - Verified */
                          <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                              <p className="text-green-500 text-sm font-medium">✓ Phone verified successfully</p>
                            </div>
                            <p className="text-muted-foreground text-sm text-center">
                              A password reset link will be sent to the email associated with this phone number.
                            </p>
                            <Button
                              type="submit"
                              disabled={loading}
                              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 font-semibold rounded-xl"
                            >
                              {loading ? 'Sending...' : 'Send Reset Link'}
                            </Button>
                          </form>
                        )}
                        
                        <button
                          type="button"
                          onClick={() => {
                            setForgotPasswordMode(false);
                            setResetEmail('');
                            setResetPhone('');
                            setResetOtp('');
                            setResetOtpSent(false);
                            setResetVerified(false);
                          }}
                          className="w-full text-muted-foreground hover:text-foreground text-sm"
                        >
                          ← Back to login
                        </button>
                      </div>
                    ) : (
                      /* Normal Login Flow */
                      <>
                    {/* Google Sign In */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full h-12 border-border/50 hover:bg-secondary/50 rounded-xl flex items-center justify-center gap-3"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {t.auth.continueWithGoogle}
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/50" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">{t.auth.orContinueWith}</span>
                      </div>
                    </div>

                    {/* Login Method Toggle */}
                    <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl">
                      <button
                        type="button"
                        onClick={() => { setLoginMethod('email'); setOtpSent(false); setMagicLinkSent(false); }}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                          loginMethod === 'email' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Password
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLoginMethod('magic-link'); setOtpSent(false); }}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                          loginMethod === 'magic-link' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Link className="w-3 h-3" />
                        Magic Link
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLoginMethod('phone'); setOtpSent(false); setMagicLinkSent(false); }}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                          loginMethod === 'phone' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        Phone
                      </button>
                    </div>

                    {loginMethod === 'magic-link' ? (
                      <div className="space-y-4">
                        {!magicLinkSent ? (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="magic-email" className="text-foreground font-medium">Email</Label>
                              <Input
                                id="magic-email"
                                type="email"
                                placeholder="your@email.com"
                                value={magicLinkEmail}
                                onChange={(e) => setMagicLinkEmail(e.target.value)}
                                className="h-12 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
                              />
                              {errors.magicLinkEmail && <p className="text-destructive text-sm">{errors.magicLinkEmail}</p>}
                            </div>
                            <Button
                              type="button"
                              onClick={handleMagicLink}
                              disabled={loading || !magicLinkEmail}
                              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 font-semibold rounded-xl"
                            >
                              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : 'Send Magic Link'}
                            </Button>
                          </>
                        ) : (
                          <div className="text-center space-y-4 py-4">
                            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                              <Mail className="w-8 h-8 text-green-500" />
                            </div>
                            <p className="text-muted-foreground">Check your email for the magic link!</p>
                            <button onClick={() => setMagicLinkSent(false)} className="text-primary text-sm">Send again</button>
                          </div>
                        )}
                      </div>
                    ) : loginMethod === 'email' ? (
                      <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="login-email" className="text-foreground font-medium">{t.auth.email}</Label>
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
                          <Label htmlFor="login-password" className="text-foreground font-medium">{t.auth.password}</Label>
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
                        
                        {/* Remember Me Checkbox */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="remember-me"
                            checked={rememberMe}
                            onCheckedChange={(checked) => setRememberMe(checked === true)}
                          />
                          <label
                            htmlFor="remember-me"
                            className="text-sm text-muted-foreground cursor-pointer select-none"
                          >
                            Remember me on this device
                          </label>
                        </div>
                        
                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-semibold text-lg rounded-xl shadow-lg hover:shadow-glow transition-all"
                        >
                          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.auth.signIn}...</> : t.auth.signIn}
                        </Button>
                      </form>
                    ) : (
                      <div className="space-y-5">
                        {!otpSent ? (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="login-phone" className="text-foreground font-medium flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                {t.auth.phone}
                              </Label>
                              <PhoneInputWithCountry
                                value={loginPhone}
                                onChange={(fullNumber) => setLoginPhone(fullNumber)}
                                placeholder="Phone number"
                                error={errors.loginPhone}
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={handleSendOtp}
                              disabled={loading || !loginPhone}
                              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-semibold text-lg rounded-xl shadow-lg hover:shadow-glow transition-all"
                            >
                              {loading ? 'Sending...' : 'Send OTP Code'}
                            </Button>
                          </div>
                        ) : (
                          <form onSubmit={handleVerifyOtp} className="space-y-5">
                            <div className="space-y-4">
                              <div className="text-center">
                                <Label className="text-foreground font-medium text-lg">Enter Verification Code</Label>
                                <p className="text-muted-foreground text-sm mt-1">
                                  We sent a 6-digit code to <span className="text-foreground font-medium">{loginPhone}</span>
                                </p>
                              </div>
                              
                              <OTPInput
                                value={otp}
                                onChange={setOtp}
                                length={6}
                                error={errors.otp}
                                autoFocus
                              />
                            </div>
                            
                            <Button
                              type="submit"
                              disabled={loading || otp.length !== 6}
                              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-semibold text-lg rounded-xl shadow-lg hover:shadow-glow transition-all"
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                'Verify & Sign In'
                              )}
                            </Button>
                            
                            <div className="flex items-center justify-between text-sm">
                              <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={loading}
                                className="text-primary hover:text-primary/80 transition-colors"
                              >
                                Resend code
                              </button>
                              <button
                                type="button"
                                onClick={() => { setOtpSent(false); setOtp(''); }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Change number
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                    
                    {/* Forgot Password Link */}
                    {!forgotPasswordMode && loginMethod === 'email' && (
                      <button
                        type="button"
                        onClick={() => setForgotPasswordMode(true)}
                        className="w-full text-muted-foreground hover:text-primary text-sm transition-colors"
                      >
                        Forgot your password?
                      </button>
                    )}
                    </>
                    )}
                  </div>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    {/* Google Sign Up - Premium styling */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full h-14 border-border/50 hover:bg-secondary/50 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span className="font-medium">{t.auth.continueWithGoogle}</span>
                    </Button>

                    {/* Divider */}
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/30" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-card px-4 text-xs text-muted-foreground uppercase tracking-wider">or create with email</span>
                      </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSignUp} className="space-y-4">
                      {/* Early Access Benefits - Compact */}
                      <div className="flex items-center justify-center gap-6 py-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-primary" /> 500 XP Bonus
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Star className="w-3 h-3 text-accent" /> Beta Badge
                        </span>
                        <span className="flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3 text-primary" /> Reduced Fees
                        </span>
                      </div>

                      {/* Email & Password in seamless group */}
                      <div className="space-y-3">
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="register-email"
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-12 pl-11 bg-secondary/30 border-border/30 focus:border-primary/50 rounded-xl transition-all"
                            required
                          />
                        </div>
                        {errors.email && <p className="text-destructive text-xs px-1">{errors.email}</p>}
                        
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="register-password"
                            type="password"
                            placeholder="Password (min 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-12 pl-11 bg-secondary/30 border-border/30 focus:border-primary/50 rounded-xl transition-all"
                            required
                          />
                        </div>
                        {errors.password && <p className="text-destructive text-xs px-1">{errors.password}</p>}
                      </div>

                      {/* Phone & National ID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-medium">{t.auth.phone}</Label>
                          <PhoneInputWithCountry
                            value={phone}
                            onChange={(fullNumber) => setPhone(fullNumber)}
                            placeholder="Phone number"
                            error={errors.phone}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-medium">{t.auth.nationalId}</Label>
                          <Input
                            id="register-national-id"
                            type="text"
                            placeholder={t.auth.nationalIdPlaceholder}
                            value={nationalId}
                            onChange={(e) => setNationalId(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 20))}
                            className="h-12 bg-secondary/30 border-border/30 focus:border-primary/50 rounded-xl"
                            maxLength={20}
                            required
                          />
                          {errors.nationalId && <p className="text-destructive text-xs">{errors.nationalId}</p>}
                        </div>
                      </div>

                      {/* Referral Code - Compact */}
                      <div className="relative">
                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent/60" />
                        <Input
                          id="register-referral"
                          type="text"
                          placeholder="Referral code (optional)"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
                          className="h-12 pl-11 bg-secondary/30 border-border/30 focus:border-primary/50 rounded-xl"
                          maxLength={12}
                        />
                      </div>

                      {/* Agreements Section - Compact & Seamless */}
                      <div className="space-y-2 pt-2">
                        <p className="text-xs text-muted-foreground font-medium px-1">Agreements</p>
                        
                        {/* All Terms Combined */}
                        <label className="flex items-start gap-3 p-3 rounded-xl bg-secondary/20 border border-border/20 cursor-pointer hover:bg-secondary/30 transition-colors">
                          <Checkbox
                            checked={acceptedTerms}
                            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                            className="mt-0.5 shrink-0"
                          />
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            I agree to the{' '}
                            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms</a>,{' '}
                            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy</a>,{' '}
                            <a href="/kvkk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">KVKK</a> &{' '}
                            <a href="/mesafeli-satis-sozlesmesi" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Distance Sales</a>
                          </span>
                        </label>
                        {errors.terms && <p className="text-destructive text-xs px-1">{t.auth.termsError}</p>}
                        
                        {/* Fees */}
                        <label className="flex items-start gap-3 p-3 rounded-xl bg-secondary/20 border border-border/20 cursor-pointer hover:bg-secondary/30 transition-colors">
                          <Checkbox
                            checked={acceptedFees}
                            onCheckedChange={(checked) => setAcceptedFees(checked === true)}
                            className="mt-0.5 shrink-0"
                          />
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            I accept{' '}
                            <a href="/pricing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform fees</a>:{' '}
                            <span className="text-foreground/80">Card 6.5%, Wire 3%, Seller 5%</span>
                          </span>
                        </label>
                        {errors.fees && <p className="text-destructive text-xs px-1">{t.auth.feesError}</p>}
                        
                        {/* Consignment */}
                        <label className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors">
                          <Checkbox
                            checked={acceptedConsignment}
                            onCheckedChange={(checked) => setAcceptedConsignment(checked === true)}
                            className="mt-0.5 shrink-0"
                          />
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            <span className="text-foreground font-medium">{t.auth.consignmentAgreement}</span>{' '}
                            <a href="/consignment-agreement" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">({t.auth.consignmentLink})</a>
                          </span>
                        </label>
                        {errors.consignment && <p className="text-destructive text-xs px-1">{t.auth.consignmentError}</p>}
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-semibold text-base rounded-2xl shadow-lg hover:shadow-glow transition-all hover:scale-[1.02]"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Create Account
                          </>
                        )}
                      </Button>
                    </form>
                  </motion.div>
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