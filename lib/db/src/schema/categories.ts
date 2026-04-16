import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Category = typeof categoriesTable.$inferSelect;
