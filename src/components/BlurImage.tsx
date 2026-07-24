import { useState, useEffect, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

interface BlurImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  source?: string | null;
  className?: string;
  alt?: string;
  objectFit?: "cover" | "contain";
}

/**
 * Componente de imagem resiliente com carregamento suave e tratamento de erro.
 * Garante visualização nítida das fotos dos produtos.
 */
export function BlurImage({
  source,
  src,
  className,
  alt = "Foto do produto",
  objectFit = "cover",
  onLoad,
  onError,
  ...imgProps
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const imgSrc = src || source || "";

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
