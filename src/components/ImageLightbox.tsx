import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  productTitle?: string;
}

export function ImageLightbox({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  productTitle = "Foto do produto",
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!images || images.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 bg-black/95 border-none text-white overflow-hidden max-h-[90vh] flex flex-col items-center justify-center">
        {/* Header bar */}
        <div className="w-full flex items-center justify-between p-3 bg-black/50 z-10 border-b border-white/10">
          <span className="text-xs sm:text-sm font-medium truncate max-w-[70%] text-white/90">
            {productTitle} ({currentIndex + 1} / {images.length})
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-8 w-8 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Main image container */}
        <div className="relative w-full flex-1 min-h-[300px] max-h-[75vh] flex items-center justify-center p-2 overflow-hidden">
          <img
            src={images[currentIndex]}
            alt={`${productTitle} - Imagem ${currentIndex + 1}`}
            className="max-h-[70vh] w-auto max-w-full object-contain rounded-sm select-none"
          />

          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white rounded-full h-10 w-10 border border-white/20"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white rounded-full h-10 w-10 border border-white/20"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="w-full p-2 bg-black/60 flex items-center justify-center gap-2 overflow-x-auto border-t border-white/10">
            {images.map((img, idx) => (
              <button
                key={img}
                onClick={() => setCurrentIndex(idx)}
                className={`w-12 h-12 rounded overflow-hidden border-2 transition-all shrink-0 ${
                  idx === currentIndex ? "border-primary scale-105" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
