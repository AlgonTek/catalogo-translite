// Helper to handle image URLs safely across Supabase storage and external sources.
export interface ImageOpts {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

export function getOptimizedImageUrl(url: string | null | undefined, _opts: ImageOpts = {}): string {
  if (!url) return "";
  return url;
}

export function getImageSrcSet(_url: string | null | undefined, _widths: number[], _opts: Omit<ImageOpts, "width"> = {}): string {
  return "";
}
