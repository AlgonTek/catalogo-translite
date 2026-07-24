import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Sparkles, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuoteCart } from "@/context/QuoteCartContext";
import { QuoteCartSheet } from "@/components/QuoteCartSheet";

export function SiteHeader() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  const { totalLotes } = useQuoteCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="container flex h-12 sm:h-16 items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 group min-w-0" aria-label="Translite Solutions — Loja">
            <img
              src="/translite-logo-sm.png"
              srcSet="/translite-logo-sm.png 1x, /translite-logo-md.png 2x"
              alt="Translite Solutions"
              width={96}
              height={40}
              className="h-7 sm:h-10 w-auto object-contain transition-base group-hover:scale-[1.03] shrink-0"
              loading="eager"
              decoding="async"
            />
            <div className="leading-tight min-w-0">
              <p className="font-extrabold text-xs sm:text-base text-foreground truncate">Loja Translite</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-accent" /> Compre por lote, lucre mais
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-2 shrink-0">
            {/* Botão de Cotação Atacadista */}
            <Button
              onClick={() => setIsCartOpen(true)}
              size="sm"
              variant="outline"
              className="relative gap-1.5 border-primary/40 bg-primary/5 hover:bg-primary/10 text-foreground"
            >
              <ShoppingCart className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline font-bold text-xs">Cotação</span>
              {totalLotes > 0 && (
                <Badge className="bg-primary text-primary-foreground font-extrabold h-5 min-w-[20px] px-1 text-[10px] rounded-full flex items-center justify-center -mr-1">
                  {totalLotes}
                </Badge>
              )}
            </Button>

            {isAdmin ? (
              <Button asChild size="sm" variant="ghost">
                <Link to="/">Ver loja</Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link to="/admin">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Sheet Modal da Cotação */}
      <QuoteCartSheet isOpen={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
}
