import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/types/product";
import type { IProductRepository } from "@/domain/repositories/IProductRepository";

export class ApiProductRepository implements IProductRepository {
  /**
   * Subscribes to products by initial fetch & polling or manual trigger via REST API,
   * avoiding Firestore daily read quota limits (free tier quota exhaustion).
   */
  subscribeProducts(
    onSuccess: (products: Product[]) => void,
    onError?: (err: unknown) => void
  ): () => void {
    let isActive = true;

    const fetchLatest = async () => {
      try {
        const products = await this.getProducts();
        if (isActive) {
          onSuccess(products);
        }
      } catch (err) {
        if (isActive && onError) {
          onError(err);
        }
      }
    };

    // Initial load
    fetchLatest();

    // Poll every 15 seconds to keep data fresh without consuming Firestore read quotas
    const interval = setInterval(fetchLatest, 15000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }

  async getProducts(): Promise<Product[]> {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? (data as Product[]) : [];
    } catch (err) {
      console.error("Error fetching products from API:", err);
      return [];
    }
  }

  async saveProduct(payload: Partial<Product>, userId?: string): Promise<Product> {
    const productId = payload.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullPayload = { ...payload, id: productId } as Product;

    // 1. Save to REST API (Primary backend store)
    const isEdit = Boolean(payload.id);
    const url = isEdit ? `/api/products/${payload.id}` : "/api/products";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId || "",
      },
      body: JSON.stringify(fullPayload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao guardar produto no servidor");
    }

    // 2. Best-effort async sync to Firestore (silent catch to prevent quota blocking)
    try {
      const productRef = doc(db, "products", productId);
      setDoc(productRef, fullPayload, { merge: true }).catch(() => {});
    } catch {
      // Ignore background Firestore quota errors
    }

    return fullPayload;
  }

  async deleteProduct(id: string, userId?: string): Promise<void> {
    // 1. Delete from REST API (Primary backend store)
    const res = await fetch(`/api/products/${id}`, {
      method: "DELETE",
      headers: { "X-User-Id": userId || "" },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao excluir produto no servidor");
    }

    // 2. Best-effort async deletion from Firestore
    try {
      deleteDoc(doc(db, "products", id)).catch(() => {});
    } catch {
      // Ignore background Firestore quota errors
    }
  }
}

// Singleton instance export adhering to Dependency Inversion
export const productRepository: IProductRepository = new ApiProductRepository();

