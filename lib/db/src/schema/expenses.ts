import { pgTable, text, numeric, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const expensesTable = pgTable("expenses", {
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
  isPaid: boolean("is_paid").notNull().default(false),
  date: text("date").notNull(),
  note: text("note"),
  billImageBase64: text("bill_image_base64"),
  recurringExpenseId: text("recurring_expense_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
