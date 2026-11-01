import { cn } from '@/lib/utils';

// Item icons and hero portraits from the Academy's art. A plain img: they are
// small, already sized by the proxy, and not worth the image optimizer.
export function GameImage({ src, className }: { src: string; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cn('shrink-0 rounded-md bg-muted object-contain', className)}
    />
  );
}
