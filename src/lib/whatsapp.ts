// Número WhatsApp do lojista (formato internacional sem +)
export const WHATSAPP_NUMBER = "258876751885";

export const formatCurrency = (value: number | undefined | null) => {
  const num = typeof value === "number" && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN" }).format(num);
};

interface ProductOrderInfo {
  codigo?: string;
  nome: string;
  quantidade: number;
  preco_lote: number;
  preco_revenda: number;
}

export function buildWhatsappLink({ codigo, nome, quantidade, preco_lote, preco_revenda }: ProductOrderInfo) {
  const totalLotes = quantidade;
  const valorTotal = preco_lote * totalLotes;
  const message =
    `Olá! Tenho interesse no seguinte produto:\n\n` +
    (codigo ? `🆔 *Código:* ${codigo}\n` : ``) +
    `📦 *Produto:* ${nome}\n` +
    `🔢 *Quantidade (lotes):* ${totalLotes}\n` +
    `💰 *Preço do lote:* ${formatCurrency(preco_lote)}\n` +
    `💵 *Total:* ${formatCurrency(valorTotal)}\n` +
    `🏷️ *Revenda sugerida (un.):* ${formatCurrency(preco_revenda)}\n\n` +
    `Pode confirmar a disponibilidade?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
