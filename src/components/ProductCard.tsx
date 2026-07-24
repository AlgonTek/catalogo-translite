import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Package, MessageCircle, Share2, Plus } from "lucide-react";
import { formatCurrency, buildWhatsappLink } from "@/lib/whatsapp";
import { BlurImage } from "@/components/BlurImage";
import { shareProduct } from "@/lib/share";
import { useQuoteCart } from "@/context/QuoteCartContext";
import type { Product } from "@/types/product";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useQuoteCart();

  const whatsLink = buildWhatsappLink({
    codigo: product.codigo,
    nome: product.nome,
    quantidade: 1,
    preco_lote: product.preco_lote,
    preco_revenda: product.preco_revenda,
  });

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    shareProduct(product);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
  };

  return (
    <Card className="overflow-hidden border-border/60 hover:border-primary/30 shadow-none hover:shadow-soft transition-all duration-200 h-full flex flex-col group bg-card active:scale-[0.99]">
      {/* Container da Imagem */}
      <div className="relative aspect-square overflow-hidden bg-muted/40">
        <Link to={`/produto/${product.id}`} className="block w-full h-full">
          {product.imagem_url ? (
            <BlurImage
              source={product.imagem_url}
              src={product.imagem_url}
              alt={product.nome}
              loading="lazy"
              decoding="async"
              className="group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/20">
              <Package className="w-8 h-8 opacity-40" />
            </div>
          )}
        </Link>

        {/* Badge Discreto (Se Destaque) */}
        {product.destaque && (
          <Badge className="absolute top-2 left-2 gradient-accent text-accent-foreground border-0 text-[10px] px-1.5 py-0.5 font-bold shadow-sm">
            <Flame className="w-2.5 h-2.5 mr-0.5" /> Destaque
          </Badge>
        )}

        {/* Botão de Partilha discreto no canto da foto */}
        <button
          onClick={handleShare}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90"
          title="Compartilhar produto"
          aria-label="Compartilhar produto"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Conteúdo Informativo */}
      <div className="p-2.5 sm:p-3.5 flex flex-col gap-1 flex-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
          <span className="uppercase tracking-wider truncate max-w-[100px]">{product.categoria}</span>
          {product.codigo && <span className="font-mono text-muted-foreground/80">{product.codigo}</span>}
        </div>

        <Link to={`/produto/${product.id}`} className="block group-hover:text-primary transition-colors">
          <h3 className="font-bold text-xs sm:text-sm leading-snug line-clamp-2 text-foreground">
            {product.nome}
          </h3>
        </Link>

        {/* Preços sem caixas pesadas */}
        <div className="mt-auto pt-2">
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-[10px] text-muted-foreground">Lote ({product.quantidade_minima}un)</span>
            <span className="font-black text-sm sm:text-base text-primary">{formatCurrency(product.preco_lote)}</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground/90 pt-0.5">
            <span>Revenda/un</span>
            <span className="font-semibold text-foreground">{formatCurrency(product.preco_revenda)}</span>
          </div>

          {/* Ações rápidas */}
          <div className="flex items-center gap-1.5 pt-2 mt-1 border-t border-border/40">
            <button
              onClick={handleAddToCart}
              className="p-2 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors flex items-center justify-center shrink-0"
              title="Adicionar à cotação"
              aria-label="Adicionar à cotação"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
            </button>
            <a
              href={whatsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-2 bg-whatsapp text-whatsapp-foreground font-bold text-xs rounded-md hover:bg-whatsapp/90 transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 text-center"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Pedir</span>
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}
