export type DemandLevel = "alta" | "media" | "baixa";

export interface Product {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  preco_lote: number;
  preco_revenda: number;
  quantidade_minima: number;
  imagem_url: string | null;
  imagens: string[];
  categoria: string;
  destaque: boolean;
  mais_vendido: boolean;
  demanda: DemandLevel;
  lucro_estimado: number;
  created_at: string;
  updated_at: string;
}
