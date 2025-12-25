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
  duration_seconds: number | null;
  is_featured: boolean;
  created_at: string;
  user?: {
    username: string | null;
    avatar_url: string | null;
    display_name: string | null;
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
    username: string | null;
    avatar_url: string | null;
    display_name: string | null;
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
        .select(`
          *,
          user:profiles!card_reels_user_id_fkey(username, avatar_url, display_name),
          tagged_card:market_items(name, image_url, current_price, category)
        `)
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

      let reelsWithLikes = data as Reel[];

      if (user && data) {
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

        reelsWithLikes = data.map(reel => ({
          ...reel,
          is_liked: likedIds.has(reel.id),
          is_saved: savedIds.has(reel.id),
        })) as Reel[];
      }

      if (offset === 0) {
        setReels(reelsWithLikes);
      } else {
        setReels(prev => [...prev, ...reelsWithLikes]);
      }

      setHasMore(data?.length === limit);
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

  return { likeReel, unlikeReel, saveReel, unsaveReel, incrementView, shareReel };
}

export function useReelComments(reelId: string) {
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('reel_comments')
        .select(`
          *,
          user:profiles!reel_comments_user_id_fkey(username, avatar_url, display_name)
        `)
        .eq('reel_id', reelId)
        .eq('is_active', true)
        .is('parent_id', null)
        .order('is_pinned', { ascending: false })
        .order('like_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch replies
      const { data: replies } = await supabase
        .from('reel_comments')
        .select(`
          *,
          user:profiles!reel_comments_user_id_fkey(username, avatar_url, display_name)
        `)
        .eq('reel_id', reelId)
        .eq('is_active', true)
        .not('parent_id', 'is', null)
        .order('created_at', { ascending: true });

      let commentsWithLikes = data as ReelComment[];

      if (user && data) {
        const commentIds = [...data.map(c => c.id), ...(replies?.map(r => r.id) || [])];
        
        const { data: likes } = await supabase
          .from('reel_comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentIds);

        const likedIds = new Set(likes?.map(l => l.comment_id) || []);

        const repliesMap = new Map<string, ReelComment[]>();
        replies?.forEach(reply => {
          const parentReplies = repliesMap.get(reply.parent_id!) || [];
          parentReplies.push({
            ...reply,
            is_liked: likedIds.has(reply.id),
          } as ReelComment);
          repliesMap.set(reply.parent_id!, parentReplies);
        });

        commentsWithLikes = data.map(comment => ({
          ...comment,
          is_liked: likedIds.has(comment.id),
          replies: repliesMap.get(comment.id) || [],
        })) as ReelComment[];
      }

      setComments(commentsWithLikes);
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
