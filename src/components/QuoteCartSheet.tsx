import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Trash2, Plus, Minus, MessageCircle, Sparkles, PackageCheck } from "lucide-react";
import { useQuoteCart } from "@/context/QuoteCartContext";
import { formatCurrency } from "@/lib/whatsapp";
import { BlurImage } from "@/components/BlurImage";

interface QuoteCartSheetProps {
  children?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QuoteCartSheet({ children, isOpen, onOpenChange }: QuoteCartSheetProps) {
  const {
    items,
    removeItem,
    updateLotes,
    clearCart,
    totalLotes,
    totalUnidades,
    totalInvestimento,
    lucroEstimadoTotal,
    sendWhatsappQuote,
  } = useQuoteCart();

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      {children && <SheetTrigger asChild>{children}</SheetTrigger>}
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col bg-background h-full">
        <SheetHeader className="p-4 border-b border-border/80 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Cotação de Atacado ({totalLotes} {totalLotes === 1 ? "lote" : "lotes"})
            </SheetTitle>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-muted-foreground hover:text-destructive text-xs h-8 px-2"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-1">Sua lista de cotação está vazia</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mb-6">
              Navegue pelo catálogo e adicione os lotes desejados para calcular o seu investimento e lucro total.
            </p>
          </div>
        ) : (
          <>
            {/* Lista de itens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map(({ product, lotes }) => {
                const subtotalLote = lotes * product.preco_lote;
                const totalUnitsItem = lotes * product.quantidade_minima;
                const lucroItem = (totalUnitsItem * product.preco_revenda) - subtotalLote;

                return (
                  <Card key={product.id} className="p-3 border-border/70 flex gap-3 items-center bg-card shadow-sm">
                    <div className="w-16 h-16 shrink-0 rounded-md overflow-hidden bg-muted border border-border/50">
                      <BlurImage
                        source={product.imagem_url}
                        alt={product.nome}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">{product.nome}</h4>
                        <button
                          onClick={() => removeItem(product.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          title="Remover item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>{product.quantidade_minima} un/lote</span>
                        {product.codigo && <span className="font-mono">CÓD: {product.codigo}</span>}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                        {/* Controlos de Lotes */}
                        <div className="flex items-center border border-border rounded-md bg-muted/40">
                          <button
                            onClick={() => updateLotes(product.id, lotes - 1)}
                            className="p-1 hover:bg-muted text-foreground transition-colors"
                            aria-label="Diminuir lotes"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-bold text-xs">{lotes} {lotes === 1 ? "lote" : "lotes"}</span>
                          <button
                            onClick={() => updateLotes(product.id, lotes + 1)}
                            className="p-1 hover:bg-muted text-foreground transition-colors"
                            aria-label="Aumentar lotes"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="font-extrabold text-xs sm:text-sm text-primary block">
                            {formatCurrency(subtotalLote)}
                          </span>
                          <span className="text-[9px] font-semibold text-profit">
                            + Lucro: {formatCurrency(lucroItem)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Resumo e Botão de Envio WhatsApp */}
            <div className="p-4 border-t border-border bg-card space-y-3 shadow-lg">
              <Card className="p-3 bg-gradient-to-br from-primary/5 via-muted/40 to-profit/10 border-profit/30 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <PackageCheck className="w-3.5 h-3.5 text-primary" /> Total ({totalLotes} lotes / {totalUnidades} un):
                  </span>
                  <span className="font-extrabold text-foreground">{formatCurrency(totalInvestimento)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-border/60">
                  <span className="font-bold text-profit flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-profit" /> Lucro Projetado:
                  </span>
                  <span className="font-black text-sm text-profit">+{formatCurrency(lucroEstimadoTotal)}</span>
                </div>
              </Card>

              <Button
                onClick={sendWhatsappQuote}
                size="lg"
                className="w-full bg-whatsapp hover:bg-whatsapp/90 text-whatsapp-foreground font-bold text-sm h-12 shadow-elevated gap-2"
              >
                <MessageCircle className="w-5 h-5 shrink-0" />
                Enviar Cotação Completa no WhatsApp
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
