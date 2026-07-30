import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, LogOut, Package, Search, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types/product";
import { ProductForm } from "@/components/admin/ProductForm";
import { formatCurrency } from "@/lib/whatsapp";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Admin = () => {
  const navigate = useNavigate();
  const { user, session, isAdmin, loading, signOut } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  useEffect(() => { document.title = "Admin — AtacadoPro"; }, []);

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
          setListLoading(false);
        } else {
          loadProductsFromApi();
        }
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
      // 1. Delete from Firestore
      try {
        await deleteDoc(doc(db, "products", id));
      } catch (fsErr) {
        console.warn("Erro ao deletar documento no Firestore:", fsErr);
      }

      // 2. Delete from API
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: { "X-User-Id": user?.uid || "" },
      });
      if (res.ok) {
        toast.success("Produto excluído");
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

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return products;
    return products.filter((p) =>
      p.nome.toLowerCase().includes(t) ||
      p.categoria.toLowerCase().includes(t) ||
      (p.codigo ?? "").toLowerCase().includes(t)
    );
  }, [products, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container py-8 space-y-4">
          <Skeleton className="h-12 w-1/3" /><Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (creating || editing) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container py-8 max-w-3xl">
          <ProductForm
            product={editing}
            onSaved={() => { setCreating(false); setEditing(null); loadProducts(); }}
            onCancel={() => { setCreating(false); setEditing(null); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl">Painel Administrativo</h1>
              <Badge variant="outline" className="text-[10px] font-medium border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 gap-1 hidden sm:inline-flex">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Sessão Protegida (30m Inatividade)
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{products.length} produto(s) no catálogo</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
            <Button onClick={() => setCreating(true)} className="gradient-primary text-primary-foreground border-0 font-bold">
              <Plus className="w-4 h-4 mr-1" /> Novo produto
            </Button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Pesquisar por código, nome ou categoria…"
            className="pl-9"
            aria-label="Pesquisar produtos"
          />
        </div>

        {listLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : products.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
            <Package className="w-12 h-12 stroke-1 opacity-50" />
            <div>
              <p className="font-bold text-foreground">Nenhum produto cadastrado na base de dados.</p>
              <p className="text-xs text-muted-foreground mt-1">Comece adicionando o seu primeiro produto ao catálogo.</p>
            </div>
            <Button onClick={() => setCreating(true)} variant="default" className="gradient-primary text-primary-foreground font-bold text-xs mt-2">
              <Plus className="w-4 h-4 mr-1.5" /> Adicionar Primeiro Produto
            </Button>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum produto corresponde à pesquisa.</p>
          </Card>
        ) : (
          <>
            <div className="grid gap-3">
              {paginated.map((p) => (
                <Card key={p.id} className="p-3 sm:p-4 flex gap-3 items-center hover:shadow-soft transition-base">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {p.imagem_url ? (
                      <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground"><Package className="w-6 h-6" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-1 items-center">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{p.codigo}</span>
                      <Badge variant="outline" className="text-xs">{p.categoria}</Badge>
                      {p.destaque && <Badge className="text-xs gradient-accent text-accent-foreground border-0">Destaque</Badge>}
                      {p.mais_vendido && <Badge className="text-xs bg-secondary text-secondary-foreground border-0">Mais vendido</Badge>}
                    </div>
                    <h3 className="font-bold truncate">{p.nome}</h3>
                    <p className="text-xs text-muted-foreground">
                      Lote {formatCurrency(p.preco_lote)} · Lucro {formatCurrency(p.lucro_estimado ?? ((p.preco_revenda ?? 0) * (p.quantidade_minima ?? 1) - (p.preco_lote ?? 0)))}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(p)} aria-label="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeletingId(p.id)} aria-label="Excluir">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 mt-5">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  Página {currentPage} de {totalPages} · {filtered.length} produto(s)
                </span>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Seguinte <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
