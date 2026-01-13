import heic2any from 'heic2any';

/**
 * Checks if a file is a HEIC/HEIF image
 */
export const isHeicFile = (file: File): boolean => {
  const heicTypes = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
  const heicExtensions = ['.heic', '.heif'];
  
  // Check MIME type
  if (heicTypes.includes(file.type.toLowerCase())) {
    return true;
  }
  
  // Check file extension (fallback for browsers that don't recognize HEIC MIME type)
  const fileName = file.name.toLowerCase();
  return heicExtensions.some(ext => fileName.endsWith(ext));
};

/**
 * Converts a HEIC/HEIF file to JPEG
 * Returns the original file if it's not a HEIC file or conversion fails
 */
export const convertHeicToJpeg = async (file: File): Promise<File> => {
  if (!isHeicFile(file)) {
    return file;
  }

  try {
    // Convert HEIC to JPEG blob
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.92, // High quality JPEG
    });

    // heic2any can return a single blob or an array (for sequences)
    const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

    // Create a new File from the blob with updated name
    const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    const convertedFile = new File([resultBlob], newFileName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    return convertedFile;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw new Error('Failed to convert HEIC image. Please try uploading a JPG or PNG instead.');
  }
};

/**
 * Processes an image file - converts HEIC if needed
 * Shows a loading state during conversion
 */
export const processImageFile = async (
  file: File,
  onConversionStart?: () => void,
  onConversionEnd?: () => void
): Promise<File> => {
  if (isHeicFile(file)) {
    onConversionStart?.();
    try {
      const converted = await convertHeicToJpeg(file);
      return converted;
    } finally {
      onConversionEnd?.();
    }
  }
  return file;
};