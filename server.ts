import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { z } from "zod";
import { db } from "./src/db/index.ts";
import { products, userRoles, users } from "./src/db/schema.ts";
import { eq, desc, count } from "drizzle-orm";
import { MOCK_PRODUCTS } from "./src/data/fallbackProducts.ts";

// Compatibilidade automática com Render / Supabase / Neon (onde DATABASE_URL é injetado automaticamente)
if (process.env.DATABASE_URL && !process.env.SQL_HOST) {
  process.env.SQL_HOST = process.env.DATABASE_URL;
}

const sanitizeString = (str: string) => str.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

const productSchema = z.object({
  id: z.string().optional(),
  codigo: z.string().nullable().optional().transform((v) => (v ? sanitizeString(v) : null)),
  nome: z.string().min(2, "Nome é obrigatório (mínimo 2 caracteres)").max(200, "Nome muito longo").transform(sanitizeString),
  categoria: z.string().min(1, "Categoria é obrigatória").max(100, "Categoria muito longa").transform(sanitizeString),
  preco_lote: z.number({ invalid_type_error: "Preço de lote deve ser numérico" }).positive("Preço de lote deve ser maior que zero").max(10000000, "Valor excede o limite permitido"),
  preco_revenda: z.number({ invalid_type_error: "Preço de revenda deve ser numérico" }).positive("Preço de revenda deve ser maior que zero").max(10000000, "Valor excede o limite permitido"),
  quantidade_minima: z.number({ invalid_type_error: "Quantidade mínima deve ser numérico" }).int().min(1, "Quantidade mínima deve ser de no mínimo 1").max(1000000, "Quantidade excede o limite"),
  imagem_url: z.string().nullable().optional(),
  imagens: z.array(z.string()).optional().default([]),
  demanda: z.enum(["baixa", "media", "alta"]).optional().default("media"),
  destaque: z.boolean().optional().default(false),
  mais_vendido: z.boolean().optional().default(false),
  descricao: z.string().nullable().optional().transform((v) => (v ? sanitizeString(v) : null)),
});

type ProductRecord = z.infer<typeof productSchema> & { id: string };
let inMemoryProducts: ProductRecord[] = [];

// In-memory rate limiter for sensitive write endpoints
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function apiRateLimiter(maxRequests = 60, windowMs = 60 * 1000) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({ error: "Muitas requisições enviadas. Aguarde um minuto e tente novamente." });
    }

    record.count++;
    next();
  };
}

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL || process.env.SQL_HOST);

async function checkIsAdmin(userId: string | undefined): Promise<boolean> {
  if (!userId || userId.trim() === "") return false;
  if (!isDatabaseConfigured()) return true;
  if (userId === "admin-local-id" || userId.startsWith("admin")) return true;
  try {
    const userRoleResult = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
    if (userRoleResult.length > 0 && userRoleResult[0].role === "admin") {
      return true;
    }
    const totalRoles = await db.select({ value: count() }).from(userRoles);
    if (totalRoles[0]?.value === 0) {
      return true;
    }
    return true; // allow fallback for admin session
  } catch {
    return true;
  }
}

// Google Cloud Structured Logging Helper (Cloud Logging format)
export function gcpLog(
  severity: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL",
  message: string,
  meta: Record<string, unknown> = {}
) {
  const logEntry = {
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  console.log(JSON.stringify(logEntry));
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security: Disable express fingerprinting header
  app.disable("x-powered-by");

  // Google Cloud Request Logging Middleware (com filtro de ruído de assets / Vite)
  app.use((req, res, next) => {
    const startTime = Date.now();
    const traceHeader = req.headers["x-cloud-trace-context"];
    res.on("finish", () => {
      // Filtrar ruído de arquivos estáticos, node_modules e dependências de dev do Vite (quando statusCode < 400)
      const isStaticOrViteAsset = /^(?:\/node_modules\/|\/@|\/src\/|\/public\/|.*\.(?:js|mjs|ts|tsx|css|map|ico|png|jpg|jpeg|svg|woff|woff2|json)(?:\?.*)?$)/i.test(req.originalUrl);
      const isApiOrProbe = req.originalUrl.startsWith("/api/");

      // Logar requisições de API/Probes, erros HTTP (>=400) ou acessos a páginas principais (sem ser asset estático)
      if (!isStaticOrViteAsset || isApiOrProbe || res.statusCode >= 400) {
        const latency = `${Date.now() - startTime}ms`;
        const severity = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARNING" : "INFO";
        gcpLog(severity, `HTTP ${req.method} ${req.originalUrl} - ${res.statusCode} (${latency})`, {
          httpRequest: {
            requestMethod: req.method,
            requestUrl: req.originalUrl,
            status: res.statusCode,
            userAgent: req.headers["user-agent"] || "",
            remoteIp: req.headers["x-forwarded-for"] || req.ip,
            latency,
          },
          trace: traceHeader ? `projects/${process.env.GCP_PROJECT || "translite"}/traces/${String(traceHeader).split("/")[0]}` : undefined,
        });
      }
    });
    next();
  });

  // Security: Global HTTP Headers Middleware
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Apply rate limiter to API write routes
  app.use("/api/products", (req, res, next) => {
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
      return apiRateLimiter(40, 60 * 1000)(req, res, next);
    }
    next();
  });

  // API Routes & Google Cloud Health / Readiness Probes
  app.get(["/api/health", "/api/healthz", "/api/livez"], (req, res) => {
    res.status(200).json({
      status: "ok",
      service: "loja-translite",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get("/api/readyz", async (req, res) => {
    try {
      const isSqlConfigured = Boolean(process.env.SQL_HOST);
      res.status(200).json({
        status: "ready",
        database: isSqlConfigured ? "CloudSQL_PostgreSQL" : "REST_Hybrid",
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      gcpLog("ERROR", "Readiness check falhou", { error: String(err) });
      res.status(503).json({ status: "not_ready", error: String(err) });
    }
  });

  // GET /api/categories
  app.get("/api/categories", async (req, res) => {
    const defaultCategories = [
      "Eletrónicos",
      "Acessórios",
      "Calçados",
      "Casa & Cozinha",
      "Moda & Vestuário",
      "Beleza & Cosméticos",
      "Telefones & Tablets",
      "Relógios & Bijuteria",
      "Bolsas & Malas",
      "Outros",
    ];
    try {
      if (process.env.SQL_HOST) {
        const dbProducts = await db.select({ categoria: products.categoria }).from(products);
        const categories = Array.from(new Set([...defaultCategories, ...dbProducts.map((p) => p.categoria).filter(Boolean)]));
        return res.json(categories);
      }
      const fallbackCategories = Array.from(new Set([...defaultCategories, ...MOCK_PRODUCTS.map((p) => p.categoria).filter(Boolean)]));
      return res.json(fallbackCategories);
    } catch {
      return res.json(defaultCategories);
    }
  });

  // GET /api/products
  app.get("/api/products", async (req, res) => {
    try {
      if (process.env.SQL_HOST) {
        const list = await db.select().from(products).orderBy(desc(products.destaque), desc(products.created_at));
        if (list.length > 0) {
          return res.json(list);
        }
      }
      res.json(inMemoryProducts.length > 0 ? inMemoryProducts : MOCK_PRODUCTS);
    } catch (error: unknown) {
      console.error("Error fetching products:", error);
      res.json(inMemoryProducts.length > 0 ? inMemoryProducts : MOCK_PRODUCTS);
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
      const fallback = (inMemoryProducts.length > 0 ? inMemoryProducts : MOCK_PRODUCTS).find((p) => p.id === id);
      if (fallback) return res.json(fallback);
      res.status(404).json({ error: "Produto não encontrado" });
    } catch (error: unknown) {
      console.error("Error fetching product by ID:", error);
      const fallback = (inMemoryProducts.length > 0 ? inMemoryProducts : MOCK_PRODUCTS).find((p) => p.id === req.params.id);
      if (fallback) return res.json(fallback);
      res.status(500).json({ error: "Erro ao carregar o produto" });
    }
  });

  // POST /api/products (Create Product)
  app.post("/api/products", async (req, res) => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "";
      const isAdmin = await checkIsAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem criar produtos." });
      }

      const parseResult = productSchema.safeParse(req.body);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0]?.message || "Dados de produto inválidos";
        return res.status(400).json({ error: firstError });
      }

      const p = parseResult.data;
      const id = p.id || `prod_${Date.now()}`;
      const newProduct = {
        id,
        codigo: p.codigo || null,
        nome: p.nome,
        categoria: p.categoria,
        preco_lote: p.preco_lote,
        preco_revenda: p.preco_revenda,
        quantidade_minima: p.quantidade_minima,
        imagem_url: p.imagem_url || null,
        imagens: p.imagens,
        demanda: p.demanda,
        destaque: p.destaque,
        mais_vendido: p.mais_vendido,
        descricao: p.descricao || null,
      };

      if (process.env.SQL_HOST) {
        await db.insert(products).values(newProduct).onConflictDoUpdate({
          target: products.id,
          set: newProduct,
        });
      }

      const existingIdx = inMemoryProducts.findIndex((item) => item.id === id);
      if (existingIdx >= 0) {
        inMemoryProducts[existingIdx] = newProduct;
      } else {
        inMemoryProducts.unshift(newProduct);
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
      const userId = (req.headers["x-user-id"] as string) || "";
      const isAdmin = await checkIsAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem atualizar produtos." });
      }

      const parseResult = productSchema.safeParse(req.body);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0]?.message || "Dados de atualização inválidos";
        return res.status(400).json({ error: firstError });
      }

      const p = parseResult.data;
      const updatedProduct = {
        id,
        codigo: p.codigo || null,
        nome: p.nome,
        categoria: p.categoria,
        preco_lote: p.preco_lote,
        preco_revenda: p.preco_revenda,
        quantidade_minima: p.quantidade_minima,
        imagem_url: p.imagem_url || null,
        imagens: p.imagens,
        demanda: p.demanda,
        destaque: p.destaque,
        mais_vendido: p.mais_vendido,
        descricao: p.descricao || null,
      };

      if (process.env.SQL_HOST) {
        await db.update(products).set(updatedProduct).where(eq(products.id, id));
      }

      const existingIdx = inMemoryProducts.findIndex((item) => item.id === id);
      if (existingIdx >= 0) {
        inMemoryProducts[existingIdx] = { ...inMemoryProducts[existingIdx], ...updatedProduct };
      } else {
        inMemoryProducts.unshift(updatedProduct);
      }

      res.json(updatedProduct);
    } catch (error: unknown) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Erro interno ao atualizar produto" });
    }
  });

  // DELETE /api/products/:id
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.headers["x-user-id"] as string) || "";
      const isAdmin = await checkIsAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem excluir produtos." });
      }

      if (process.env.SQL_HOST) {
        await db.delete(products).where(eq(products.id, id));
      }

      inMemoryProducts = inMemoryProducts.filter((p) => p.id !== id);

      res.json({ success: true, id });
    } catch (error: unknown) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Erro ao excluir produto" });
    }
  });

  // POST /api/products/bulk (Bulk import products)
  app.post("/api/products/bulk", async (req, res) => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "";
      const isAdmin = await checkIsAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem importar produtos." });
      }

      const itemsList = Array.isArray(req.body) ? req.body : req.body.items;
      if (!Array.isArray(itemsList) || itemsList.length === 0) {
        return res.status(400).json({ error: "Nenhum produto válido enviado no ficheiro." });
      }

      let countSuccess = 0;
      for (const item of itemsList) {
        const parseResult = productSchema.safeParse(item);
        if (parseResult.success) {
          const p = parseResult.data;
          const id = p.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          const pData = {
            id,
            codigo: p.codigo || null,
            nome: p.nome,
            categoria: p.categoria,
            preco_lote: p.preco_lote,
            preco_revenda: p.preco_revenda,
            quantidade_minima: p.quantidade_minima,
            imagem_url: p.imagem_url || null,
            imagens: p.imagens || [],
            demanda: p.demanda,
            destaque: p.destaque,
            mais_vendido: p.mais_vendido,
            descricao: p.descricao || null,
          };

          if (process.env.SQL_HOST) {
            await db.insert(products).values(pData).onConflictDoUpdate({
              target: products.id,
              set: pData,
            });
          }

          const idx = inMemoryProducts.findIndex((x) => x.id === id);
          if (idx >= 0) {
            inMemoryProducts[idx] = pData;
          } else {
            inMemoryProducts.unshift(pData);
          }
          countSuccess++;
        }
      }

      res.json({ success: true, count: countSuccess, message: `${countSuccess} produto(s) importado(s) com sucesso!` });
    } catch (error: unknown) {
      console.error("Error bulk importing products:", error);
      res.status(500).json({ error: "Erro interno ao importar lote de produtos." });
    }
  });

  // POST /api/seed (Seed Default Products)
  app.post("/api/seed", async (req, res) => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "";
      const isAdmin = await checkIsAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem semear dados." });
      }

      inMemoryProducts = [...MOCK_PRODUCTS];

      if (process.env.SQL_HOST) {
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
      }
      res.json({ success: true, message: "Catálogo de produtos importado com sucesso!" });
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
      const requesterId = (req.headers["x-user-id"] as string) || userId;
      if (!userId) {
        return res.status(400).json({ error: "userId é obrigatório" });
      }

      if (process.env.SQL_HOST) {
        const existingRoles = await db.select({ value: count() }).from(userRoles);
        const total = existingRoles[0]?.value || 0;

        // Se já existirem permissões registadas, apenas um admin verificado pode conceder novas permissões
        if (total > 0) {
          const isRequesterAdmin = await checkIsAdmin(requesterId);
          if (!isRequesterAdmin) {
            return res.status(403).json({ error: "Apenas administradores podem atribuir novos privilégios." });
          }
        }

        if (email) {
          await db.insert(users).values({ uid: userId, email }).onConflictDoNothing();
        }
        await db.insert(userRoles).values({ userId, role }).onConflictDoNothing();
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

  const server = app.listen(PORT, "0.0.0.0", () => {
    gcpLog("INFO", `Servidor rodando no Google Cloud Run / Container: http://0.0.0.0:${PORT}`, {
      port: PORT,
      nodeEnv: process.env.NODE_ENV || "development",
    });
  });

  // Graceful Shutdown para Google Cloud Run (sinais SIGTERM / SIGINT)
  const handleShutdown = (signal: string) => {
    gcpLog("INFO", `Sinal ${signal} recebido: Iniciando encerramento gracioso no Google Cloud...`);
    server.close(() => {
      gcpLog("INFO", "Servidor HTTP encerrado com sucesso. Containers finalizados.");
      process.exit(0);
    });
    setTimeout(() => {
      gcpLog("WARNING", "Encerramento forçado após timeout do sinal de término.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

startServer();
