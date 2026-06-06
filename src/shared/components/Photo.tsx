import { memo, useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface PhotoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'loading' | 'decoding'> {
  src: string | null | undefined;
  alt: string;
  fallback?: ReactNode;
}

function PhotoBase({ src, alt, fallback = null, className, ...rest }: PhotoProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(className)}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}

export const Photo = memo(PhotoBase);
