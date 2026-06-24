import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const checklistItemsTable = pgTable("checklist_items", {
  id: text("id").primaryKey(),
  list: text("list").notNull(),
  text: text("text").notNull(),
  done: boolean("done").notNull().default(false),
  category: text("category"),
  dueDate: text("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("checklist_items_list_created_at_idx").on(table.list, table.createdAt.desc()),
  index("checklist_items_list_done_idx").on(table.list, table.done),
]);

export const insertChecklistItemSchema = createInsertSchema(
  checklistItemsTable,
).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type ChecklistItem = typeof checklistItemsTable.$inferSelect;
