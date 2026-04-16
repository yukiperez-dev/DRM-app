import { pgTable, text, numeric, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const recurringExpensesTable = pgTable("recurring_expenses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  amount: numeric("amount", { precision: 18, scale: 4 }).notNull(),
  currency: text("currency").notNull(),
  category: text("category").notNull(),
  paidBy: text("paid_by").notNull(),
  juanfePaidAmount: numeric("juanfe_paid_amount", { precision: 18, scale: 4 }),
  yukitaPaidAmount: numeric("yukita_paid_amount", { precision: 18, scale: 4 }),
  splitType: text("split_type").notNull(),
  juanfeSplitPct: integer("juanfe_split_pct"),
  note: text("note"),
  dayOfMonth: integer("day_of_month").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRecurringExpenseSchema = createInsertSchema(recurringExpensesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertRecurringExpense = z.infer<typeof insertRecurringExpenseSchema>;
export type RecurringExpense = typeof recurringExpensesTable.$inferSelect;
