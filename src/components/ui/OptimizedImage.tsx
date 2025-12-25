import { useState, useRef, useEffect, memo, useMemo } from 'react';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';
import { 
  getOptimizedImageUrl, 
  generateSrcSet, 
  getOptimalSize,
  type ImageSize 
} from '@/lib/imageOptimizer';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  size?: ImageSize;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized image component with:
 * - Lazy loading with IntersectionObserver
 * - WebP format with fallback
 * - Responsive srcset generation
 * - Skeleton loading state
 * - Error handling with fallback
 * - R2 CDN optimization support
 */
const OptimizedImage = memo(function OptimizedImage({ 
  src, 
  alt, 
  className,
  fallbackClassName,
  size = 'medium',
  priority = false,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine optimal size based on container
  const optimalSize = useMemo(() => {
    if (containerRef.current) {
      return getOptimalSize(containerRef.current.offsetWidth);
    }
    return size;
  }, [size]);

  // Get optimized URL
  const optimizedSrc = useMemo(() => 
    getOptimizedImageUrl(src, optimalSize),
    [src, optimalSize]
  );

  // Generate srcset for responsive loading
  const srcSet = useMemo(() => generateSrcSet(src), [src]);

  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
    onError?.();
  };

  if (hasError || !src) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted/50",
          fallbackClassName || className
        )}
      >
        <span className="text-xs text-muted-foreground font-medium">No Image</span>
      </div>
    );
  }

  return (
    <div 
      ref={(el) => {
        (imgRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      className={cn("relative overflow-hidden", className)}
    >
      {!isLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      {isInView && (
        <picture>
          {/* WebP source for modern browsers */}
          <source 
            type="image/webp"
            srcSet={srcSet || optimizedSrc}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Fallback for older browsers */}
          <img
            src={optimizedSrc}
            alt={alt}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={handleLoad}
            onError={handleError}
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            fetchPriority={priority ? "high" : "auto"}
          />
        </picture>
      )}
    </div>
  );
});

export { OptimizedImage };
export type { OptimizedImageProps };
