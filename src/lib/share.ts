import type { Product } from "@/types/product";
import { formatCurrency } from "@/lib/whatsapp";
import { toast } from "sonner";

export async function shareProduct(product: Product) {
  const url = `${window.location.origin}/produto/${product.id}`;
  const title = `${product.nome} — Translite Atacado`;
  const text = `🔥 ${product.nome}\n📦 Lote com ${product.quantidade_minima}un por ${formatCurrency(product.preco_lote)}\n💡 Revenda por ${formatCurrency(product.preco_revenda)}/un\nConfira na Loja Translite:`;

  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return;
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.warn("Erro ao compartilhar via Web Share API:", err);
      } else {
        return; // Usuário cancelou a janela de partilha
      }
    }
  }

  // Fallback: copiar para área de transferência
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast.success("Link do produto copiado com sucesso!");
  } catch {
    toast.error("Não foi possível compartilhar ou copiar o link.");
  }
}
