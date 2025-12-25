import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Video, Tag, Image as ImageIcon, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useUploadReel } from '@/hooks/useReels';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CreateReelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface MarketItem {
  id: string;
  name: string;
  image_url: string | null;
  category: string;
}

export function CreateReelDialog({ open, onOpenChange, onSuccess }: CreateReelDialogProps) {
  const { t } = useLanguage();
  const { uploadReel, uploading, progress } = useUploadReel();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taggedCardId, setTaggedCardId] = useState<string | null>(null);
  const [taggedCard, setTaggedCard] = useState<MarketItem | null>(null);
  
  const [cardSearch, setCardSearch] = useState('');
  const [searchResults, setSearchResults] = useState<MarketItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'details'>('upload');

  // Search for cards to tag
  useEffect(() => {
    if (cardSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchCards = async () => {
      setSearching(true);
      const { data } = await supabase
        .from('market_items')
        .select('id, name, image_url, category')
        .ilike('name', `%${cardSearch}%`)
        .limit(5);
      
      setSearchResults(data || []);
      setSearching(false);
    };

    const debounce = setTimeout(searchCards, 300);
    return () => clearTimeout(debounce);
  }, [cardSearch]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
      setError(t.reels?.invalidFormat || 'Please select MP4, WebM, or MOV video');
      return;
    }

    // Validate file size (50MB)
    if (file.size > 52428800) {
      setError(t.reels?.fileTooLarge || 'Video must be under 50MB');
      return;
    }

    // Check duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      if (video.duration > 60) {
        setError(t.reels?.tooLong || 'Video must be 60 seconds or less');
        URL.revokeObjectURL(video.src);
        return;
      }
      
      setVideoDuration(Math.round(video.duration));
      setVideoFile(file);
      setVideoPreview(video.src);
      setError(null);
      setStep('details');
    };
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t.reels?.invalidImage || 'Please select an image file');
      return;
    }

    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSelectCard = (card: MarketItem) => {
    setTaggedCardId(card.id);
    setTaggedCard(card);
    setCardSearch('');
    setShowSearch(false);
  };

  const handleRemoveCard = () => {
    setTaggedCardId(null);
    setTaggedCard(null);
  };

  const handleSubmit = async () => {
    if (!videoFile || !title.trim()) {
      setError(t.reels?.titleRequired || 'Title is required');
      return;
    }

    const reel = await uploadReel(videoFile, {
      title: title.trim(),
      description: description.trim() || undefined,
      taggedCardId: taggedCardId || undefined,
      thumbnail: thumbnailFile || undefined,
    });

    if (reel) {
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuration(0);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setTitle('');
    setDescription('');
    setTaggedCardId(null);
    setTaggedCard(null);
    setCardSearch('');
    setError(null);
    setStep('upload');
  };

  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            {t.reels?.createReel || 'Create Reel'}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'upload' ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Upload area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                  "hover:border-primary hover:bg-primary/5",
                  error && "border-destructive"
                )}
              >
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">{t.reels?.dropVideo || 'Click to select video'}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.reels?.videoRequirements || 'MP4, WebM, or MOV • Max 60s • Max 50MB'}
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleVideoSelect}
                className="hidden"
              />

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Video preview */}
              <div className="flex gap-4">
                <div className="relative w-32 aspect-[9/16] rounded-lg overflow-hidden bg-black shrink-0">
                  {videoPreview && (
                    <video
                      src={videoPreview}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  )}
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white">
                    {videoDuration}s
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  {/* Title */}
                  <div>
                    <Label>{t.reels?.title || 'Title'} *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                      placeholder={t.reels?.titlePlaceholder || 'Epic pack opening!'}
                      maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{title.length}/100</p>
                  </div>

                  {/* Thumbnail */}
                  <div>
                    <Label>{t.reels?.thumbnail || 'Custom thumbnail'}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {thumbnailPreview ? (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                          <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                          <button
                            onClick={() => {
                              setThumbnailFile(null);
                              setThumbnailPreview(null);
                            }}
                            className="absolute top-0.5 right-0.5 p-1 bg-black/50 rounded-full"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => thumbnailInputRef.current?.click()}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          {t.reels?.addThumbnail || 'Add'}
                        </Button>
                      )}
                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailSelect}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>{t.reels?.description || 'Description'}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder={t.reels?.descriptionPlaceholder || 'Tell us about this pull...'}
                  rows={2}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">{description.length}/500</p>
              </div>

              {/* Tag card */}
              <div>
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  {t.reels?.tagCard || 'Tag a card'}
                </Label>
                
                {taggedCard ? (
                  <div className="flex items-center gap-3 mt-2 p-2 rounded-lg bg-muted">
                    <img
                      src={taggedCard.image_url || '/placeholder.svg'}
                      alt={taggedCard.name}
                      className="w-10 h-14 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{taggedCard.name}</p>
                      <p className="text-xs text-muted-foreground">{taggedCard.category}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleRemoveCard}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative mt-1">
                    <Input
                      value={cardSearch}
                      onChange={(e) => {
                        setCardSearch(e.target.value);
                        setShowSearch(true);
                      }}
                      onFocus={() => setShowSearch(true)}
                      placeholder={t.reels?.searchCard || 'Search for a card...'}
                    />
                    
                    {showSearch && (cardSearch.length >= 2 || searching) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {searching ? (
                          <div className="p-4 text-center text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground text-sm">
                            {t.reels?.noCardsFound || 'No cards found'}
                          </div>
                        ) : (
                          searchResults.map((card) => (
                            <button
                              key={card.id}
                              onClick={() => handleSelectCard(card)}
                              className="w-full flex items-center gap-3 p-2 hover:bg-muted transition-colors"
                            >
                              <img
                                src={card.image_url || '/placeholder.svg'}
                                alt={card.name}
                                className="w-8 h-12 rounded object-cover"
                              />
                              <div className="text-left">
                                <p className="text-sm font-medium">{card.name}</p>
                                <p className="text-xs text-muted-foreground">{card.category}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Progress */}
              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">
                    {t.reels?.uploading || 'Uploading...'} {progress}%
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('upload')}
                  disabled={uploading}
                >
                  {t.common?.back || 'Back'}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!title.trim() || uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {t.reels?.post || 'Post'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
