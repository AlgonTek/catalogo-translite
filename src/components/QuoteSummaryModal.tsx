import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Printer,
  Copy,
  MessageCircle,
  Building2,
  User,
  MapPin,
  Check,
  Package,
  TrendingUp,
  FileCheck2,
} from "lucide-react";
import { useQuoteCart, ClientQuoteInfo } from "@/context/QuoteCartContext";
import { formatCurrency } from "@/lib/whatsapp";
import { toast } from "sonner";

interface QuoteSummaryModalProps {
  children?: React.ReactNode;
}

export function QuoteSummaryModal({ children }: QuoteSummaryModalProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientQuoteInfo>({
    nome: "",
    empresa: "",
    nuit: "",
    provincia: "Maputo",
    whatsapp: "",
    observacoes: "",
  });

  const {
    items,
    totalLotes,
    totalUnidades,
    totalInvestimento,
    lucroEstimadoTotal,
    sendWhatsappQuote,
    getFormattedQuoteText,
  } = useQuoteCart();

  const handleCopyText = () => {
    const text = getFormattedQuoteText(clientInfo);
    if (!text) {
      toast.error("Não há itens na cotação.");
      return;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Cotação em texto formatado copiada para a área de transferência!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const quoteRef = `COT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2 font-bold text-xs sm:text-sm">
            <FileText className="w-4 h-4 text-primary" />
            Gerar Resumo Formal / PDF
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-background">
        <DialogHeader className="border-b border-border pb-3 no-print">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
              <FileCheck2 className="w-5 h-5 text-primary" />
              Cotação Formal / Fatura Proforma
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
              {quoteRef}
            </Badge>
          </div>
        </DialogHeader>

        {/* Formulário Opcional de Dados do Cliente / Revendedor */}
        <div className="bg-muted/30 border border-border/80 rounded-lg p-3 space-y-3 no-print">
          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary" /> Dados do Cliente / Revendedor (Opcional para incluir na Cotação)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <Label htmlFor="q-nome" className="text-[11px] text-muted-foreground">Nome do Cliente</Label>
              <Input
                id="q-nome"
                placeholder="Ex: João Sitoe"
                className="h-8 text-xs bg-background"
                value={clientInfo.nome}
                onChange={(e) => setClientInfo((c) => ({ ...c, nome: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="q-empresa" className="text-[11px] text-muted-foreground">Nome da Loja / Empresa</Label>
              <Input
                id="q-empresa"
                placeholder="Ex: Mercearia Central"
                className="h-8 text-xs bg-background"
                value={clientInfo.empresa}
                onChange={(e) => setClientInfo((c) => ({ ...c, empresa: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="q-provincia" className="text-[11px] text-muted-foreground">Província / Cidade</Label>

              <Input
                id="q-provincia"
                placeholder="Ex: Maputo, Beira, Nampula"
                className="h-8 text-xs bg-background"
                value={clientInfo.provincia}
                onChange={(e) => setClientInfo((c) => ({ ...c, provincia: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="q-nuit" className="text-[11px] text-muted-foreground">NUIT (se aplicável)</Label>
              <Input
                id="q-nuit"
                placeholder="Ex: 400123456"
                className="h-8 text-xs bg-background"
                value={clientInfo.nuit}
                onChange={(e) => setClientInfo((c) => ({ ...c, nuit: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="q-whatsapp" className="text-[11px] text-muted-foreground">Contacto / WhatsApp</Label>
              <Input
                id="q-whatsapp"
                placeholder="+258 84/86/87..."
                className="h-8 text-xs bg-background"
                value={clientInfo.whatsapp}
                onChange={(e) => setClientInfo((c) => ({ ...c, whatsapp: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="q-obs" className="text-[11px] text-muted-foreground">Observações de Envio</Label>
              <Input
                id="q-obs"
                placeholder="Ex: Entrega via transportadora Junta"
                className="h-8 text-xs bg-background"
                value={clientInfo.observacoes}
                onChange={(e) => setClientInfo((c) => ({ ...c, observacoes: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* DOCUMENTO FORMAL DE COTAÇÃO (Imprimível em PDF / Papel) */}
        <div className="printable-quote border border-border rounded-xl p-6 bg-card text-card-foreground shadow-xs space-y-6">
          {/* Cabeçalho da Empresa */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-primary tracking-tight">TRANSLITE SOLUTIONS</h2>
              <p className="text-xs text-muted-foreground font-medium">Importação & Distribuição de Produtos de Atacado</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                📍 Maputo, Moçambique • 📞 (+258) 87 675 1885 • 🌐 www.translitesolutions.co.mz
              </p>
            </div>
            <div className="text-left sm:text-right bg-muted/30 p-3 rounded-lg border border-border/50">
              <Badge className="bg-primary text-primary-foreground font-bold mb-1">COTAÇÃO PROFORMA</Badge>
              <p className="text-xs font-mono font-bold">Nº: {quoteRef}</p>
              <p className="text-xs text-muted-foreground">Data: {new Date().toLocaleDateString("pt-MZ")}</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Validade: 5 dias úteis</p>
            </div>
          </div>

          {/* Dados do Destinatário */}
          {(clientInfo.nome || clientInfo.empresa || clientInfo.provincia || clientInfo.nuit) && (
            <div className="grid grid-cols-2 gap-4 text-xs bg-muted/20 p-3 rounded-md border border-border/40">
              <div>
                <span className="text-muted-foreground block text-[10px] font-bold uppercase">Cliente / Destinatário:</span>
                <p className="font-bold text-foreground">{clientInfo.nome || "Cliente Geral"}</p>
                {clientInfo.empresa && <p className="text-muted-foreground">{clientInfo.empresa}</p>}
                {clientInfo.nuit && <p className="text-muted-foreground font-mono">NUIT: {clientInfo.nuit}</p>}
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-bold uppercase">Localização & Contato:</span>
                <p className="font-medium text-foreground">{clientInfo.provincia || "Moçambique"}</p>
                {clientInfo.whatsapp && <p className="text-muted-foreground">Tel/WA: {clientInfo.whatsapp}</p>}
              </div>
            </div>
          )}

          {/* Tabela de Produtos */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-primary/30 bg-muted/50 text-foreground font-bold">
                  <th className="p-2">Item / Produto</th>
                  <th className="p-2 text-center">Código</th>
                  <th className="p-2 text-center">Qtd. Lotes</th>
                  <th className="p-2 text-center">Unidades Totais</th>
                  <th className="p-2 text-right">Preço do Lote</th>
                  <th className="p-2 text-right">Subtotal (MZN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map(({ product, lotes }, idx) => {
                  const totalUnidadesItem = lotes * product.quantidade_minima;
                  const subtotal = lotes * product.preco_lote;
                  return (
                    <tr key={product.id} className="hover:bg-muted/20">
                      <td className="p-2">
                        <span className="font-bold text-foreground block">{idx + 1}. {product.nome}</span>
                        <span className="text-[10px] text-muted-foreground">({product.quantidade_minima} un/lote • Categoria: {product.categoria})</span>
                      </td>
                      <td className="p-2 text-center font-mono text-[11px] text-muted-foreground">
                        {product.codigo || "-"}
                      </td>
                      <td className="p-2 text-center font-bold text-foreground">
                        {lotes} {lotes === 1 ? "lote" : "lotes"}
                      </td>
                      <td className="p-2 text-center text-muted-foreground">
                        {totalUnidadesItem} un
                      </td>
                      <td className="p-2 text-right font-mono text-foreground">
                        {formatCurrency(product.preco_lote)}
                      </td>
                      <td className="p-2 text-right font-extrabold text-primary">
                        {formatCurrency(subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totais & Projeção */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2 text-xs border border-border/60 p-3 rounded-lg bg-muted/10">
              <p className="font-bold text-foreground flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Condições Comerciais Moçambique
              </p>
              <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong className="text-foreground">Pagamentos:</strong> M-Pesa, e-Mola, BCI, Millennium BIM, Standard Bank.</li>
                <li><strong className="text-foreground">Logística:</strong> Levantamento em loja ou envio via transportadora nacional.</li>
                <li><strong className="text-foreground">Garantia:</strong> Verificação de qualidade na preparação dos lotes.</li>
              </ul>
            </div>

            <div className="space-y-1.5 text-xs bg-primary/5 border border-primary/20 p-3.5 rounded-lg text-right">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Volume de Lotes:</span>
                <span className="font-bold">{totalLotes} lotes ({totalUnidades} unidades)</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-1.5">
                <span className="font-extrabold text-sm text-foreground">INVESTIMENTO TOTAL:</span>
                <span className="font-black text-base text-primary">{formatCurrency(totalInvestimento)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                <span>Lucro Projetado do Revendedor:</span>
                <span>+{formatCurrency(lucroEstimadoTotal)}</span>
              </div>
            </div>
          </div>

          {clientInfo.observacoes && (
            <div className="text-xs bg-muted/40 p-2.5 rounded border border-border/50">
              <span className="font-bold text-foreground">Observações: </span>
              <span className="text-muted-foreground">{clientInfo.observacoes}</span>
            </div>
          )}

          {/* Rodapé do documento */}
          <div className="border-t border-border pt-4 text-center text-[10px] text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Obrigado pela sua preferência! Translite Solutions — O seu parceiro de confiança no atacado.</p>
            <p>Este documento é uma cotação formal proforma válida para reserva e confirmação de estoque.</p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border no-print">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 font-semibold text-xs flex-1 sm:flex-initial"
            >
              <Printer className="w-4 h-4 text-primary" />
              Imprimir / PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="gap-1.5 font-semibold text-xs flex-1 sm:flex-initial"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado!" : "Copiar Texto Formatado"}
            </Button>
          </div>

          <Button
            onClick={() => {
              sendWhatsappQuote(clientInfo);
              setOpen(false);
            }}
            size="sm"
            className="w-full sm:w-auto bg-whatsapp hover:bg-whatsapp/90 text-whatsapp-foreground font-bold text-xs h-9 gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar Pedido Formal no WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
