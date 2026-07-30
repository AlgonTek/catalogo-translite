import type { Product } from "@/types/product";

export interface IProductRepository {
  /**
   * Subscribes to real-time updates of products list.
   * Returns an unsubscribe function.
   */
  subscribeProducts(
    onSuccess: (products: Product[]) => void,
    onError?: (err: unknown) => void
  ): () => void;

  /**
   * Fetches all products via REST API as a snapshot.
   */
  getProducts(): Promise<Product[]>;

  /**
   * Creates or updates a product across persistent stores.
   */
  saveProduct(productPayload: Partial<Product>, userId?: string): Promise<Product>;

  /**
   * Deletes a product by ID from persistent stores.
   */
  deleteProduct(id: string, userId?: string): Promise<void>;
}
