/**
 * Image Optimization Utilities for Cloudflare R2
 * Handles WebP conversion, compression, and caching strategies
 */

// R2 public bucket URL - set via environment or config
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

// Image quality presets
export const IMAGE_QUALITY = {
  thumbnail: { width: 150, height: 150, quality: 70 },
  small: { width: 300, height: 300, quality: 75 },
  medium: { width: 600, height: 600, quality: 80 },
  large: { width: 1200, height: 1200, quality: 85 },
  original: { quality: 90 }
} as const;

export type ImageSize = keyof typeof IMAGE_QUALITY;

/**
 * Generate R2-optimized image URL with Cloudflare Image Resizing
 * Falls back to original URL if R2 is not configured
 */
export function getOptimizedImageUrl(
  src: string,
  size: ImageSize = 'medium'
): string {
  if (!src) return '';
  
  // If it's already an R2 URL, append optimization params
  if (R2_PUBLIC_URL && src.startsWith(R2_PUBLIC_URL)) {
    const preset = IMAGE_QUALITY[size];
    const params = new URLSearchParams({
      format: 'webp',
      quality: preset.quality.toString(),
      fit: 'cover'
    });
    if ('width' in preset) {
      params.set('width', preset.width.toString());
    }
    if ('height' in preset) {
      params.set('height', preset.height.toString());
    }
    return `${src}?${params.toString()}`;
  }
  
  // Return original for non-R2 URLs
  return src;
}

/**
 * Compress image file before upload
 * Uses canvas API for client-side compression
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    img.onload = () => {
      let { width, height } = img;
      
      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/webp',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(src: string): string {
  if (!src || !R2_PUBLIC_URL || !src.startsWith(R2_PUBLIC_URL)) {
    return '';
  }
  
  const sizes: Array<{ width: number; descriptor: string }> = [
    { width: 300, descriptor: '300w' },
    { width: 600, descriptor: '600w' },
    { width: 900, descriptor: '900w' },
    { width: 1200, descriptor: '1200w' }
  ];
  
  return sizes
    .map(({ width, descriptor }) => {
      const url = `${src}?format=webp&width=${width}&fit=cover`;
      return `${url} ${descriptor}`;
    })
    .join(', ');
}

/**
 * Preload critical images
 */
export function preloadImage(src: string, size: ImageSize = 'medium'): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = getOptimizedImageUrl(src, size);
  link.type = 'image/webp';
  document.head.appendChild(link);
}

/**
 * Check if browser supports WebP
 */
export async function supportsWebP(): Promise<boolean> {
  if (typeof createImageBitmap === 'undefined') return false;
  
  const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
  try {
    const blob = await fetch(webpData).then(r => r.blob());
    return createImageBitmap(blob).then(() => true).catch(() => false);
  } catch {
    return false;
  }
}

/**
 * Calculate optimal image dimensions for container
 */
export function getOptimalSize(
  containerWidth: number,
  containerHeight?: number
): ImageSize {
  if (containerWidth <= 150) return 'thumbnail';
  if (containerWidth <= 300) return 'small';
  if (containerWidth <= 600) return 'medium';
  return 'large';
}

/**
 * Cache configuration for images
 */
export const IMAGE_CACHE_CONFIG = {
  // Cache headers for different image types
  static: 'public, max-age=31536000, immutable', // 1 year for static assets
  dynamic: 'public, max-age=86400, stale-while-revalidate=604800', // 1 day, revalidate for 7 days
  menuImages: 'public, max-age=3600, stale-while-revalidate=86400', // 1 hour, revalidate for 1 day
};

/**
 * Generate cache key for image
 */
export function getImageCacheKey(src: string, size: ImageSize): string {
  return `img:${size}:${src}`;
}
