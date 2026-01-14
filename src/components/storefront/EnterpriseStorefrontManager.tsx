import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Store,
  Upload,
  Palette,
  Megaphone,
  BarChart3,
  Shield,
  Crown,
  Save,
  Image,
  Link as LinkIcon,
  Sparkles,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

export const EnterpriseStorefrontManager = () => {
  const queryClient = useQueryClient();
  const { isEnterprise, isPro } = useSubscription();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    display_name: '',
    tagline: '',
    description: '',
    theme_color: '#8B5CF6',
    accent_color: '#F97316',
    announcement_text: '',
    announcement_active: false,
    show_trust_badge: true,
    social_links: {} as Record<string, string>,
  });

  // Fetch user's storefront
  const { data: storefront, isLoading } = useQuery({
    queryKey: ['my-storefront'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('creator_storefronts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setFormData({
          display_name: data.display_name || '',
          tagline: data.tagline || '',
          description: data.description || '',
          theme_color: data.theme_color || '#8B5CF6',
          accent_color: data.accent_color || '#F97316',
          announcement_text: data.announcement_text || '',
          announcement_active: data.announcement_active || false,
          show_trust_badge: data.show_trust_badge ?? true,
          social_links: (data.social_links as Record<string, string>) || {},
        });
      }
      return data;
    },
  });

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ['storefront-analytics', storefront?.id],
    queryFn: async () => {
      if (!storefront?.user_id) return null;
      
      const { data, error } = await supabase
        .from('creator_analytics')
        .select('*')
        .eq('creator_id', storefront.creator_id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) return null;
      return data;
    },
    enabled: !!storefront?.creator_id && isEnterprise,
  });

  // Update storefront mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!storefront?.id) throw new Error('No storefront found');
      
      const { error } = await supabase
        .from('creator_storefronts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', storefront.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-storefront'] });
      toast.success('Storefront updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update storefront');
      console.error(error);
    },
  });

  // Handle image upload
  const handleImageUpload = async (file: File, type: 'banner' | 'logo') => {
    if (!storefront?.id) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${storefront.id}/${type}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('storefront-assets')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error(`Failed to upload ${type}`);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('storefront-assets')
      .getPublicUrl(fileName);

    const updateField = type === 'banner' ? 'banner_url' : 'logo_url';
    await updateMutation.mutateAsync({ [updateField]: publicUrl });
  };

  const handleSave = () => {
    updateMutation.mutate({
      display_name: formData.display_name,
      tagline: formData.tagline,
      description: formData.description,
      theme_color: formData.theme_color,
      accent_color: formData.accent_color,
      announcement_text: formData.announcement_text,
      announcement_active: formData.announcement_active,
      show_trust_badge: formData.show_trust_badge,
      social_links: formData.social_links,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!storefront) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Storefront Found</h3>
          <p className="text-muted-foreground mb-4">
            Create your storefront to start selling on CardBoom.
          </p>
          {!isEnterprise && (
            <div className="flex items-center justify-center gap-2 text-amber-500">
              <Crown className="w-4 h-4" />
              <span className="text-sm">Enterprise subscription required for full features</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const totalViews = analytics?.reduce((sum, a) => sum + (a.page_views || 0), 0) || 0;
  const totalFollowers = analytics?.reduce((sum, a) => sum + (a.new_followers || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6" />
            My Storefront
          </h1>
          <p className="text-muted-foreground">
            Customize your storefront to attract more buyers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEnterprise && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
              <Crown className="w-3 h-3 mr-1" />
              Enterprise
            </Badge>
          )}
          {isPro && !isEnterprise && (
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
              <Sparkles className="w-3 h-3 mr-1" />
              Pro
            </Badge>
          )}
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="branding">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding" className="gap-2">
            <Image className="w-4 h-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="customization" className="gap-2" disabled={!isEnterprise && !isPro}>
            <Palette className="w-4 h-4" />
            Customize
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2" disabled={!isEnterprise}>
            <Megaphone className="w-4 h-4" />
            Announce
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2" disabled={!isEnterprise}>
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6 mt-6">
          {/* Banner Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Cover Banner
                {isEnterprise && (
                  <Badge variant="outline" className="ml-2 text-amber-500 border-amber-500">
                    Enterprise
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Upload a custom banner image for your storefront (recommended: 1200x400px)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="relative h-48 rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20 overflow-hidden cursor-pointer group"
                onClick={() => isEnterprise && bannerInputRef.current?.click()}
                style={storefront.banner_url ? {
                  backgroundImage: `url(${storefront.banner_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                } : {}}
              >
                {isEnterprise ? (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-center text-white">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <span>Click to upload banner</span>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Crown className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                      <span>Upgrade to Enterprise for custom banners</span>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'banner');
                }}
              />
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Store Logo
              </CardTitle>
              <CardDescription>
                Upload your store logo (recommended: 200x200px)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div 
                className="relative w-24 h-24 rounded-full bg-muted overflow-hidden cursor-pointer group"
                onClick={() => logoInputRef.current?.click()}
              >
                {storefront.logo_url ? (
                  <img src={storefront.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                    {formData.display_name[0] || 'S'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <Label>Store Name</Label>
                  <Input
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Your Store Name"
                  />
                </div>
                <div>
                  <Label>Tagline</Label>
                  <Input
                    value={formData.tagline}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                    placeholder="Premium cards, trusted seller"
                  />
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'logo');
                }}
              />
            </CardContent>
          </Card>

          {/* Description & Social Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                About & Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Store Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell buyers about your store, what you specialize in, and why they should buy from you..."
                  rows={4}
                />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Twitter/X</Label>
                  <Input
                    value={formData.social_links.twitter || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      social_links: { ...prev.social_links, twitter: e.target.value }
                    }))}
                    placeholder="https://twitter.com/yourhandle"
                  />
                </div>
                <div>
                  <Label>YouTube</Label>
                  <Input
                    value={formData.social_links.youtube || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      social_links: { ...prev.social_links, youtube: e.target.value }
                    }))}
                    placeholder="https://youtube.com/@yourchannel"
                  />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <Input
                    value={formData.social_links.instagram || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      social_links: { ...prev.social_links, instagram: e.target.value }
                    }))}
                    placeholder="https://instagram.com/yourhandle"
                  />
                </div>
                <div>
                  <Label>TikTok</Label>
                  <Input
                    value={formData.social_links.tiktok || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      social_links: { ...prev.social_links, tiktok: e.target.value }
                    }))}
                    placeholder="https://tiktok.com/@yourhandle"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customization Tab (Pro/Enterprise) */}
        <TabsContent value="customization" className="space-y-6 mt-6">
          {!isEnterprise && !isPro ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Palette className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Upgrade to Customize</h3>
                <p className="text-muted-foreground mb-4">
                  Pro and Enterprise users can customize their storefront colors and appearance.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Brand Colors
                  </CardTitle>
                  <CardDescription>
                    Set your brand colors to match your identity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label>Primary Color</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="color"
                          value={formData.theme_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, theme_color: e.target.value }))}
                          className="w-12 h-12 rounded cursor-pointer"
                        />
                        <Input
                          value={formData.theme_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, theme_color: e.target.value }))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Accent Color</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="color"
                          value={formData.accent_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                          className="w-12 h-12 rounded cursor-pointer"
                        />
                        <Input
                          value={formData.accent_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Preview */}
                  <div className="mt-6 p-6 rounded-lg border-2" style={{ borderColor: formData.theme_color }}>
                    <h4 className="font-semibold mb-2" style={{ color: formData.theme_color }}>
                      Preview: {formData.display_name || 'Your Store'}
                    </h4>
                    <p className="text-muted-foreground text-sm mb-4">{formData.tagline || 'Your tagline here'}</p>
                    <Button style={{ backgroundColor: formData.accent_color }}>
                      Shop Now
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Trust & Visibility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Trust Badge</Label>
                      <p className="text-sm text-muted-foreground">Display your seller trust score on your storefront</p>
                    </div>
                    <Switch
                      checked={formData.show_trust_badge}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_trust_badge: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Announcements Tab (Enterprise) */}
        <TabsContent value="announcements" className="space-y-6 mt-6">
          {!isEnterprise ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Enterprise Feature</h3>
                <p className="text-muted-foreground mb-4">
                  Post announcements to your storefront with an Enterprise subscription.
                </p>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                  <Crown className="w-3 h-3 mr-1" />
                  Upgrade to Enterprise
                </Badge>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Store Announcement
                  <Badge className="ml-2 bg-amber-500/10 text-amber-500">Enterprise</Badge>
                </CardTitle>
                <CardDescription>
                  Display an announcement banner at the top of your storefront
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Announcement</Label>
                    <p className="text-sm text-muted-foreground">Show announcement banner to visitors</p>
                  </div>
                  <Switch
                    checked={formData.announcement_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, announcement_active: checked }))}
                  />
                </div>
                <div>
                  <Label>Announcement Text</Label>
                  <Textarea
                    value={formData.announcement_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, announcement_text: e.target.value }))}
                    placeholder="🎉 Free shipping on orders over $100! Limited time offer..."
                    rows={3}
                  />
                </div>
                {formData.announcement_active && formData.announcement_text && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <p className="text-sm font-medium">{formData.announcement_text}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab (Enterprise) */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          {!isEnterprise ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Enterprise Feature</h3>
                <p className="text-muted-foreground mb-4">
                  Get detailed analytics about your storefront performance.
                </p>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                  <Crown className="w-3 h-3 mr-1" />
                  Upgrade to Enterprise
                </Badge>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Eye className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Views</p>
                      <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-500/10">
                      <TrendingUp className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sales</p>
                      <p className="text-2xl font-bold">{storefront.total_sales || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-purple-500/10">
                      <Crown className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">New Followers</p>
                      <p className="text-2xl font-bold">{totalFollowers.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View Storefront Button */}
      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <a href={`/store/${storefront.slug}`} target="_blank" rel="noopener noreferrer">
            <Eye className="w-4 h-4 mr-2" />
            View My Storefront
          </a>
        </Button>
      </div>
    </div>
  );
};
