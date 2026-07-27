import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  Search,
  Loader2,
  X,
  Sparkles,
  Tag,
  Layers,
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

  useEffect(() => {
    setLoading(true);
    const productsCol = collection(db, "products");
    const unsubscribe = onSnapshot(
      productsCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Product[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Product);
          });
          setProducts(list);
          setHasMore(false);
          setLoading(false);
        } else {
          fetch("/api/products")
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => {
              setProducts(Array.isArray(data) ? data : []);
            })
            .catch(() => setProducts([]))
            .finally(() => {
              setHasMore(false);
              setLoading(false);
            });
        }
      },
      () => {
        fetch("/api/products")
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => {
            setProducts(Array.isArray(data) ? data : []);
          })
          .catch(() => setProducts([]))
          .finally(() => {
            setHasMore(false);
            setLoading(false);
          });
      }
    );

    return () => unsubscribe();
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(false);
  }, [hasMore, loadingMore]);

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

      {/* Navegação por Categorias via Componente de Abas (Tabs) */}
      <div className="sticky top-12 sm:top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 py-2 shadow-xs">
        <div className="container max-w-6xl mx-auto px-3 sm:px-6">
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="h-auto p-1 bg-muted/60 rounded-xl flex gap-1 overflow-x-auto no-scrollbar justify-start w-full border border-border/40">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {cat === "Todos" ? <Layers className="w-3.5 h-3.5" /> : <Tag className="w-3 h-3 opacity-70" />}
                  <span>{cat}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
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

      {/* JSON-LD Schemas para SEO no Google Search (Moçambique) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Translite Atacado",
            "alternateName": "Translite Solutions, Lda",
            "url": "https://translite.co.mz",
            "logo": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200",
            "description": "Plataforma de atacado e distribuição de produtos em lote para revendedores em Moçambique.",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "MZ",
              "addressLocality": "Maputo"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+258876751885",
              "email": "comercial@translitelda.com",
              "contactType": "sales",
              "areaServed": "MZ"
            }
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Catálogo de Produtos em Atacado — Moçambique",
            "itemListElement": filteredAndSorted.slice(0, 20).map((product, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Product",
                "name": product.nome,
                "image": product.imagem_url,
                "offers": {
                  "@type": "Offer",
                  "priceCurrency": "MZN",
                  "price": product.preco_lote,
                  "availability": "https://schema.org/InStock"
                }
              }
            }))
          })
        }}
      />

      <footer className="border-t border-border/50 py-6 mt-8 bg-muted/20 text-xs">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-muted-foreground px-3 sm:px-6">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-semibold text-foreground">© {new Date().getFullYear()} Translite Solutions, Lda — Atacado Moçambique</p>
            <p className="text-[11px]">
              📞 <a href="https://wa.me/258876751885" target="_blank" rel="noreferrer" className="hover:underline text-foreground">+258 87 675 1885</a> • ✉️ <a href="mailto:comercial@translitelda.com" className="hover:underline text-foreground">comercial@translitelda.com</a>
            </p>
          </div>
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
