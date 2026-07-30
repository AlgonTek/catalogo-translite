import { useEffect, useState, useCallback } from "react";
import type { Product } from "@/types/product";
import { productRepository } from "@/infrastructure/repositories/ProductRepository";
import { useAuth } from "@/hooks/useAuth";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = productRepository.subscribeProducts(
      (data) => {
        setProducts(data);
        setLoading(false);
      },
      (err) => {
        console.error("Erro na subscrição de produtos:", err);
        setError("Não foi possível carregar alguns produtos.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productRepository.getProducts();
      setProducts(data);
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || "Erro ao recarregar produtos";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { products, loading, error, refreshProducts };
}

export function useProductMutations() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const saveProduct = useCallback(
    async (payload: Partial<Product>) => {
      setSaving(true);
      try {
        const saved = await productRepository.saveProduct(payload, user?.uid);
        return saved;
      } finally {
        setSaving(false);
      }
    },
    [user?.uid]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await productRepository.deleteProduct(id, user?.uid);
      } finally {
        setDeletingId(null);
      }
    },
    [user?.uid]
  );

  return {
    saveProduct,
    deleteProduct,
    saving,
    deletingId,
  };
}
