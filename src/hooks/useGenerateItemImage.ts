import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GenerateImageParams {
  item_id?: string;
  item_name: string;
  category?: string;
  set_name?: string;
  rarity?: string;
}

export const useGenerateItemImage = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImage = async (params: GenerateImageParams): Promise<string | null> => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-item-image', {
        body: params
      });

      if (error) {
        console.error('Error generating image:', error);
        toast.error('Failed to generate image');
        return null;
      }

      if (data?.image_url) {
        toast.success('Image generated successfully!');
        return data.image_url;
      }

      return null;
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMissingImages = async () => {
    setIsGenerating(true);
    
    try {
      // Fetch items without proper images
      const { data: items, error } = await supabase
        .from('market_items')
        .select('id, name, category, set_name, rarity, image_url')
        .or('image_url.is.null,image_url.eq./placeholder.svg');

      if (error) throw error;

      if (!items || items.length === 0) {
        toast.info('All items already have images');
        return;
      }

      toast.info(`Generating images for ${items.length} items...`);

      for (const item of items) {
        await generateImage({
          item_id: item.id,
          item_name: item.name,
          category: item.category,
          set_name: item.set_name || undefined,
          rarity: item.rarity || undefined
        });
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast.success('All images generated!');
    } catch (error) {
      console.error('Error generating missing images:', error);
      toast.error('Failed to generate images');
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateImage,
    generateMissingImages,
    isGenerating
  };
};
