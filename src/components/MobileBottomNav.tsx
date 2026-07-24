import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Package, ShoppingCart, PhoneCall, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuoteCart } from "@/context/QuoteCartContext";
import { QuoteCartSheet } from "@/components/QuoteCartSheet";

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { totalLotes } = useQuoteCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/80 sm:hidden shadow-lg pb-safe"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid grid-cols-5 h-14 items-center justify-items-center max-w-md mx-auto px-1">
          <Link
            to="/"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full text-center transition-colors px-1",
              pathname === "/" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn("p-1 rounded-full transition-all", pathname === "/" ? "bg-primary/10 text-primary scale-110" : "")}>
              <Home className="w-4 h-4" />
            </div>
            <span className="text-[9px] mt-0.5 leading-none truncate max-w-full">Início</span>
          </Link>

          <a
            href="/#produtos"
            className="flex flex-col items-center justify-center w-full h-full text-center transition-colors px-1 text-muted-foreground hover:text-foreground"
          >
            <div className="p-1 rounded-full">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-[9px] mt-0.5 leading-none truncate max-w-full">Produtos</span>
          </a>

          {/* Botão Cotação */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex flex-col items-center justify-center w-full h-full text-center transition-colors px-1 text-primary font-bold"
          >
            <div className="p-1 rounded-full bg-primary/10 text-primary scale-110 relative">
              <ShoppingCart className="w-4 h-4" />
              {totalLotes > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-background animate-pulse">
                  {totalLotes}
                </span>
              )}
            </div>
            <span className="text-[9px] mt-0.5 leading-none truncate max-w-full">Cotação</span>
          </button>

          <Link
            to="/contactos"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full text-center transition-colors px-1",
              pathname === "/contactos" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn("p-1 rounded-full transition-all", pathname === "/contactos" ? "bg-primary/10 text-primary scale-110" : "")}>
              <PhoneCall className="w-4 h-4" />
            </div>
            <span className="text-[9px] mt-0.5 leading-none truncate max-w-full">Contacto</span>
          </Link>

          <Link
            to="/admin"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full text-center transition-colors px-1",
              pathname.startsWith("/admin") || pathname === "/auth" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn("p-1 rounded-full transition-all", pathname.startsWith("/admin") ? "bg-primary/10 text-primary scale-110" : "")}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[9px] mt-0.5 leading-none truncate max-w-full">Admin</span>
          </Link>
        </div>
      </nav>

      <QuoteCartSheet isOpen={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
}
