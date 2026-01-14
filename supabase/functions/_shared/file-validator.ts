// File upload validation utilities
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedFileName?: string;
  detectedMimeType?: string;
}

// Allowed MIME types by category
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
  ],
  document: [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ],
};

// Blocked file extensions (executable, scripts, etc.)
export const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.js', '.jse', '.vbs', '.vbe', '.wsf', '.wsh', '.ps1',
  '.php', '.py', '.pl', '.rb', '.sh', '.bash',
  '.jar', '.class', '.dll', '.so', '.dylib',
  '.app', '.dmg', '.pkg', '.deb', '.rpm',
  '.html', '.htm', '.svg', '.xml',
];

// Maximum file sizes by type (in bytes)
export const MAX_FILE_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024, // 10MB
  document: 25 * 1024 * 1024, // 25MB
  default: 5 * 1024 * 1024, // 5MB
};

/**
 * Validate a file upload
 */
export function validateFile(
  fileName: string,
  mimeType: string,
  fileSize: number,
  category: 'image' | 'document' = 'image'
): FileValidationResult {
  const errors: string[] = [];

  // 1. Check file extension
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  if (BLOCKED_EXTENSIONS.includes(extension)) {
    errors.push(`File type ${extension} is not allowed`);
  }

  // 2. Check MIME type
  const allowedTypes = ALLOWED_MIME_TYPES[category] || ALLOWED_MIME_TYPES.image;
  if (!allowedTypes.includes(mimeType.toLowerCase())) {
    errors.push(`File type ${mimeType} is not allowed for ${category} uploads`);
  }

  // 3. Check file size
  const maxSize = MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default;
  if (fileSize > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    const actualSizeMB = (fileSize / (1024 * 1024)).toFixed(1);
    errors.push(`File too large: ${actualSizeMB}MB (max: ${maxSizeMB}MB)`);
  }

  // 4. Sanitize filename
  const sanitizedFileName = sanitizeFileName(fileName);

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedFileName,
    detectedMimeType: mimeType,
  };
}

/**
 * Sanitize a filename to prevent path traversal and other issues
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators
  let sanitized = fileName.replace(/[\/\\]/g, '_');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');
  
  // Remove special characters that could cause issues
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_');
  
  // Limit length
  if (sanitized.length > 255) {
    const extension = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 255 - extension.length) + extension;
  }
  
  // Don't allow hidden files
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized;
  }

  return sanitized;
}

/**
 * Detect MIME type from file magic bytes
 */
export function detectMimeType(bytes: Uint8Array): string | null {
  // Check common file signatures
  const signatures: Array<{ bytes: number[]; mimeType: string }> = [
    { bytes: [0xFF, 0xD8, 0xFF], mimeType: 'image/jpeg' },
    { bytes: [0x89, 0x50, 0x4E, 0x47], mimeType: 'image/png' },
    { bytes: [0x47, 0x49, 0x46, 0x38], mimeType: 'image/gif' },
    { bytes: [0x52, 0x49, 0x46, 0x46], mimeType: 'image/webp' }, // Note: needs additional check
    { bytes: [0x25, 0x50, 0x44, 0x46], mimeType: 'application/pdf' },
  ];

  for (const sig of signatures) {
    if (sig.bytes.every((byte, index) => bytes[index] === byte)) {
      return sig.mimeType;
    }
  }

  return null;
}

/**
 * Log file upload for tracking and auditing
 */
export async function logFileUpload(
  supabase: SupabaseClient,
  userId: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  storagePath: string,
  source: string,
  validationResult: FileValidationResult
): Promise<void> {
  try {
    await supabase.from('file_uploads').insert({
      user_id: userId,
      file_name: validationResult.sanitizedFileName || fileName,
      file_size_bytes: fileSize,
      mime_type: mimeType,
      storage_path: storagePath,
      source,
      is_validated: validationResult.isValid,
      validation_errors: validationResult.errors.length > 0 ? validationResult.errors : null,
      scan_status: validationResult.isValid ? 'clean' : 'blocked',
    });
  } catch (error) {
    console.error('Failed to log file upload:', error);
  }
}

/**
 * Check if file upload is suspicious
 */
export function isSuspiciousUpload(
  fileName: string,
  mimeType: string,
  fileSize: number
): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check for double extensions
  const parts = fileName.split('.');
  if (parts.length > 2) {
    const possibleHiddenExtension = '.' + parts[parts.length - 2];
    if (BLOCKED_EXTENSIONS.includes(possibleHiddenExtension.toLowerCase())) {
      reasons.push('Double extension detected');
    }
  }

  // Check for MIME type / extension mismatch
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  const expectedMimes: Record<string, string[]> = {
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.webp': ['image/webp'],
    '.pdf': ['application/pdf'],
  };

  if (expectedMimes[extension] && !expectedMimes[extension].includes(mimeType.toLowerCase())) {
    reasons.push('MIME type does not match file extension');
  }

  // Check for unusually small image files (potential metadata-only attack)
  if (mimeType.startsWith('image/') && fileSize < 100) {
    reasons.push('File too small to be a valid image');
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}
