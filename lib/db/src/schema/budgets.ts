import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const budgetsTable = pgTable("budgets", {
  id: text("id").primaryKey(),
  category: text("category").notNull().unique(),
  amount: numeric("amount", { precision: 18, scale: 4 }).notNull().default("0"),
  currency: text("currency").notNull().default("COP"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBudgetSchema = createInsertSchema(budgetsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgetsTable.$inferSelect;
