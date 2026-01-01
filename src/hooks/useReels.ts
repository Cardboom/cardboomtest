import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  title: string;
  description: string | null;
  tagged_card_id: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  save_count: number;
  duration_seconds: number | null;
  is_featured: boolean;
  trending_score: number;
  hashtags: string[];
  sound_name: string | null;
  created_at: string;
  user?: {
    id?: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  tagged_card?: {
    name: string;
    image_url: string | null;
    current_price: number;
    category: string;
  };
  is_liked?: boolean;
  is_saved?: boolean;
}

export interface ReelComment {
  id: string;
  reel_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  like_count: number;
  is_pinned: boolean;
  created_at: string;
  user?: {
    id?: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  is_liked?: boolean;
  replies?: ReelComment[];
}

export function useReels(feedType: 'for_you' | 'following' | 'trending' = 'for_you') {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  const fetchReels = useCallback(async (offset = 0, limit = 10) => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from('card_reels')
        .select('*')
        .eq('is_active', true)
        .order(feedType === 'trending' ? 'like_count' : 'created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (feedType === 'following' && user) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        
        if (following && following.length > 0) {
          const followingIds = following.map(f => f.following_id);
          query = query.in('user_id', followingIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        if (offset === 0) setReels([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      // Fetch user profiles from public view (excludes PII)
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

      // Fetch tagged cards separately
      const cardIds = data.filter(r => r.tagged_card_id).map(r => r.tagged_card_id);
      let cardsMap = new Map();
      if (cardIds.length > 0) {
        const { data: cards } = await supabase
          .from('market_items')
          .select('id, name, image_url, current_price, category')
          .in('id', cardIds);
        cardsMap = new Map(cards?.map(c => [c.id, c]) || []);
      }

      let reelsWithData = data.map(reel => ({
        ...reel,
        user: profilesMap.get(reel.user_id) as Reel['user'],
        tagged_card: reel.tagged_card_id ? cardsMap.get(reel.tagged_card_id) as Reel['tagged_card'] : undefined,
      })) as Reel[];

      if (user) {
        const reelIds = data.map(r => r.id);
        
        const { data: likes } = await supabase
          .from('reel_likes')
          .select('reel_id')
          .eq('user_id', user.id)
          .in('reel_id', reelIds);

        const { data: saves } = await supabase
          .from('reel_saves')
          .select('reel_id')
          .eq('user_id', user.id)
          .in('reel_id', reelIds);

        const likedIds = new Set(likes?.map(l => l.reel_id) || []);
        const savedIds = new Set(saves?.map(s => s.reel_id) || []);

        reelsWithData = reelsWithData.map(reel => ({
          ...reel,
          is_liked: likedIds.has(reel.id),
          is_saved: savedIds.has(reel.id),
        }));
      }

      if (offset === 0) {
        setReels(reelsWithData);
      } else {
        setReels(prev => [...prev, ...reelsWithData]);
      }

      setHasMore(data.length === limit);
    } catch (error) {
      console.error('Error fetching reels:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reels',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [feedType, toast]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchReels(reels.length);
    }
  };

  return { reels, loading, hasMore, loadMore, refetch: () => fetchReels() };
}

export function useReelActions() {
  const { toast } = useToast();

  const likeReel = async (reelId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Please sign in to like', variant: 'destructive' });
      return false;
    }

    const { error } = await supabase
      .from('reel_likes')
      .insert({ reel_id: reelId, user_id: user.id });

    if (error?.code === '23505') {
      // Already liked, unlike it
      await supabase
        .from('reel_likes')
        .delete()
        .eq('reel_id', reelId)
        .eq('user_id', user.id);
      return false;
    }

    return !error;
  };

  const unlikeReel = async (reelId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('reel_likes')
      .delete()
      .eq('reel_id', reelId)
      .eq('user_id', user.id);

    return !error;
  };

  const saveReel = async (reelId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Please sign in to save', variant: 'destructive' });
      return false;
    }

    const { error } = await supabase
      .from('reel_saves')
      .insert({ reel_id: reelId, user_id: user.id });

    if (error?.code === '23505') {
      await supabase
        .from('reel_saves')
        .delete()
        .eq('reel_id', reelId)
        .eq('user_id', user.id);
      return false;
    }

    return !error;
  };

  const unsaveReel = async (reelId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('reel_saves')
      .delete()
      .eq('reel_id', reelId)
      .eq('user_id', user.id);

    return !error;
  };

  const incrementView = async (reelId: string) => {
    await supabase.rpc('increment_reel_views', { reel_uuid: reelId });
  };

  const shareReel = async (reelId: string, title: string) => {
    const url = `${window.location.origin}/reels/${reelId}`;
    
    // Increment share count in database
    await supabase.rpc('increment_reel_shares', { reel_uuid: reelId });
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return true;
      } catch {
        // User cancelled or not supported
      }
    }
    
    await navigator.clipboard.writeText(url);
    toast({ title: 'Link copied!' });
    return true;
  };

  const followCreator = async (creatorId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Please sign in to follow', variant: 'destructive' });
      return false;
    }

    if (user.id === creatorId) {
      return false; // Can't follow yourself
    }

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: creatorId });

    if (error?.code === '23505') {
      // Already following, unfollow
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', creatorId);
      return false;
    }

    if (!error) {
      toast({ title: 'Following!' });
    }
    return !error;
  };

  const unfollowCreator = async (creatorId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', creatorId);

    return !error;
  };

  return { likeReel, unlikeReel, saveReel, unsaveReel, incrementView, shareReel, followCreator, unfollowCreator };
}

export function useReelComments(reelId: string) {
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch parent comments
      const { data: parentComments, error } = await supabase
        .from('reel_comments')
        .select('*')
        .eq('reel_id', reelId)
        .eq('is_active', true)
        .is('parent_id', null)
        .order('is_pinned', { ascending: false })
        .order('like_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!parentComments || parentComments.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      // Fetch replies
      const { data: replies } = await supabase
        .from('reel_comments')
        .select('*')
        .eq('reel_id', reelId)
        .eq('is_active', true)
        .not('parent_id', 'is', null)
        .order('created_at', { ascending: true });

      // Fetch user profiles from public view (excludes PII)
      const allComments = [...parentComments, ...(replies || [])];
      const userIds = [...new Set(allComments.map(c => c.user_id))];
      
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

      // Check which comments user has liked
      let likedIds = new Set<string>();
      if (user) {
        const commentIds = allComments.map(c => c.id);
        const { data: likes } = await supabase
          .from('reel_comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentIds);

        likedIds = new Set(likes?.map(l => l.comment_id) || []);
      }

      // Build replies map
      const repliesMap = new Map<string, ReelComment[]>();
      replies?.forEach(reply => {
        const replyWithData = {
          ...reply,
          user: profilesMap.get(reply.user_id) as ReelComment['user'],
          is_liked: likedIds.has(reply.id),
        } as ReelComment;
        const parentReplies = repliesMap.get(reply.parent_id!) || [];
        parentReplies.push(replyWithData);
        repliesMap.set(reply.parent_id!, parentReplies);
      });

      // Build final comments array
      const commentsWithData = parentComments.map(comment => ({
        ...comment,
        user: profilesMap.get(comment.user_id) as ReelComment['user'],
        is_liked: likedIds.has(comment.id),
        replies: repliesMap.get(comment.id) || [],
      })) as ReelComment[];

      setComments(commentsWithData);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [reelId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = async (content: string, parentId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Please sign in to comment', variant: 'destructive' });
      return false;
    }

    const { error } = await supabase
      .from('reel_comments')
      .insert({
        reel_id: reelId,
        user_id: user.id,
        content,
        parent_id: parentId || null,
      });

    if (error) {
      toast({ title: 'Failed to post comment', variant: 'destructive' });
      return false;
    }

    fetchComments();
    return true;
  };

  const likeComment = async (commentId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('reel_comment_likes')
      .insert({ comment_id: commentId, user_id: user.id });

    if (error?.code === '23505') {
      await supabase
        .from('reel_comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
    }

    fetchComments();
    return true;
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('reel_comments')
      .delete()
      .eq('id', commentId);

    if (!error) {
      fetchComments();
    }
    return !error;
  };

  return { comments, loading, addComment, likeComment, deleteComment, refetch: fetchComments };
}

export function useUploadReel() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const uploadReel = async (
    file: File,
    data: {
      title: string;
      description?: string;
      taggedCardId?: string;
      thumbnail?: File;
    }
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Please sign in to upload', variant: 'destructive' });
      return null;
    }

    try {
      setUploading(true);
      setProgress(10);

      // Upload video
      const videoPath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('video-reels')
        .upload(videoPath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      setProgress(50);

      const { data: videoData } = supabase.storage
        .from('video-reels')
        .getPublicUrl(videoPath);

      let thumbnailUrl = null;
      if (data.thumbnail) {
        const thumbPath = `${user.id}/thumbs/${Date.now()}-${data.thumbnail.name}`;
        await supabase.storage
          .from('video-reels')
          .upload(thumbPath, data.thumbnail);
        
        const { data: thumbData } = supabase.storage
          .from('video-reels')
          .getPublicUrl(thumbPath);
        
        thumbnailUrl = thumbData.publicUrl;
      }
      setProgress(70);

      // Get video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      
      const duration = await new Promise<number>((resolve) => {
        video.onloadedmetadata = () => {
          resolve(Math.round(video.duration));
        };
      });

      // Create reel record
      const { data: reel, error: insertError } = await supabase
        .from('card_reels')
        .insert({
          user_id: user.id,
          video_url: videoData.publicUrl,
          thumbnail_url: thumbnailUrl,
          title: data.title,
          description: data.description,
          tagged_card_id: data.taggedCardId || null,
          duration_seconds: Math.min(duration, 60),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setProgress(100);

      toast({ title: 'Reel uploaded successfully!' });
      return reel;
    } catch (error) {
      console.error('Error uploading reel:', error);
      toast({
        title: 'Upload failed',
        description: 'Please try again',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return { uploadReel, uploading, progress };
}
