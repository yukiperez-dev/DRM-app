import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const settlementsTable = pgTable("settlements", {
  id: text("id").primaryKey(),
  fromPerson: text("from_person").notNull(),
  toPerson: text("to_person").notNull(),
  amount: numeric("amount", { precision: 18, scale: 4 }).notNull(),
  currency: text("currency").notNull(),
  date: text("date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type InsertSettlement = typeof settlementsTable.$inferInsert;
export type Settlement = typeof settlementsTable.$inferSelect;
