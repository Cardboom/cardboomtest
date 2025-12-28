import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Upload, 
  Video, 
  RefreshCw, 
  Sparkles,
  Eye,
  Heart,
  MessageCircle,
  Trash2,
  Play,
  Shuffle
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { formatDistanceToNow } from 'date-fns';

interface FanAccount {
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
  account_type: string;
  created_at: string;
  reels_count?: number;
  total_views?: number;
  total_likes?: number;
}

interface Reel {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  user_id: string;
}

export function FanAccountsManager() {
  const [fanAccounts, setFanAccounts] = useState<FanAccount[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isUploadingVideos, setIsUploadingVideos] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // New account form
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountBio, setNewAccountBio] = useState('');
  
  // Batch upload form
  const [videoUrls, setVideoUrls] = useState('');
  const [videoTitles, setVideoTitles] = useState('');
  const [distributeAcrossAccounts, setDistributeAcrossAccounts] = useState(true);
  const [uploadAccountId, setUploadAccountId] = useState<string>('');

  // Fetch fan accounts (accounts created by admins for engagement)
  const fetchFanAccounts = async () => {
    setIsLoading(true);
    try {
      // Fetch profiles that have fan-style names or are marked specially
      // For now, we'll fetch accounts with specific naming patterns or all for selection
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email, account_type, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get reel counts for each account
      const accountIds = profiles?.map(p => p.id) || [];
      
      if (accountIds.length > 0) {
        const { data: reelStats } = await supabase
          .from('card_reels')
          .select('user_id, view_count, like_count')
          .in('user_id', accountIds);

        const statsMap = new Map<string, { count: number; views: number; likes: number }>();
        reelStats?.forEach(r => {
          const existing = statsMap.get(r.user_id) || { count: 0, views: 0, likes: 0 };
          statsMap.set(r.user_id, {
            count: existing.count + 1,
            views: existing.views + (r.view_count || 0),
            likes: existing.likes + (r.like_count || 0),
          });
        });

        const accountsWithStats = profiles?.map(p => ({
          ...p,
          reels_count: statsMap.get(p.id)?.count || 0,
          total_views: statsMap.get(p.id)?.views || 0,
          total_likes: statsMap.get(p.id)?.likes || 0,
        })) || [];

        setFanAccounts(accountsWithStats);
      } else {
        setFanAccounts([]);
      }
    } catch (error) {
      console.error('Error fetching fan accounts:', error);
      toast.error('Failed to fetch accounts');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch reels for selected account
  const fetchAccountReels = async (accountId: string) => {
    try {
      const { data, error } = await supabase
        .from('card_reels')
        .select('*')
        .eq('user_id', accountId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReels(data || []);
    } catch (error) {
      console.error('Error fetching reels:', error);
      toast.error('Failed to fetch reels');
    }
  };

  useEffect(() => {
    fetchFanAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchAccountReels(selectedAccount);
    } else {
      setReels([]);
    }
  }, [selectedAccount]);

  // Create a new fan account profile
  const handleCreateFanAccount = async () => {
    if (!newAccountName || !newAccountEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreatingAccount(true);
    try {
      // Generate a unique ID for the fan account
      const fanId = crypto.randomUUID();
      
      // Create the profile directly (without auth user)
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: fanId,
          display_name: newAccountName,
          email: newAccountEmail,
          bio: newAccountBio,
          account_type: 'buyer', // Default type
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success(`Fan account "${newAccountName}" created!`);
      setShowCreateDialog(false);
      setNewAccountName('');
      setNewAccountEmail('');
      setNewAccountBio('');
      fetchFanAccounts();
    } catch (error) {
      console.error('Error creating fan account:', error);
      toast.error('Failed to create fan account');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Batch upload videos - distribute across fan accounts
  const handleBatchUpload = async () => {
    const urls = videoUrls.split('\n').filter(url => url.trim());
    const titles = videoTitles.split('\n').filter(title => title.trim());

    if (urls.length === 0) {
      toast.error('Please provide at least one video URL');
      return;
    }

    // Get available fan accounts for distribution
    const availableAccounts = fanAccounts.filter(a => a.display_name || a.email);
    
    if (availableAccounts.length === 0) {
      toast.error('No fan accounts available. Please create some first.');
      return;
    }

    // If not distributing, require a selected account
    if (!distributeAcrossAccounts && !uploadAccountId) {
      toast.error('Please select an account or enable distribution');
      return;
    }

    setIsUploadingVideos(true);
    try {
      const reelsToInsert = urls.map((url, index) => {
        // Distribute videos round-robin across accounts if enabled
        const accountId = distributeAcrossAccounts 
          ? availableAccounts[index % availableAccounts.length].id
          : uploadAccountId;
        
        return {
          user_id: accountId,
          video_url: url.trim(),
          title: titles[index]?.trim() || `Boom Reel #${index + 1}`,
          description: null,
          is_active: true,
          is_featured: false,
          view_count: Math.floor(Math.random() * 500) + 50, // Initial engagement
          like_count: Math.floor(Math.random() * 100) + 10,
          comment_count: Math.floor(Math.random() * 20),
          share_count: Math.floor(Math.random() * 10),
          save_count: Math.floor(Math.random() * 15),
          trending_score: Math.random() * 50,
          hashtags: ['cardboom', 'tcg', 'collectibles'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('card_reels')
        .insert(reelsToInsert);

      if (error) throw error;

      const accountsUsed = distributeAcrossAccounts 
        ? Math.min(urls.length, availableAccounts.length)
        : 1;
      
      toast.success(`Uploaded ${urls.length} videos across ${accountsUsed} account(s)!`);
      setShowUploadDialog(false);
      setVideoUrls('');
      setVideoTitles('');
      setUploadAccountId('');
      fetchFanAccounts();
      if (selectedAccount) {
        fetchAccountReels(selectedAccount);
      }
    } catch (error) {
      console.error('Error uploading videos:', error);
      toast.error('Failed to upload videos');
    } finally {
      setIsUploadingVideos(false);
    }
  };

  // Delete a reel
  const handleDeleteReel = async (reelId: string) => {
    try {
      const { error } = await supabase
        .from('card_reels')
        .delete()
        .eq('id', reelId);

      if (error) throw error;

      toast.success('Reel deleted');
      setReels(prev => prev.filter(r => r.id !== reelId));
    } catch (error) {
      console.error('Error deleting reel:', error);
      toast.error('Failed to delete reel');
    }
  };

  const selectedAccountData = fanAccounts.find(a => a.id === selectedAccount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Fan Accounts & Boom Reels
          </h2>
          <p className="text-muted-foreground">Manage fan accounts and batch upload videos for engagement</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                New Fan Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Fan Account</DialogTitle>
                <DialogDescription>
                  Create a new account to upload engaging content
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name *</Label>
                  <Input
                    id="name"
                    placeholder="CardCollector_Fan"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="fan@cardboom.internal"
                    value={newAccountEmail}
                    onChange={(e) => setNewAccountEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Passionate card collector..."
                    value={newAccountBio}
                    onChange={(e) => setNewAccountBio(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFanAccount} disabled={isCreatingAccount}>
                  {isCreatingAccount ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="w-4 h-4" />
                Batch Upload Videos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Batch Upload Videos</DialogTitle>
                <DialogDescription>
                  Upload multiple videos - automatically distributed across fan accounts
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Distribute toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <Shuffle className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Distribute across all fan accounts</p>
                      <p className="text-xs text-muted-foreground">Videos will be evenly spread across accounts</p>
                    </div>
                  </div>
                  <Switch 
                    checked={distributeAcrossAccounts} 
                    onCheckedChange={setDistributeAcrossAccounts}
                  />
                </div>

                {/* Only show account selector if not distributing */}
                {!distributeAcrossAccounts && (
                  <div className="space-y-2">
                    <Label>Select Account *</Label>
                    <Select value={uploadAccountId} onValueChange={setUploadAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an account" />
                      </SelectTrigger>
                      <SelectContent>
                        {fanAccounts.map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.display_name || account.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="urls">Video URLs (one per line) *</Label>
                  <Textarea
                    id="urls"
                    placeholder="https://example.com/video1.mp4&#10;https://example.com/video2.mp4&#10;https://example.com/video3.mp4"
                    value={videoUrls}
                    onChange={(e) => setVideoUrls(e.target.value)}
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titles">Video Titles (one per line, optional)</Label>
                  <Textarea
                    id="titles"
                    placeholder="My first unboxing&#10;Rare card reveal&#10;Collection tour"
                    value={videoTitles}
                    onChange={(e) => setVideoTitles(e.target.value)}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    If fewer titles than URLs, generic titles will be used
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBatchUpload} disabled={isUploadingVideos}>
                  {isUploadingVideos ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload {videoUrls.split('\n').filter(u => u.trim()).length} Videos
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="icon" onClick={fetchFanAccounts}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Accounts</p>
                <p className="text-2xl font-bold">{fanAccounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Video className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reels</p>
                <p className="text-2xl font-bold">
                  {fanAccounts.reduce((sum, a) => sum + (a.reels_count || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">
                  {fanAccounts.reduce((sum, a) => sum + (a.total_views || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Likes</p>
                <p className="text-2xl font-bold">
                  {fanAccounts.reduce((sum, a) => sum + (a.total_likes || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Accounts List */}
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Fan Accounts</CardTitle>
            <CardDescription>Click to view and manage reels</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : fanAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No accounts yet</p>
                <p className="text-sm">Create a fan account to get started</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {fanAccounts.map(account => (
                  <div
                    key={account.id}
                    onClick={() => setSelectedAccount(account.id === selectedAccount ? null : account.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedAccount === account.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {account.avatar_url ? (
                            <img src={account.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{account.display_name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">{account.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          {account.reels_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {(account.total_views || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Account Reels */}
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedAccountData ? `${selectedAccountData.display_name}'s Reels` : 'Select an Account'}
            </CardTitle>
            <CardDescription>
              {selectedAccountData
                ? `${reels.length} videos uploaded`
                : 'Click an account to view its reels'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedAccount ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select an account to view reels</p>
              </div>
            ) : reels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No reels yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setUploadAccountId(selectedAccount);
                    setShowUploadDialog(true);
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Videos
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {reels.map(reel => (
                  <div
                    key={reel.id}
                    className="p-3 rounded-lg border border-border hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                          {reel.thumbnail_url ? (
                            <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Play className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{reel.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(reel.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {reel.view_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {reel.like_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {reel.comment_count}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteReel(reel.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
