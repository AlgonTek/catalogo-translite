import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  LogOut,
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LayoutDashboard,
  Layers,
  Store,
  Menu,
  X,
  BarChart3,
  TrendingUp,
  Tag,
  CheckCircle,
  Clock,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types/product";
import { ProductForm } from "@/components/admin/ProductForm";
import { formatCurrency } from "@/lib/whatsapp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AdminTab = "products" | "overview" | "categories" | "security";

const Admin = () => {
  const navigate = useNavigate();
  const { user, session, isAdmin, loading, signOut } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<AdminTab>("products");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  useEffect(() => {
    document.title = "Painel Administrativo — Translite";
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!session && !isAdmin) {
      navigate("/auth", { replace: true });
      return;
    }

    setListLoading(true);

    // Subscribe to Firestore real-time products collection
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
        } else {
          setProducts([]);
        }
        setListLoading(false);
      },
      (error) => {
        console.warn("Aviso ao conectar ao Firestore, a usar API de contingência:", error);
        loadProductsFromApi();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [loading, session, isAdmin, navigate]);

  async function loadProductsFromApi() {
    setListLoading(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? (data as Product[]) : []);
      } else {
        setProducts([]);
      }
    } catch {
      setProducts([]);
    } finally {
      setListLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      try {
        await deleteDoc(doc(db, "products", id));
      } catch (fsErr) {
        console.warn("Erro ao deletar documento no Firestore:", fsErr);
      }

      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: { "X-User-Id": user?.uid || "" },
      });
      if (res.ok) {
        toast.success("Produto excluído do catálogo");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erro ao excluir produto");
      }
    } catch {
      toast.error("Erro de conexão ao excluir");
    }
    setDeletingId(null);
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  // Categories extraction
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered products calculation
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !t ||
        p.nome.toLowerCase().includes(t) ||
        p.categoria.toLowerCase().includes(t) ||
        (p.codigo ?? "").toLowerCase().includes(t);
      const matchesCategory =
        selectedCategory === "all" || p.categoria === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  // Overview stats
  const stats = useMemo(() => {
    const totalCatalogValue = products.reduce((acc, p) => acc + (p.preco_lote || 0), 0);
    const totalPotentialProfit = products.reduce((acc, p) => {
      const profit = p.lucro_estimado ?? ((p.preco_revenda ?? 0) * (p.quantidade_minima ?? 1) - (p.preco_lote ?? 0));
      return acc + (profit > 0 ? profit : 0);
    }, 0);
    const highDemandCount = products.filter((p) => p.demanda === "alta").length;
    const featuredCount = products.filter((p) => p.destaque).length;

    return {
      totalCatalogValue,
      totalPotentialProfit,
      highDemandCount,
      featuredCount,
      categoriesCount: categoriesList.length,
    };
  }, [products, categoriesList]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="space-y-4 text-center max-w-sm w-full">
          <Skeleton className="h-12 w-12 rounded-xl mx-auto" />
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col lg:flex-row font-sans text-foreground">
      {/* Mobile Top Header */}
      <header className="lg:hidden bg-card border-b border-border/60 p-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-black text-sm">
            T
          </div>
          <span className="font-bold text-base tracking-tight">Translite Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label="Alternar menu"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Sidebar Component */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border/60 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Sidebar Header */}
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-black text-base shadow-xs">
                T
              </div>
              <div>
                <span className="font-black text-base tracking-tight block leading-none">
                  Translite
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                  Atacado & Lotes
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/80">
              Workspace
            </div>

            <button
              onClick={() => {
                setActiveTab("products");
                setCreating(false);
                setEditing(null);
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "products" && !creating && !editing
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4" />
                <span>Catálogo</span>
              </div>
              <Badge
                variant="secondary"
                className={`text-[10px] font-mono px-1.5 py-0.2 ${
                  activeTab === "products" && !creating && !editing
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : ""
                }`}
              >
                {products.length}
              </Badge>
            </button>

            <button
              onClick={() => {
                setActiveTab("overview");
                setCreating(false);
                setEditing(null);
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "overview"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("categories");
                setCreating(false);
                setEditing(null);
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "categories"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Categorias</span>
              </div>
              <span className="text-xs text-muted-foreground">{categoriesList.length}</span>
            </button>

            <div className="pt-4 px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/80">
              Sistema
            </div>

            <button
              onClick={() => {
                setActiveTab("security");
                setCreating(false);
                setEditing(null);
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "security"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Segurança & Sessão</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border/50 space-y-2 bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
          >
            <Store className="w-4 h-4 mr-2" />
            <span>Ver Loja Pública</span>
          </Button>

          <div className="p-2.5 rounded-lg bg-card border border-border/50 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">
                {user?.email || "Administrador"}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ativo
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
              title="Encerrar sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Workspace Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {creating
                  ? "Novo Produto"
                  : editing
                  ? "Editar Produto"
                  : activeTab === "products"
                  ? "Catálogo de Produtos"
                  : activeTab === "overview"
                  ? "Visão Geral & Métricas"
                  : activeTab === "categories"
                  ? "Gestão por Categorias"
                  : "Segurança & Sessão"}
              </h1>
              <Badge
                variant="outline"
                className="text-[10px] font-medium border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 gap-1 hidden md:inline-flex"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Sessão Ativa
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {creating || editing
                ? "Preencha os detalhes do lote abaixo para publicar no catálogo."
                : activeTab === "products"
                ? `Gerencie e edite os ${products.length} lote(s) disponíveis no sistema.`
                : activeTab === "overview"
                ? "Resumo das métricas de catálogo e estimativas financeiras."
                : activeTab === "categories"
                ? "Organização e distribuição de lotes por categorias."
                : "Parâmetros de autenticação e proteção do painel."}
            </p>
          </div>

          {/* Action Bar */}
          {!creating && !editing && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCreating(true)}
                className="gradient-primary text-primary-foreground border-0 font-bold shadow-xs hover:opacity-95"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Criar Novo Lote
              </Button>
            </div>
          )}
        </div>

        {/* Content Render Conditionals */}
        {creating || editing ? (
          <div className="max-w-3xl">
            <ProductForm
              product={editing}
              onSaved={() => {
                setCreating(false);
                setEditing(null);
              }}
              onCancel={() => {
                setCreating(false);
                setEditing(null);
              }}
            />
          </div>
        ) : activeTab === "products" ? (
          /* PRODUCTS CATALOG TAB WORKSPACE */
          <div className="space-y-4">
            {/* Filter & Search Toolbar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Pesquisar por código, nome do produto ou categoria…"
                  className="pl-9 bg-card"
                  aria-label="Pesquisar produtos"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-card border border-input rounded-md px-3 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                >
                  <option value="all">Todas as Categorias ({products.length})</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} ({products.filter((p) => p.categoria === cat).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List State */}
            {listLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3 bg-card">
                <Package className="w-12 h-12 stroke-1 opacity-50 text-primary" />
                <div>
                  <p className="font-bold text-foreground">Nenhum produto cadastrado na base de dados.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Comece adicionando o seu primeiro produto ao catálogo.
                  </p>
                </div>
                <Button
                  onClick={() => setCreating(true)}
                  variant="default"
                  className="gradient-primary text-primary-foreground font-bold text-xs mt-2"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Adicionar Primeiro Produto
                </Button>
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground bg-card">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium text-foreground">Nenhum produto corresponde aos filtros aplicados.</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                  }}
                  className="text-xs text-primary mt-1"
                >
                  Limpar filtros
                </Button>
              </Card>
            ) : (
              <>
                <div className="grid gap-3">
                  {paginated.map((p) => (
                    <Card
                      key={p.id}
                      className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center hover:shadow-soft transition-base bg-card border-border/60"
                    >
                      <div className="w-full sm:w-20 h-24 sm:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                        {p.imagem_url ? (
                          <img
                            src={p.imagem_url}
                            alt={p.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-muted-foreground">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1.5 mb-1 items-center">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {p.codigo}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {p.categoria}
                          </Badge>
                          {p.destaque && (
                            <Badge className="text-[10px] gradient-accent text-accent-foreground border-0">
                              Destaque
                            </Badge>
                          )}
                          {p.mais_vendido && (
                            <Badge className="text-[10px] bg-secondary text-secondary-foreground border-0">
                              Mais vendido
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-bold text-sm sm:text-base truncate">{p.nome}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Lote ({p.quantidade_minima || 1} un):{" "}
                          <strong className="text-foreground">{formatCurrency(p.preco_lote)}</strong> ·
                          Revenda un: <strong className="text-foreground">{formatCurrency(p.preco_revenda)}</strong> ·
                          Lucro:{" "}
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(
                              p.lucro_estimado ??
                                (p.preco_revenda ?? 0) * (p.quantidade_minima ?? 1) -
                                  (p.preco_lote ?? 0)
                            )}
                          </strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(p)}
                          className="h-8 text-xs"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingId(p.id)}
                          className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-2 mt-5 bg-card p-3 rounded-lg border border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground font-medium">
                      Página {currentPage} de {totalPages} · {filtered.length} produto(s)
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Seguinte <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === "overview" ? (
          /* OVERVIEW TAB WORKSPACE */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 bg-card border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Total de Lotes
                  </span>
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{products.length}</span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    {stats.categoriesCount} categorias ativas
                  </span>
                </div>
              </Card>

              <Card className="p-4 bg-card border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Valor Total Lotes
                  </span>
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">
                    {formatCurrency(stats.totalCatalogValue)}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    Atacado estimado
                  </span>
                </div>
              </Card>

              <Card className="p-4 bg-card border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Lucro Potencial Total
                  </span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(stats.totalPotentialProfit)}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    Margem estimada p/ clientes
                  </span>
                </div>
              </Card>

              <Card className="p-4 bg-card border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Lotes em Alta</span>
                  <Tag className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{stats.highDemandCount}</span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    {stats.featuredCount} em Destaque
                  </span>
                </div>
              </Card>
            </div>

            {/* Category breakdown overview */}
            <Card className="p-5 bg-card border-border/60 space-y-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Distribuição de Produtos por Categoria
              </h3>
              {categoriesList.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma categoria registrada.</p>
              ) : (
                <div className="space-y-3">
                  {categoriesList.map((cat) => {
                    const count = products.filter((p) => p.categoria === cat).length;
                    const pct = Math.round((count / (products.length || 1)) * 100);
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>{cat}</span>
                          <span className="text-muted-foreground">
                            {count} produto(s) ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        ) : activeTab === "categories" ? (
          /* CATEGORIES TAB WORKSPACE */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoriesList.map((cat) => {
                const catProducts = products.filter((p) => p.categoria === cat);
                return (
                  <Card key={cat} className="p-4 bg-card border-border/60 space-y-3">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <h4 className="font-bold text-sm">{cat}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {catProducts.length} lotes
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      {catProducts.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs text-muted-foreground py-1 border-b border-border/20 last:border-0"
                        >
                          <span className="truncate pr-2 font-medium text-foreground">{p.nome}</span>
                          <span className="font-mono text-[10px]">{formatCurrency(p.preco_lote)}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setActiveTab("products");
                      }}
                      className="w-full text-xs"
                    >
                      Ver lotes desta categoria
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          /* SECURITY TAB WORKSPACE */
          <div className="max-w-2xl space-y-4">
            <Card className="p-5 bg-card border-border/60 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Autenticação e Permissões</h3>
                  <p className="text-xs text-muted-foreground">
                    Configuração de proteção de sessão e controlo de acesso.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs divide-y divide-border/40">
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Tempo limite de inatividade:
                  </span>
                  <span className="font-bold text-foreground">30 minutos</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" /> Duração máxima de sessão local:
                  </span>
                  <span className="font-bold text-foreground">2 horas</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Firestore Security Rules:
                  </span>
                  <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20">
                    Ativas & Validadas
                  </Badge>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Utilizador autenticado:
                  </span>
                  <span className="font-mono font-medium">{user?.email || "admin@translite.co.mz"}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border/40">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full text-xs font-bold"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" /> Encerrar Sessão de Administrador
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o produto permanentemente do catálogo e do Firestore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
