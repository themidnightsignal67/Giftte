import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';

interface GiftImageProps {
  src: string;
  alt: string;
  title?: string;
  className?: string;
  fit?: 'cover' | 'contain';
}

export function GiftImage({
  src,
  alt,
  title,
  className = '',
  fit = 'cover',
}: GiftImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-pine-50 via-ivory-50 to-ochre-100/70 text-[#4B544E] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-11 h-11 rounded-2xl bg-white/95 border border-pine-900/12 shadow-sm flex items-center justify-center mb-2.5">
          <Gift className="w-5 h-5 text-pine-800 stroke-[1.5]" />
        </div>
        {title && (
          <span className="text-xs font-medium text-[#161B18] line-clamp-2 max-w-[16rem]">
            {title}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${
        fit === 'contain'
          ? 'bg-gradient-to-b from-white via-[#FFFDF9] to-ivory-50 flex items-center justify-center p-4'
          : 'bg-ivory-100'
      }`}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-ivory-100 via-white to-pine-50/50 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`${className} ${
          fit === 'contain' ? 'object-contain max-h-full max-w-full' : 'object-cover'
        } transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
