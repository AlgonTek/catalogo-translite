// Helper to handle and optimize image URLs for fast loading (WebP / compressed) in low bandwidth environments (Moçambique).
export interface ImageOpts {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
  format?: "webp" | "jpg" | "png";
}

export function getOptimizedImageUrl(url: string | null | undefined, opts: ImageOpts = {}): string {
  if (!url) return "";
  
  // Data URLs or SVG don't need transformation
  if (url.startsWith("data:") || url.endsWith(".svg")) {
    return url;
  }

  const { width = 800, quality = 75, resize = "crop", format = "webp" } = opts;

  try {
    // Unsplash optimization
    if (url.includes("images.unsplash.com")) {
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.set("auto", "format");
      parsedUrl.searchParams.set("fm", format);
      parsedUrl.searchParams.set("q", quality.toString());
      if (width) parsedUrl.searchParams.set("w", width.toString());
      if (resize) parsedUrl.searchParams.set("fit", resize);
      return parsedUrl.toString();
    }
  } catch {
    return url;
  }

  return url;
}

export function getImageSrcSet(url: string | null | undefined, widths: number[], opts: Omit<ImageOpts, "width"> = {}): string {
  if (!url) return "";
  return widths
    .map((w) => `${getOptimizedImageUrl(url, { ...opts, width: w })} ${w}w`)
    .join(", ");
}

