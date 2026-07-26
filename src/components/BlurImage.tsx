import { useState, useEffect, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/image";

interface BlurImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  source?: string | null;
  className?: string;
  alt?: string;
  objectFit?: "cover" | "contain";
  targetWidth?: number;
}

/**
  * Componente de imagem resiliente e otimizado (WebP + Lazy Loading).
  * Otimizado para conexões móveis de Moçambique.
  */
export function BlurImage({
  source,
  src,
  className,
  alt = "Foto do produto",
  objectFit = "cover",
  targetWidth = 800,
  onLoad,
  onError,
  loading = "lazy",
  decoding = "async",
  ...imgProps
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const rawSrc = src || source || "";
  const imgSrc = getOptimizedImageUrl(rawSrc, { width: targetWidth, quality: 75, format: "webp" });

  useEffect(() => {
    setHasError(false);
    setLoaded(false);
  }, [imgSrc]);

  if (!imgSrc || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/60 text-muted-foreground p-3 text-center">
        <Package className="w-8 h-8 stroke-1 opacity-40 mb-1" />
        <span className="text-[10px] text-muted-foreground/70 font-medium">Sem imagem</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-muted/30 flex items-center justify-center">
      {!loaded && (
        <div className="absolute inset-0 bg-muted/50 animate-pulse" />
      )}
      <img
        {...imgProps}
        src={imgSrc}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setHasError(true);
          onError?.(e);
        }}
        className={cn(
          "w-full h-full transition-opacity duration-300",
          objectFit === "contain" ? "object-contain" : "object-cover",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </div>
  );
}

