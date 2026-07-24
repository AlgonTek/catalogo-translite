import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { Product, DemandLevel } from "@/types/product";

interface Props {
  product: Product | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSaved, onCancel }: Props) {
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
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const MAX_IMAGES = 4;

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
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
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      set("imagens", [...form.imagens, ...urls].slice(0, MAX_IMAGES));
      toast.success(urls.length > 1 ? `${urls.length} imagens enviadas` : "Imagem enviada");
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
    if (form.imagens.length === 0) {
      toast.error("Adicione pelo menos uma foto");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || null,
        preco_lote: parseFloat(form.preco_lote),
        preco_revenda: parseFloat(form.preco_revenda),
        quantidade_minima: parseInt(form.quantidade_minima, 10),
        categoria: form.categoria,
        imagem_url: form.imagens[0] ?? null,
        imagens: form.imagens,
        destaque: form.destaque,
        mais_vendido: form.mais_vendido,
        demanda: form.demanda,
      };
      const { error } = product
        ? await supabase.from("products").update(payload).eq("id", product.id)
        : await supabase.from("products").insert(payload);
      if (error) throw error;
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

        <div>
          <Label htmlFor="categoria">Categoria *</Label>
          <Input id="categoria" required value={form.categoria} onChange={(e) => set("categoria", e.target.value)} />
        </div>

        <div className="rounded-lg border-2 border-border p-3 space-y-3 bg-muted/30">
          <p className="text-sm font-bold">💰 Composição do lote e preço</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="qtd">Nº de unidades no lote *</Label>
              <Input id="qtd" type="number" min={1} required value={form.quantidade_minima} onChange={(e) => set("quantidade_minima", e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">Quantos produtos vêm em 1 lote</p>
            </div>
            <div>
              <Label htmlFor="lote">Preço total do lote (MT) *</Label>
              <Input id="lote" type="number" step="0.01" min={0} required value={form.preco_lote} onChange={(e) => set("preco_lote", e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">Custo total que o cliente paga pelo lote</p>
            </div>
          </div>

          <div>
            <Label htmlFor="revenda">Preço unitário de revenda (MT) *</Label>
            <Input id="revenda" type="number" step="0.01" min={0} required value={form.preco_revenda} onChange={(e) => set("preco_revenda", e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1">Preço sugerido para o revendedor vender cada unidade</p>
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
      <div className="rounded-md bg-background border border-dashed border-border p-3 text-xs text-muted-foreground">
        Preencha os 3 campos acima para ver a estimativa de lucro.
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

  return (
    <div className={`rounded-md border p-3 space-y-1.5 text-sm ${negativo ? "border-destructive/50 bg-destructive/5" : "border-profit/40 bg-profit/5"}`}>
      <p className="text-xs font-bold uppercase tracking-wide mb-1">Estimativa automática</p>
      <div className="flex justify-between"><span className="text-muted-foreground">Custo unitário (lote ÷ unidades)</span><span className="font-semibold">{fmt(custoUnit)}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Lucro por unidade</span><span className={`font-semibold ${negativo ? "text-destructive" : "text-profit"}`}>{fmt(lucroUnit)}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Revenda total do lote</span><span className="font-semibold">{fmt(revendaTotal)}</span></div>
      <div className="border-t border-border/60 pt-1.5 flex justify-between items-center">
        <span className="font-bold">Lucro estimado por lote</span>
        <span className={`text-base font-extrabold ${negativo ? "text-destructive" : "text-profit"}`}>{fmt(lucroLote)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Margem sobre o investimento</span>
        <span className={`font-semibold ${negativo ? "text-destructive" : "text-profit"}`}>{margemPct.toFixed(1)}%</span>
      </div>
      {negativo && (
        <p className="text-xs text-destructive font-semibold mt-1">⚠️ Preço de revenda abaixo do custo — o revendedor terá prejuízo.</p>
      )}
    </div>
  );
}
