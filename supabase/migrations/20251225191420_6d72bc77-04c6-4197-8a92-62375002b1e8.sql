-- Create video-reels storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('video-reels', 'video-reels', true, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime']);

-- Storage policies for video-reels bucket
CREATE POLICY "Video reels are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'video-reels');

CREATE POLICY "Users can upload their own reels" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'video-reels' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own reels" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'video-reels' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own reels" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'video-reels' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create card_reels table
CREATE TABLE public.card_reels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT NOT NULL CHECK (length(title) <= 100),
  description TEXT CHECK (length(description) <= 500),
  tagged_card_id UUID REFERENCES public.market_items(id) ON DELETE SET NULL,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  duration_seconds INTEGER CHECK (duration_seconds <= 60),
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on card_reels
ALTER TABLE public.card_reels ENABLE ROW LEVEL SECURITY;

-- RLS policies for card_reels
CREATE POLICY "Anyone can view active reels"
ON public.card_reels FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can create their own reels"
ON public.card_reels FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reels"
ON public.card_reels FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reels"
ON public.card_reels FOR DELETE
USING (auth.uid() = user_id);

-- Create reel_likes table
CREATE TABLE public.reel_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.card_reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

-- Enable RLS on reel_likes
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for reel_likes
CREATE POLICY "Anyone can view likes"
ON public.reel_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like reels"
ON public.reel_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike reels"
ON public.reel_likes FOR DELETE
USING (auth.uid() = user_id);

-- Create reel_comments table
CREATE TABLE public.reel_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.card_reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 500),
  parent_id UUID REFERENCES public.reel_comments(id) ON DELETE CASCADE,
  like_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reel_comments
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for reel_comments
CREATE POLICY "Anyone can view active comments"
ON public.reel_comments FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can create comments"
ON public.reel_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.reel_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.reel_comments FOR DELETE
USING (auth.uid() = user_id);

-- Create reel_comment_likes table
CREATE TABLE public.reel_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.reel_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on reel_comment_likes
ALTER TABLE public.reel_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for reel_comment_likes
CREATE POLICY "Anyone can view comment likes"
ON public.reel_comment_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like comments"
ON public.reel_comment_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments"
ON public.reel_comment_likes FOR DELETE
USING (auth.uid() = user_id);

-- Create reel_saves table (bookmarks)
CREATE TABLE public.reel_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.card_reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

-- Enable RLS on reel_saves
ALTER TABLE public.reel_saves ENABLE ROW LEVEL SECURITY;

-- RLS policies for reel_saves
CREATE POLICY "Users can view their saves"
ON public.reel_saves FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save reels"
ON public.reel_saves FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave reels"
ON public.reel_saves FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_card_reels_user_id ON public.card_reels(user_id);
CREATE INDEX idx_card_reels_tagged_card ON public.card_reels(tagged_card_id);
CREATE INDEX idx_card_reels_created_at ON public.card_reels(created_at DESC);
CREATE INDEX idx_card_reels_featured ON public.card_reels(is_featured) WHERE is_featured = true;
CREATE INDEX idx_reel_likes_reel_id ON public.reel_likes(reel_id);
CREATE INDEX idx_reel_comments_reel_id ON public.reel_comments(reel_id);
CREATE INDEX idx_reel_saves_user_id ON public.reel_saves(user_id);

-- Function to update like count
CREATE OR REPLACE FUNCTION public.update_reel_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.card_reels SET like_count = like_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.card_reels SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for like count
CREATE TRIGGER on_reel_like_change
AFTER INSERT OR DELETE ON public.reel_likes
FOR EACH ROW EXECUTE FUNCTION public.update_reel_like_count();

-- Function to update comment count
CREATE OR REPLACE FUNCTION public.update_reel_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.card_reels SET comment_count = comment_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.card_reels SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for comment count
CREATE TRIGGER on_reel_comment_change
AFTER INSERT OR DELETE ON public.reel_comments
FOR EACH ROW EXECUTE FUNCTION public.update_reel_comment_count();

-- Function to update comment like count
CREATE OR REPLACE FUNCTION public.update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reel_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reel_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for comment like count
CREATE TRIGGER on_comment_like_change
AFTER INSERT OR DELETE ON public.reel_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_like_count();

-- Function to update view count (increment only)
CREATE OR REPLACE FUNCTION public.increment_reel_views(reel_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.card_reels SET view_count = view_count + 1 WHERE id = reel_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable realtime for reels
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_reels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comments;