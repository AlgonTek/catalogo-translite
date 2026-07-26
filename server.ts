import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { products, userRoles, users } from "./src/db/schema.ts";
import { eq, desc } from "drizzle-orm";
import { MOCK_PRODUCTS } from "./src/data/fallbackProducts.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security: Disable express fingerprinting header
  app.disable("x-powered-by");

  // Security: Global HTTP Headers Middleware
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // GET /api/products
  app.get("/api/products", async (req, res) => {
    try {
      if (!process.env.SQL_HOST) {
        return res.json(MOCK_PRODUCTS);
      }
      const list = await db.select().from(products).orderBy(desc(products.destaque), desc(products.created_at));
      if (list.length === 0) {
        return res.json(MOCK_PRODUCTS);
      }
      res.json(list);
    } catch (error: unknown) {
      console.error("Error fetching products from Cloud SQL:", error);
      res.json(MOCK_PRODUCTS);
    }
  });

  // GET /api/products/:id
  app.get("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (process.env.SQL_HOST) {
        const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
        if (result.length > 0) {
          return res.json(result[0]);
        }
      }
      const fallback = MOCK_PRODUCTS.find((p) => p.id === id);
      if (fallback) return res.json(fallback);
      res.status(404).json({ error: "Produto não encontrado" });
    } catch (error: unknown) {
      console.error("Error fetching product by ID:", error);
      const fallback = MOCK_PRODUCTS.find((p) => p.id === req.params.id);
      if (fallback) return res.json(fallback);
      res.status(500).json({ error: "Erro ao carregar o produto" });
    }
  });

  // POST /api/products (Create Product)
  app.post("/api/products", async (req, res) => {
    try {
      const p = req.body;
      if (!p || !p.nome || !p.preco_lote) {
        return res.status(400).json({ error: "Dados do produto inválidos ou incompletos" });
      }
      const id = p.id || `prod_${Date.now()}`;
      const newProduct = {
        id,
        codigo: p.codigo || null,
        nome: p.nome,
        categoria: p.categoria,
        preco_lote: Number(p.preco_lote),
        preco_revenda: Number(p.preco_revenda),
        quantidade_minima: Number(p.quantidade_minima) || 1,
        imagem_url: p.imagem_url || null,
        imagens: Array.isArray(p.imagens) ? p.imagens : [],
        demanda: p.demanda || "media",
        destaque: Boolean(p.destaque),
        mais_vendido: Boolean(p.mais_vendido),
        descricao: p.descricao || null,
      };

      if (process.env.SQL_HOST) {
        await db.insert(products).values(newProduct).onConflictDoUpdate({
          target: products.id,
          set: newProduct,
        });
      }
      res.json(newProduct);
    } catch (error: unknown) {
      console.error("Error inserting product:", error);
      res.status(500).json({ error: "Erro interno ao salvar o produto" });
    }
  });

  // PUT /api/products/:id (Update Product)
  app.put("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const p = req.body;
      if (!p || !p.nome) {
        return res.status(400).json({ error: "Dados inválidos para atualização" });
      }
      const updatedProduct = {
        codigo: p.codigo || null,
        nome: p.nome,
        categoria: p.categoria,
        preco_lote: Number(p.preco_lote),
        preco_revenda: Number(p.preco_revenda),
        quantidade_minima: Number(p.quantidade_minima) || 1,
        imagem_url: p.imagem_url || null,
        imagens: Array.isArray(p.imagens) ? p.imagens : [],
        demanda: p.demanda || "media",
        destaque: Boolean(p.destaque),
        mais_vendido: Boolean(p.mais_vendido),
        descricao: p.descricao || null,
      };

      if (process.env.SQL_HOST) {
        await db.update(products).set(updatedProduct).where(eq(products.id, id));
      }
      res.json({ id, ...updatedProduct });
    } catch (error: unknown) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Erro interno ao atualizar produto" });
    }
  });

  // DELETE /api/products/:id
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (process.env.SQL_HOST) {
        await db.delete(products).where(eq(products.id, id));
      }
      res.json({ success: true, id });
    } catch (error: unknown) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Erro ao excluir produto" });
    }
  });

  // POST /api/seed (Seed Default Products)
  app.post("/api/seed", async (req, res) => {
    try {
      if (!process.env.SQL_HOST) {
        return res.status(400).json({ error: "Serviço de banco de dados não disponível no momento." });
      }
      for (const item of MOCK_PRODUCTS) {
        await db.insert(products).values({
          id: item.id,
          codigo: item.codigo,
          nome: item.nome,
          categoria: item.categoria,
          preco_lote: item.preco_lote,
          preco_revenda: item.preco_revenda,
          quantidade_minima: item.quantidade_minima,
          imagem_url: item.imagem_url,
          imagens: item.imagens || [],
          demanda: item.demanda,
          destaque: item.destaque,
          mais_vendido: item.mais_vendido,
          descricao: item.descricao,
        }).onConflictDoUpdate({
          target: products.id,
          set: {
            codigo: item.codigo,
            nome: item.nome,
            categoria: item.categoria,
            preco_lote: item.preco_lote,
            preco_revenda: item.preco_revenda,
            quantidade_minima: item.quantidade_minima,
            imagem_url: item.imagem_url,
            imagens: item.imagens || [],
            demanda: item.demanda,
            destaque: item.destaque,
            mais_vendido: item.mais_vendido,
            descricao: item.descricao,
          }
        });
      }
      res.json({ success: true, message: "Produtos padrão semeados com sucesso no Cloud SQL!" });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error seeding products:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/auth/set-role (Save user role in Cloud SQL)
  app.post("/api/auth/set-role", async (req, res) => {
    try {
      const { userId, email, role = "admin" } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId é obrigatório" });
      }
      if (process.env.SQL_HOST) {
        if (email) {
          await db.insert(users).values({ uid: userId, email }).onConflictDoNothing();
        }
        await db.insert(userRoles).values({ userId, role });
      }
      res.json({ success: true, userId, role });
    } catch (error: unknown) {
      console.error("Error setting user role:", error);
      res.status(500).json({ error: "Erro ao registrar permissão do utilizador" });
    }
  });

  // GET /api/auth/role/:userId
  app.get("/api/auth/role/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (process.env.SQL_HOST) {
        const result = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
        if (result.length > 0) {
          return res.json({ role: result[0].role });
        }
      }
      res.json({ role: "admin" });
    } catch (error: unknown) {
      res.json({ role: "admin" });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
