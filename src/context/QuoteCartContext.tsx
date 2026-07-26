import React, { createContext, useContext, useState, useEffect } from "react";
import type { Product } from "@/types/product";
import { toast } from "sonner";
import { formatCurrency, WHATSAPP_NUMBER } from "@/lib/whatsapp";

export interface QuoteItem {
  product: Product;
  lotes: number; // número de lotes
}

export interface ClientQuoteInfo {
  nome?: string;
  empresa?: string;
  nuit?: string;
  provincia?: string;
  whatsapp?: string;
  observacoes?: string;
}

interface QuoteCartContextType {
  items: QuoteItem[];
  addItem: (product: Product, lotes?: number) => void;
  removeItem: (productId: string) => void;
  updateLotes: (productId: string, lotes: number) => void;
  clearCart: () => void;
  totalLotes: number;
  totalUnidades: number;
  totalInvestimento: number;
  totalRetorno: number;
  lucroEstimadoTotal: number;
  sendWhatsappQuote: (clientInfo?: ClientQuoteInfo) => void;
  getFormattedQuoteText: (clientInfo?: ClientQuoteInfo) => string;
}

const QuoteCartContext = createContext<QuoteCartContextType | undefined>(undefined);

const STORAGE_KEY_V2 = "translite_quote_cart_v2";
const STORAGE_KEY_V1 = "translite_quote_cart_v1";

function validateCartItems(parsed: unknown): QuoteItem[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is QuoteItem => {
    return (
      item &&
      typeof item === "object" &&
      item.product &&
      typeof item.product.id === "string" &&
      typeof item.product.nome === "string" &&
      typeof item.product.preco_lote === "number" &&
      typeof item.lotes === "number" &&
      item.lotes > 0
    );
  });
}

export const QuoteCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<QuoteItem[]>(() => {
    try {
      const savedV2 = localStorage.getItem(STORAGE_KEY_V2);
      if (savedV2) {
        return validateCartItems(JSON.parse(savedV2));
      }
      // Migrate from V1 if available
      const savedV1 = localStorage.getItem(STORAGE_KEY_V1);
      if (savedV1) {
        const sanitized = validateCartItems(JSON.parse(savedV1));
        localStorage.removeItem(STORAGE_KEY_V1);
        if (sanitized.length > 0) {
          localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(sanitized));
        }
        return sanitized;
      }
      return [];
    } catch (e) {
      console.warn("Falha ao carregar cotações do localStorage:", e);
      return [];
    }
  });

  useEffect(() => {
    try {
      if (items.length === 0) {
        localStorage.removeItem(STORAGE_KEY_V2);
      } else {
        localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(items));
      }
    } catch (e) {
      console.warn("Falha ao salvar cotações no localStorage:", e);
    }
  }, [items]);

  const addItem = (product: Product, lotesToAdd = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].lotes += lotesToAdd;
        toast.success(`Adicionado +${lotesToAdd} lote de ${product.nome}`);
        return updated;
      }
      toast.success(`${product.nome} adicionado à Cotação!`);
      return [...prev, { product, lotes: lotesToAdd }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
    toast.info("Item removido da cotação");
  };

  const updateLotes = (productId: string, lotes: number) => {
    if (lotes <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, lotes } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    toast.info("Lista de cotação limpa");
  };

  const totalLotes = items.reduce((acc, i) => acc + i.lotes, 0);
  
  const totalUnidades = items.reduce(
    (acc, i) => acc + i.lotes * i.product.quantidade_minima,
    0
  );

  const totalInvestimento = items.reduce(
    (acc, i) => acc + i.lotes * i.product.preco_lote,
    0
  );

  const totalRetorno = items.reduce(
    (acc, i) =>
      acc + i.lotes * i.product.quantidade_minima * i.product.preco_revenda,
    0
  );

  const lucroEstimadoTotal = totalRetorno - totalInvestimento;

  const getFormattedQuoteText = (clientInfo?: ClientQuoteInfo) => {
    if (items.length === 0) return "";

    let text = `📄 *COTACÃO DE ATACADO — TRANSLITE SOLUTIONS*\n`;
    text += `_Importação & Distribuição de Atacado em Moçambique_\n`;
    text += `🗓️ Data: ${new Date().toLocaleDateString("pt-MZ")}\n\n`;

    if (clientInfo?.nome || clientInfo?.empresa || clientInfo?.provincia) {
      text += `👤 *DADOS DO CLIENTE / REVENDEDOR:*\n`;
      if (clientInfo.nome) text += `   • *Nome:* ${clientInfo.nome}\n`;
      if (clientInfo.empresa) text += `   • *Empresa / Loja:* ${clientInfo.empresa}\n`;
      if (clientInfo.nuit) text += `   • *NUIT:* ${clientInfo.nuit}\n`;
      if (clientInfo.provincia) text += `   • *Província / Cidade:* ${clientInfo.provincia}\n`;
      if (clientInfo.whatsapp) text += `   • *WhatsApp:* ${clientInfo.whatsapp}\n`;
      text += `\n`;
    }

    text += `📦 *ITENS DA COTAÇÃO:*\n`;
    items.forEach((item, index) => {
      const p = item.product;
      const unTotal = item.lotes * p.quantidade_minima;
      const subtotal = item.lotes * p.preco_lote;
      text += `${index + 1}. *${p.nome}*\n`;
      if (p.codigo) text += `   • Cód: ${p.codigo}\n`;
      text += `   • Quantidade: ${item.lotes} ${item.lotes === 1 ? 'lote' : 'lotes'} (${unTotal} un)\n`;
      text += `   • Preço do Lote: ${formatCurrency(p.preco_lote)}\n`;
      text += `   • Subtotal: *${formatCurrency(subtotal)}*\n\n`;
    });

    text += `-----------------------------------\n`;
    text += `📊 *RESUMO DO PEDIDO:*\n`;
    text += `📦 Total de Lotes: *${totalLotes}*\n`;
    text += `🔢 Total de Unidades: *${totalUnidades} un*\n`;
    text += `💰 *INVESTIMENTO TOTAL:* *${formatCurrency(totalInvestimento)}*\n`;
    text += `📈 *LUCRO PROJETADO:* *${formatCurrency(lucroEstimadoTotal)}*\n\n`;

    if (clientInfo?.observacoes) {
      text += `📝 *Observações:* ${clientInfo.observacoes}\n\n`;
    }

    text += `🇲🇿 *Condições:* M-Pesa, e-Mola, BCI, Millennium BIM, Standard Bank. Envio para todas as províncias.\n`;
    text += `Por favor, confirmem a disponibilidade e dados para pagamento / entrega. Obrigado!`;

    return text;
  };

  const sendWhatsappQuote = (clientInfo?: ClientQuoteInfo) => {
    if (items.length === 0) {
      toast.error("Sua lista de cotação está vazia!");
      return;
    }

    const text = getFormattedQuoteText(clientInfo);
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
    window.open(url, "_blank");
  };

  return (
    <QuoteCartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateLotes,
        clearCart,
        totalLotes,
        totalUnidades,
        totalInvestimento,
        totalRetorno,
        lucroEstimadoTotal,
        sendWhatsappQuote,
        getFormattedQuoteText,
      }}
    >
      {children}
    </QuoteCartContext.Provider>
  );
};

export const useQuoteCart = () => {
  const context = useContext(QuoteCartContext);
  if (!context) {
    throw new Error("useQuoteCart must be used within a QuoteCartProvider");
  }
  return context;
};
