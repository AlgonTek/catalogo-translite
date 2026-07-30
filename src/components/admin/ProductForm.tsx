import { useState, useEffect } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X, Plus, Calculator, TrendingUp, Sparkles, Check, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import type { Product, DemandLevel } from "@/types/product";

// Default Categories list as fallback
const DEFAULT_CATEGORIES = [
  "Eletrónicos",
  "Acessórios",
  "Calçados",
  "Casa & Cozinha",
  "Moda & Vestuário",
  "Beleza & Cosméticos",
  "Telefones & Tablets",
  "Relógios & Bijuteria",
  "Bolsas & Malas",
  "Outros",
];

// Zod client-side schema for Admin form validation
const productFormSchema = z.object({
  nome: z.string().trim().min(2, "O nome do produto deve ter pelo menos 2 caracteres"),
  categoria: z.string().trim().min(1, "Indique uma categoria válida para o produto"),
  preco_lote: z
    .number({ invalid_type_error: "Insira um valor numérico válido para o preço do lote" })
    .positive("O preço do lote deve ser maior que 0 MT"),
  preco_revenda: z
    .number({ invalid_type_error: "Insira um valor numérico válido para o preço de revenda" })
    .positive("O preço de revenda unitário deve ser maior que 0 MT"),
  quantidade_minima: z
    .number({ invalid_type_error: "Insira uma quantidade de unidades válida" })
    .int("A quantidade de unidades por lote deve ser um número inteiro")
    .min(1, "O lote deve incluir pelo menos 1 unidade"),
  imagens: z.array(z.string()).optional().default([]),
  demanda: z.enum(["baixa", "media", "alta"]),
  destaque: z.boolean(),
  mais_vendido: z.boolean(),
  descricao: z.string().nullable().optional(),
});


interface Props {
  product: Product | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSaved, onCancel }: Props) {
  const { user } = useAuth();
  const initialImages = (() => {
    const arr = product?.imagens && product.imagens.length > 0
      ? [...product.imagens]
      : product?.imagem_url ? [product.imagem_url] : [];
    return arr.slice(0, 4);
  })();
  const [form, setForm] = useState({
    nome: product?.nome ?? "",
    descricao: product?.descricao ?? "",
    preco_lote: product?.preco_lote?.toString() ?? "",
    preco_revenda: product?.preco_revenda?.toString() ?? "",
    quantidade_minima: product?.quantidade_minima?.toString() ?? "1",
    categoria: product?.categoria ?? "",
    imagens: initialImages as string[],
    destaque: product?.destaque ?? false,
    mais_vendido: product?.mais_vendido ?? false,
    demanda: (product?.demanda ?? "media") as DemandLevel,
  });
  const [categoryList, setCategoryList] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(
    Boolean(product?.categoria && !DEFAULT_CATEGORIES.includes(product.categoria))
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const MAX_IMAGES = 4;

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setCategoryList(data);
            if (product?.categoria && !data.includes(product.categoria)) {
              setIsCustomCategory(true);
            }
          }
        }
      } catch {
        // Fallback to DEFAULT_CATEGORIES
      }
    }
    loadCategories();
  }, [product?.categoria]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Quick Markup Helper function
  function applyMarkup(percentage: number) {
    const qtd = parseInt(form.quantidade_minima, 10);
    const precoLote = parseFloat(form.preco_lote);
    if (!qtd || qtd <= 0 || !precoLote || precoLote <= 0) {
      toast.error("Insira o nº de unidades e o preço do lote primeiro.");
      return;
    }
    const custoUnitario = precoLote / qtd;
    const precoSugerido = custoUnitario * (1 + percentage / 100);
    set("preco_revenda", precoSugerido.toFixed(2));
    toast.success(`Preço de revenda ajustado para margem de ${percentage}% (+${(precoSugerido - custoUnitario).toFixed(2)} MT/un)`);
  }

  async function handleUpload(files: FileList) {
    const remaining = MAX_IMAGES - form.imagens.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_IMAGES} fotos por produto`);
      return;
    }
    const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of list) {
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        if (!ALLOWED_MIME.includes(file.type) || !ALLOWED_EXT.includes(ext)) {
          throw new Error(`Tipo de ficheiro não permitido: ${file.name}. Use JPG, PNG, WEBP ou GIF.`);
        }
        if (file.size > MAX_SIZE) {
          throw new Error(`Imagem demasiado grande (máx 5MB): ${file.name}`);
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        urls.push(dataUrl);
      }
      set("imagens", [...form.imagens, ...urls].slice(0, MAX_IMAGES));
      toast.success(urls.length > 1 ? `${urls.length} imagens adicionadas` : "Imagem adicionada");
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message ?? "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    set("imagens", form.imagens.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const rawPayload = {
      nome: form.nome,
      descricao: form.descricao || null,
      preco_lote: parseFloat(form.preco_lote),
      preco_revenda: parseFloat(form.preco_revenda),
      quantidade_minima: parseInt(form.quantidade_minima, 10),
      categoria: form.categoria,
      imagens: form.imagens,
      destaque: form.destaque,
      mais_vendido: form.mais_vendido,
      demanda: form.demanda,
    };

    const parseResult = productFormSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || "Dados de formulário inválidos";
      toast.error(firstError);
      return;
    }

    const validated = parseResult.data;
    const finalImagens = validated.imagens && validated.imagens.length > 0
      ? validated.imagens
      : ["https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600&auto=format&fit=crop&q=80"];

    setSaving(true);
    try {
      const payload = {
        ...validated,
        imagens: finalImagens,
        imagem_url: finalImagens[0],
      };

      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PUT" : "POST";

      const productId = product?.id || payload.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const payloadWithId = { ...payload, id: productId };

      // Sync to Firestore
      try {
        const productRef = doc(db, "products", productId);
        await setDoc(productRef, payloadWithId, { merge: true });
      } catch (fsErr) {
        console.warn("Aviso ao sincronizar produto no Firestore:", fsErr);
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user?.uid || "",
        },
        body: JSON.stringify(payloadWithId),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar no Cloud SQL");
      }

      toast.success(product ? "Produto atualizado" : "Produto criado");
      onSaved();
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <h1 className="text-2xl mb-6">{product ? "Editar produto" : "Novo produto"}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Imagens (até 4) */}
        <div>
          <Label>Fotos do produto ({form.imagens.length}/{MAX_IMAGES})</Label>
          <p className="text-xs text-muted-foreground mb-2">A primeira foto será a capa.</p>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {form.imagens.map((url, idx) => (
              <div key={url} className="relative aspect-square">
                <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover rounded-lg border" />
                {idx === 0 && (
                  <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">Capa</span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                  aria-label="Remover foto"
                ><X className="w-3 h-3" /></button>
              </div>
            ))}
            {form.imagens.length < MAX_IMAGES && (
              <label className="aspect-square flex flex-col items-center justify-center gap-1 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-muted/30 transition-base">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                <span className="text-[10px] text-muted-foreground text-center px-1">{uploading ? "Enviando..." : "Adicionar"}</span>
                <input
                  type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" disabled={uploading}
                  onChange={(e) => e.target.files && e.target.files.length > 0 && handleUpload(e.target.files)}
                />
              </label>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="nome">Nome *</Label>
          <Input id="nome" required value={form.nome} onChange={(e) => set("nome", e.target.value)} />
        </div>

        <div>
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea id="descricao" rows={3} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
        </div>

        {/* Categoria estruturada */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="categoria">Categoria *</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-primary px-2"
              onClick={() => {
                setIsCustomCategory(!isCustomCategory);
                if (isCustomCategory) {
                  set("categoria", categoryList[0] || "Eletrónicos");
                } else {
                  set("categoria", "");
                }
              }}
            >
              {isCustomCategory ? "← Escolher da lista" : "+ Criar nova categoria"}
            </Button>
          </div>

          {isCustomCategory ? (
            <div className="flex gap-2">
              <Input
                id="categoria"
                required
                placeholder="Ex: Utilidades Domésticas, Games..."
                value={form.categoria}
                onChange={(e) => set("categoria", e.target.value)}
                className="flex-1"
              />
            </div>
          ) : (
            <Select
              value={form.categoria}
              onValueChange={(val) => {
                if (val === "NEW_CATEGORY") {
                  setIsCustomCategory(true);
                  set("categoria", "");
                } else {
                  set("categoria", val);
                }
              }}
            >
              <SelectTrigger id="categoria">
                <SelectValue placeholder="Selecione uma categoria..." />
              </SelectTrigger>
              <SelectContent>
                {categoryList.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
                <SelectItem value="NEW_CATEGORY" className="font-semibold text-primary">
                  + Outra categoria personalizada...
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Composição do Lote e Calculadora de Margem de Lucro */}
        <div className="rounded-lg border-2 border-primary/20 p-4 space-y-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold text-foreground">Calculadora de Precificação & Margem de Lucro</p>
            </div>
            <span className="text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">Moçambique (MZN)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="qtd">Nº de unidades no lote *</Label>
              <Input id="qtd" type="number" min={1} required value={form.quantidade_minima} onChange={(e) => set("quantidade_minima", e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">Quantos produtos vêm em 1 lote</p>
            </div>
            <div>
              <Label htmlFor="lote">Preço total do lote (MT) *</Label>
              <Input id="lote" type="number" step="0.01" min={0} required value={form.preco_lote} onChange={(e) => set("preco_lote", e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">Custo total pago pelo cliente pelo lote</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="revenda">Preço unitário de revenda (MT) *</Label>
              <span className="text-[11px] text-muted-foreground font-medium">Sugerir margem rápida:</span>
            </div>
            <Input id="revenda" type="number" step="0.01" min={0} required value={form.preco_revenda} onChange={(e) => set("preco_revenda", e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1">Preço recomendado ao revendedor para vender cada unidade no mercado</p>

            {/* Botões de atalho de margem rápida */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] text-muted-foreground flex items-center mr-1"><Sparkles className="w-3 h-3 mr-0.5 text-amber-500" /> Auto-ajustar:</span>
              <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 py-0" onClick={() => applyMarkup(30)}>+30%</Button>
              <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 py-0 font-medium border-primary/40 text-primary" onClick={() => applyMarkup(50)}>+50% (Padrão)</Button>
              <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 py-0 font-medium border-emerald-500/40 text-emerald-600" onClick={() => applyMarkup(100)}>+100% (Dobro)</Button>
              <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 py-0" onClick={() => applyMarkup(150)}>+150%</Button>
            </div>
          </div>

          <ProfitPreview
            qtd={parseInt(form.quantidade_minima, 10)}
            precoLote={parseFloat(form.preco_lote)}
            precoRevenda={parseFloat(form.preco_revenda)}
          />
        </div>

        <div>
          <Label>Nível de demanda</Label>
          <Select value={form.demanda} onValueChange={(v) => set("demanda", v as DemandLevel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border">
          <Label htmlFor="destaque" className="cursor-pointer">⭐ Produto em destaque</Label>
          <Switch id="destaque" checked={form.destaque} onCheckedChange={(v) => set("destaque", v)} />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border">
          <Label htmlFor="mais_vendido" className="cursor-pointer">🔥 Mais vendido</Label>
          <Switch id="mais_vendido" checked={form.mais_vendido} onCheckedChange={(v) => set("mais_vendido", v)} />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancelar</Button>
          <Button type="submit" disabled={saving} className="flex-1 gradient-primary text-primary-foreground border-0 font-bold">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {product ? "Salvar alterações" : "Criar produto"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ProfitPreview({ qtd, precoLote, precoRevenda }: { qtd: number; precoLote: number; precoRevenda: number }) {
  const valid = Number.isFinite(qtd) && qtd > 0 && Number.isFinite(precoLote) && precoLote > 0 && Number.isFinite(precoRevenda) && precoRevenda > 0;
  if (!valid) {
    return (
      <div className="rounded-md bg-background/80 border border-dashed border-border/80 p-3 text-xs text-muted-foreground text-center">
        💡 Preencha o nº de unidades, custo do lote e preço de revenda para ver o cálculo de margem em tempo real.
      </div>
    );
  }
  const custoUnit = precoLote / qtd;
  const lucroUnit = precoRevenda - custoUnit;
  const lucroLote = lucroUnit * qtd; // = revenda*qtd - precoLote
  const revendaTotal = precoRevenda * qtd;
  const margemPct = (lucroLote / precoLote) * 100;
  const fmt = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN", maximumFractionDigits: 2 }).format(n);
  const negativo = lucroLote < 0;
  const margemExcelente = margemPct >= 40;
  const margemBaixa = margemPct < 20 && !negativo;

  return (
    <div className={`rounded-lg border p-3.5 space-y-2 text-sm shadow-xs ${
      negativo 
        ? "border-destructive/50 bg-destructive/5" 
        : margemExcelente 
        ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20" 
        : "border-primary/30 bg-primary/5"
    }`}>
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-primary" /> Análise de Lucratividade
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          negativo 
            ? "bg-destructive/20 text-destructive" 
            : margemExcelente 
            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" 
            : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
        }`}>
          {negativo ? "Prejuízo ⚠️" : margemExcelente ? "Alta Margem 🔥" : "Margem Moderada ⚖️"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
        <div>
          <span className="text-muted-foreground block">Custo unitário:</span>
          <span className="font-semibold text-foreground text-sm">{fmt(custoUnit)}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Lucro p/ unidade:</span>
          <span className={`font-semibold text-sm ${negativo ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
            {fmt(lucroUnit)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">Faturação total lote:</span>
          <span className="font-semibold text-foreground">{fmt(revendaTotal)}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">ROI / Margem:</span>
          <span className={`font-bold ${negativo ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
            {margemPct.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="border-t border-border/60 pt-2 flex justify-between items-center">
        <span className="font-bold text-xs uppercase tracking-wider">Lucro do Revendedor por Lote:</span>
        <span className={`text-base font-extrabold ${negativo ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
          {fmt(lucroLote)}
        </span>
      </div>

      {negativo && (
        <p className="text-xs text-destructive font-semibold pt-1 border-t border-destructive/20">
          ⚠️ O preço de revenda unitário ({fmt(precoRevenda)}) é inferior ao custo por unidade ({fmt(custoUnit)}). Ajuste o valor para garantir rentabilidade ao revendedor.
        </p>
      )}
      {margemBaixa && (
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium pt-1">
          💡 Dica: Uma margem inferior a 20% pode reduzir o interesse dos revendedores. Considere utilizar os botões de ajuste acima (+30% ou +50%).
        </p>
      )}
    </div>
  );
}
