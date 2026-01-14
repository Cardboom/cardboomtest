/**
 * Client-side file validation utilities
 * 
 * Provides security-focused validation for file uploads before
 * they reach the server.
 */

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedName?: string;
}

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

// Blocked extensions
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.js', '.jse', '.vbs', '.vbe', '.wsf', '.wsh', '.ps1',
  '.php', '.py', '.pl', '.rb', '.sh', '.bash',
  '.jar', '.class', '.dll', '.so', '.dylib',
  '.app', '.dmg', '.pkg', '.deb', '.rpm',
  '.html', '.htm', '.svg', '.xml',
]);

// Max file sizes in bytes
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * Validate an image file
 */
export function validateImageFile(file: File): FileValidationResult {
  const errors: string[] = [];

  // Check file extension
  const extension = getFileExtension(file.name);
  if (BLOCKED_EXTENSIONS.has(extension)) {
    errors.push(`File type ${extension} is not allowed`);
  }

  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    errors.push(`File type ${file.type} is not a valid image type`);
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    errors.push(`Image too large: ${sizeMB}MB (max: 10MB)`);
  }

  // Check for suspicious patterns
  const suspiciousCheck = checkSuspiciousFile(file);
  if (suspiciousCheck.suspicious) {
    errors.push(...suspiciousCheck.reasons);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedName: sanitizeFileName(file.name),
  };
}

/**
 * Validate a document file
 */
export function validateDocumentFile(file: File): FileValidationResult {
  const errors: string[] = [];

  // Check file extension
  const extension = getFileExtension(file.name);
  if (BLOCKED_EXTENSIONS.has(extension)) {
    errors.push(`File type ${extension} is not allowed`);
  }

  // Check MIME type
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type.toLowerCase())) {
    errors.push(`File type ${file.type} is not a valid document type`);
  }

  // Check file size
  if (file.size > MAX_DOCUMENT_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    errors.push(`Document too large: ${sizeMB}MB (max: 25MB)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedName: sanitizeFileName(file.name),
  };
}

/**
 * Get file extension in lowercase
 */
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.substring(lastDot).toLowerCase() : '';
}

/**
 * Sanitize a filename
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators
  let sanitized = fileName.replace(/[\/\\]/g, '_');
  
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');
  
  // Remove special characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_');
  
  // Limit length
  if (sanitized.length > 255) {
    const extension = getFileExtension(sanitized);
    sanitized = sanitized.substring(0, 255 - extension.length) + extension;
  }
  
  // Don't allow hidden files
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized;
  }

  return sanitized;
}

/**
 * Check for suspicious file patterns
 */
function checkSuspiciousFile(file: File): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check for double extensions
  const parts = file.name.split('.');
  if (parts.length > 2) {
    const possibleHiddenExtension = '.' + parts[parts.length - 2].toLowerCase();
    if (BLOCKED_EXTENSIONS.has(possibleHiddenExtension)) {
      reasons.push('Suspicious double extension detected');
    }
  }

  // Check for MIME type / extension mismatch
  const extension = getFileExtension(file.name);
  const expectedMimes: Record<string, string[]> = {
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.webp': ['image/webp'],
    '.pdf': ['application/pdf'],
  };

  if (expectedMimes[extension] && !expectedMimes[extension].includes(file.type.toLowerCase())) {
    reasons.push('File type does not match extension');
  }

  // Check for unusually small image files
  if (file.type.startsWith('image/') && file.size < 100) {
    reasons.push('File too small to be a valid image');
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  type: 'image' | 'document' = 'image',
  maxFiles: number = 10
): { valid: File[]; invalid: Array<{ file: File; errors: string[] }> } {
  if (files.length > maxFiles) {
    return {
      valid: [],
      invalid: files.map(file => ({
        file,
        errors: [`Maximum ${maxFiles} files allowed`],
      })),
    };
  }

  const validator = type === 'image' ? validateImageFile : validateDocumentFile;
  const valid: File[] = [];
  const invalid: Array<{ file: File; errors: string[] }> = [];

  for (const file of files) {
    const result = validator(file);
    if (result.isValid) {
      valid.push(file);
    } else {
      invalid.push({ file, errors: result.errors });
    }
  }

  return { valid, invalid };
}

/**
 * Check file magic bytes to verify actual type
 */
export async function verifyFileType(file: File): Promise<{
  verified: boolean;
  detectedType: string | null;
  claimedType: string;
}> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const signatures: Array<{ bytes: number[]; type: string }> = [
    { bytes: [0xFF, 0xD8, 0xFF], type: 'image/jpeg' },
    { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], type: 'image/png' },
    { bytes: [0x47, 0x49, 0x46, 0x38], type: 'image/gif' },
    { bytes: [0x25, 0x50, 0x44, 0x46], type: 'application/pdf' },
  ];

  let detectedType: string | null = null;

  for (const sig of signatures) {
    if (sig.bytes.every((byte, i) => bytes[i] === byte)) {
      detectedType = sig.type;
      break;
    }
  }

  // Check for WebP (needs special handling)
  if (!detectedType && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      detectedType = 'image/webp';
    }
  }

  return {
    verified: !detectedType || detectedType === file.type.toLowerCase(),
    detectedType,
    claimedType: file.type,
  };
}
