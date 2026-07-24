import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ShoppingBag,
  Loader2,
  X,
  SlidersHorizontal,
  Flame,
  TrendingUp,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";
import type { Product } from "@/types/product";
import { MOCK_PRODUCTS } from "@/data/fallbackProducts";

const PAGE_SIZE = 12;

type SortOption = "relevancia" | "lucro_desc" | "preco_asc" | "preco_desc" | "nome_asc";

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [demandFilter, setDemandFilter] = useState<string>("todos");
  const [sortBy, setSortBy] = useState<SortOption>("relevancia");
  const [search, setSearch] = useState("");
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title = "Loja Translite — Compre por lote, lucre mais";
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Erro ao buscar produtos");
      const data = await res.json();
      setHasMore(false);
      return data as Product[];
    } catch {
      setHasMore(false);
      return MOCK_PRODUCTS;
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await fetchProducts();
      setProducts(list);
      pageRef.current = 0;
      setLoading(false);
    })();
  }, [fetchProducts]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const list = await fetchProducts();
    if (list.length > 0) {
      setProducts(list);
    }
    setLoadingMore(false);
  }, [fetchProducts, hasMore, loadingMore]);

  useEffect(() => {
    if (!hasMore || loading) return;
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMore, loading, loadMore]);

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((p) => p.categoria)))],
    [products]
  );

  const filteredAndSorted = useMemo(() => {
    const term = search.trim().toLowerCase();

    const result = products.filter((p) => {
      const okCat = activeCategory === "Todos" || p.categoria === activeCategory;
      const okSearch =
        !term ||
        p.nome.toLowerCase().includes(term) ||
        p.categoria.toLowerCase().includes(term) ||
        (p.codigo && p.codigo.toLowerCase().includes(term));

      let okDemand = true;
      if (demandFilter === "alta") okDemand = p.demanda === "alta";
      if (demandFilter === "destaque") okDemand = p.destaque === true;
      if (demandFilter === "mais_vendido") okDemand = p.mais_vendido === true;

      return okCat && okSearch && okDemand;
    });

    return result.sort((a, b) => {
      if (sortBy === "lucro_desc") {
        const lucroA = a.preco_revenda * a.quantidade_minima - a.preco_lote;
        const lucroB = b.preco_revenda * b.quantidade_minima - b.preco_lote;
        return lucroB - lucroA;
      }
      if (sortBy === "preco_asc") return a.preco_lote - b.preco_lote;
      if (sortBy === "preco_desc") return b.preco_lote - a.preco_lote;
      if (sortBy === "nome_asc") return a.nome.localeCompare(b.nome);
      return 0;
    });
  }, [products, activeCategory, search, demandFilter, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Topo Compacto com Pesquisa */}
      <section className="border-b border-border/50 bg-card py-2.5 px-3 sm:px-6">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-2.5 justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar produto, código (ex: A01)..."
              className="pl-9 pr-8 h-9 text-xs rounded-lg bg-muted/40 border-border/60"
              aria-label="Pesquisar produtos"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                aria-label="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setDemandFilter("todos")}
                className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors ${
                  demandFilter === "todos"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setDemandFilter("destaque")}
                className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors flex items-center gap-1 ${
                  demandFilter === "destaque"
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3 h-3" /> Destaques
              </button>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-muted/50 border border-border/60 text-[11px] font-semibold text-foreground rounded-md px-2 py-1 outline-none shrink-0"
              aria-label="Ordenar produtos"
            >
              <option value="relevancia">Relevantes</option>
              <option value="lucro_desc">Maior Lucro</option>
              <option value="preco_asc">Menor Preço</option>
              <option value="preco_desc">Maior Preço</option>
            </select>
          </div>
        </div>
      </section>

      {/* Navegação por Categorias em Pílulas Limpas */}
      <div className="sticky top-12 sm:top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 py-2">
        <div className="container max-w-6xl mx-auto px-3 sm:px-6">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de produtos principal */}
      <main id="produtos" className="container max-w-6xl mx-auto py-4 px-3 sm:px-6">
        {loading ? (
          <Grid>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
            ))}
          </Grid>
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-2">🔍</p>
            <h3 className="font-bold text-base text-foreground">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground text-xs mt-1">
              Tente alterar os termos da pesquisa ou selecione outra categoria.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("Todos");
                setDemandFilter("todos");
              }}
              className="mt-4 px-4 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-md shadow-sm"
            >
              Resetar Filtros
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3 font-medium">
              <span>{filteredAndSorted.length} {filteredAndSorted.length === 1 ? "produto" : "produtos"}</span>
            </div>

            <Grid>{filteredAndSorted.map((p) => <ProductCard key={p.id} product={p} />)}</Grid>

            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center items-center py-8">
                {loadingMore ? (
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> A carregar mais…
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Role para ver mais</span>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border/50 py-6 mt-8 bg-muted/20 text-xs">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-muted-foreground px-3 sm:px-6">
          <p>© {new Date().getFullYear()} Translite Solutions, Lda — Atacado Moçambique</p>
          <div className="flex items-center gap-4 font-medium">
            <Link to="/contactos" className="hover:text-primary">Contactos</Link>
            <Link to="/admin" className="hover:text-primary">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">{children}</div>;
}

export default Index;
