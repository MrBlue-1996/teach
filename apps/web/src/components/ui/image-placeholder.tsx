'use client';

import { ImageIcon, Play, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImagePlaceholderProps {
  type?: 'image' | 'video' | 'animation';
  aspectRatio?: 'square' | 'video' | 'banner' | 'card';
  label?: string;
  className?: string;
  overlay?: React.ReactNode;
}

const aspectClasses = {
  square: 'aspect-square',
  video: 'aspect-video',
  banner: 'aspect-[3/1]',
  card: 'aspect-[4/3]',
};

export function ImagePlaceholder({
  type = 'image',
  aspectRatio = 'card',
  label,
  className,
  overlay,
}: ImagePlaceholderProps) {
  const Icon = type === 'video' ? Play : type === 'animation' ? Film : ImageIcon;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-muted to-muted/50 border border-dashed border-border/50',
        // eslint-disable-next-line security/detect-object-injection
        aspectClasses[aspectRatio],
        className
      )}
    >
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Icon className="h-8 w-8" />
        {label && <span className="text-xs font-medium">{label}</span>}
      </div>
      {overlay && (
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-3">
          {overlay}
        </div>
      )}
    </div>
  );
}

interface ImageBannerProps {
  gradient?: string;
  children: React.ReactNode;
  className?: string;
}

export function ImageBanner({ gradient, children, className }: ImageBannerProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-6 md:p-8',
        gradient || 'bg-gradient-to-br from-primary/20 via-primary/10 to-transparent',
        className
      )}
    >
      {/* Decorative circles */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10" />
      <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-primary/5" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
