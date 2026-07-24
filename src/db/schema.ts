import { relations } from "drizzle-orm";
import { pgTable, serial, text, doublePrecision, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase Auth UID
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("user"),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  codigo: text("codigo"),
  nome: text("nome").notNull(),
  categoria: text("categoria").notNull(),
  preco_lote: doublePrecision("preco_lote").notNull(),
  preco_revenda: doublePrecision("preco_revenda").notNull(),
  quantidade_minima: integer("quantidade_minima").default(1),
  imagem_url: text("imagem_url"),
  imagens: jsonb("imagens").$type<string[]>().default([]),
  demanda: text("demanda").default("media"),
  destaque: boolean("destaque").default(false),
  mais_vendido: boolean("mais_vendido").default(false),
  descricao: text("descricao"),
  created_at: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, () => ({}));

