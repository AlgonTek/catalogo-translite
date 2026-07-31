import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  Minus,
  Plus,
  ArrowLeft,
  Flame,
  TrendingUp,
  Package,
  Maximize2,
  Calculator,
  Sparkles,
  Share2,
  ShoppingCart,
} from "lucide-react";
import { formatCurrency, buildWhatsappLink } from "@/lib/whatsapp";
import { BlurImage } from "@/components/BlurImage";
import { ImageLightbox } from "@/components/ImageLightbox";
import { shareProduct } from "@/lib/share";
import { useQuoteCart } from "@/context/QuoteCartContext";
import type { Product } from "@/types/product";
import { toast } from "sonner";

const demandLabel: Record<Product["demanda"], { label: string; className: string }> = {
  alta: { label: "Demanda alta", className: "bg-demand-high text-white" },
  media: { label: "Demanda média", className: "bg-demand-medium text-foreground" },
  baixa: { label: "Demanda baixa", className: "bg-demand-low text-white" },
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useQuoteCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      // 1. Try Firestore first
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(data);
          setActiveImg(0);
          setLoading(false);
          document.title = `${data.nome} — Translite`;
          return;
        }
      } catch (fsErr) {
        console.warn("Aviso ao buscar produto no Firestore:", fsErr);
      }

      // 2. Try REST API
      try {
        const res = await fetch(`/api/products/${id}`, {
          headers: { Accept: "application/json" },
        });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data && data.nome) {
            setProduct(data as Product);
            setActiveImg(0);
            setLoading(false);
            document.title = `${data.nome} — Translite`;
            return;
          }
        }
      } catch {
        /* proceed to not found */
      }

      toast.error("Produto não encontrado");
      navigate("/");
    })();
  }, [id, navigate]);

  if (loading || !product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container py-8 grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const dc = demandLabel[product.demanda];
  const totalUnidades = lotes * product.quantidade_minima;
  const totalLote = lotes * product.preco_lote;
  const totalRevenda = totalUnidades * product.preco_revenda;
  const lucroTotal = totalRevenda - totalLote;

  const gallery = (product.imagens && product.imagens.length > 0)
    ? product.imagens
    : (product.imagem_url ? [product.imagem_url] : []);
  const currentImg = gallery[activeImg] ?? gallery[0];

  const whatsLink = buildWhatsappLink({
    codigo: product.codigo,
    nome: product.nome,
    quantidade: lotes,
    preco_lote: product.preco_lote,
    preco_revenda: product.preco_revenda,
  });

  const handleShare = () => {
    shareProduct(product);
  };

  const handleAddToCart = () => {
    addItem(product, lotes);
  };

  return (
    <div className="min-h-screen bg-background pb-28 sm:pb-8">
      <SiteHeader />
      <div className="container py-3 sm:py-6 max-w-5xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-xs sm:text-sm">
            <Link to="/"><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Voltar ao catálogo</Link>
          </Button>

          <Button
            onClick={handleShare}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8 rounded-full border-border/80"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartilhar</span>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-8 lg:gap-12 items-start">
          {/* Galeria de imagens com zoom/modal */}
          <div className="space-y-2">
            <Card className="relative overflow-hidden aspect-square bg-muted border-border/80 shadow-soft group cursor-pointer" onClick={() => setIsLightboxOpen(true)}>
              {currentImg ? (
                <BlurImage
                  source={currentImg}
                  src={currentImg}
                  alt={product.nome}
                  decoding="async"
                  className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Package className="w-16 h-16 sm:w-20 sm:h-20" />
                </div>
              )}

              {/* Botão de Expandir Foto */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(true);
                }}
                className="absolute bottom-2.5 right-2.5 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all shadow-md active:scale-95 z-10"
                title="Ampliar foto"
              >
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1.5 z-10">
                {product.destaque && (
                  <Badge className="gradient-accent text-accent-foreground border-0 shadow-soft text-[10px] sm:text-xs">
                    <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" /> Destaque
                  </Badge>
                )}
                {product.mais_vendido && (
                  <Badge className="bg-secondary text-secondary-foreground border-0 text-[10px] sm:text-xs">
                    <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" /> Mais vendido
                  </Badge>
                )}
              </div>
            </Card>

            {/* Miniaturas de fotos */}
            {gallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {gallery.map((url, idx) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveImg(idx)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      idx === activeImg ? "border-primary ring-2 ring-primary/20 scale-105" : "border-border/60 opacity-70 hover:opacity-100"
                    }`}
                    aria-label={`Ver foto ${idx + 1}`}
                  >
                    <img
                      src={url}
                      alt={`${product.nome} — foto ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground text-center sm:text-left flex items-center justify-center sm:justify-start gap-1 pt-1">
              <Maximize2 className="w-3 h-3" /> Toque na imagem para ampliar em ecrã inteiro
            </p>
          </div>

          {/* Informações do Produto */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2 flex-wrap">
              <Badge variant="outline" className="font-semibold text-[10px] sm:text-xs">{product.categoria}</Badge>
              {product.codigo && (
                <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs">
                  CÓD: {product.codigo}
                </Badge>
              )}
              <Badge className={`border-0 text-[10px] sm:text-xs font-bold ${dc.className}`}>{dc.label}</Badge>
            </div>

            <h1 className="text-xl sm:text-3xl font-extrabold leading-tight mb-2 text-foreground">{product.nome}</h1>
            {product.descricao && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">{product.descricao}</p>
            )}

            {/* Cards de Preço */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
              <Card className="p-3 gradient-card border-primary/20">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-0.5">Preço do Lote</p>
                <p className="text-lg sm:text-2xl font-black text-primary leading-tight">{formatCurrency(product.preco_lote)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Lote com {product.quantidade_minima} un.</p>
              </Card>
              <Card className="p-3 gradient-card border-accent/20">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-0.5">Revenda Sugerida</p>
                <p className="text-lg sm:text-2xl font-black text-foreground leading-tight">{formatCurrency(product.preco_revenda)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">por cada unidade</p>
              </Card>
            </div>

            {/* Selector de Quantidade de Lotes */}
            <div className="mb-4 bg-muted/40 p-3 rounded-xl border border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-primary" /> Quantidade de lotes
                </label>
                <span className="text-xs font-semibold text-primary">
                  {totalUnidades} unidades no total
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="inline-flex items-center border-2 border-primary/30 rounded-lg overflow-hidden bg-background shadow-sm">
                  <button
                    onClick={() => setLotes((l) => Math.max(1, l - 1))}
                    className="p-2.5 sm:p-3 hover:bg-muted active:bg-muted/80 transition-colors"
                    aria-label="Diminuir lotes"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 sm:w-16 text-center font-black text-base sm:text-lg text-foreground">{lotes}</span>
                  <button
                    onClick={() => setLotes((l) => l + 1)}
                    className="p-2.5 sm:p-3 hover:bg-muted active:bg-muted/80 transition-colors"
                    aria-label="Aumentar lotes"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-muted-foreground">
                  ({lotes}x {product.quantidade_minima} unidades)
                </span>
              </div>
            </div>

            {/* Resumo Financeiro & Lucro Estimado */}
            <Card className="p-3 sm:p-4 mb-5 space-y-2 bg-gradient-to-br from-primary/5 via-muted/30 to-profit/10 border-profit/30">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Investimento ({lotes} {lotes > 1 ? "lotes" : "lote"}):</span>
                <span className="font-bold">{formatCurrency(totalLote)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Retorno em revenda:</span>
                <span className="font-bold">{formatCurrency(totalRevenda)}</span>
              </div>
              <div className="border-t border-border/80 pt-2 flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-profit" />
                  <span className="font-extrabold text-profit text-xs sm:text-sm">Lucro Líquido Estimado:</span>
                </div>
                <span className="text-base sm:text-xl font-black text-profit">{formatCurrency(lucroTotal)}</span>
              </div>
            </Card>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:grid grid-cols-2 gap-3">
              <Button
                onClick={handleAddToCart}
                size="lg"
                variant="outline"
                className="border-primary/40 text-foreground font-bold text-sm h-14"
              >
                <ShoppingCart className="w-4 h-4 mr-2 text-primary" />
                Adicionar à Cotação
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-whatsapp hover:bg-whatsapp/90 text-whatsapp-foreground font-bold text-sm h-14 shadow-elevated"
              >
                <a href={whatsLink} target="_blank" rel="noopener noreferrer">
                  <WhatsappIcon /> Pedir no WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar para Mobile (iPhone 12 / Android) */}
      <div className="fixed bottom-14 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border p-2.5 sm:hidden shadow-2xl">
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          <Button
            onClick={handleAddToCart}
            variant="outline"
            size="default"
            className="border-primary/40 bg-primary/5 text-foreground font-bold text-xs h-11 px-3 shrink-0"
            title="Adicionar à lista de Cotação"
          >
            <ShoppingCart className="w-4 h-4 text-primary" />
          </Button>

          <Button
            asChild
            size="default"
            className="bg-whatsapp hover:bg-whatsapp/90 text-whatsapp-foreground font-bold text-xs h-11 px-3 shadow-md flex-1"
          >
            <a href={whatsLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5">
              <WhatsappIcon className="w-4 h-4 shrink-0" /> Pedir WhatsApp ({formatCurrency(totalLote)})
            </a>
          </Button>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <ImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={gallery}
        initialIndex={activeImg}
        productTitle={product.nome}
      />

      {/* JSON-LD Schema para o Produto (Google Search SEO Moçambique) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.nome,
            "image": gallery.length > 0 ? gallery : [product.imagem_url || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600"],
            "description": product.descricao || `Compre ${product.nome} em lote com preços de atacado. Lucro estimado para revenda em Moçambique.`,
            "sku": product.codigo || product.id,
            "brand": {
              "@type": "Brand",
              "name": "Translite Atacado"
            },
            "offers": {
              "@type": "Offer",
              "url": typeof window !== "undefined" ? window.location.href : `https://translite.co.mz/produto/${product.id}`,
              "priceCurrency": "MZN",
              "price": product.preco_lote,
              "priceValidUntil": "2027-12-31",
              "itemCondition": "https://schema.org/NewCondition",
              "availability": "https://schema.org/InStock",
              "seller": {
                "@type": "Organization",
                "name": "Translite Solutions, Lda — Atacado Moçambique"
              }
            }
          })
        }}
      />
    </div>
  );
};

const WhatsappIcon = ({ className = "w-5 h-5 mr-1.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.9-.4-1.7-1-2.4-1.7-.6-.7-1.2-1.5-1.7-2.4-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.6.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.6-1.5-.9-2.1-.2-.5-.5-.4-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1-1.1 2.5s1.1 2.9 1.3 3.1c.2.2 2.2 3.4 5.4 4.7 2.7 1.1 3.2.9 3.8.8.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.5.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3C4.4 15 4 13.5 4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8z"/>
  </svg>
);

export default ProductDetail;
