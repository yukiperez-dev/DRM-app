import { Router } from "express";
import { db, checklistItemsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

const router = Router();

const VALID_LISTS = new Set(["todo", "grocery"]);

function assertList(list: string): boolean {
  return VALID_LISTS.has(list);
}

router.get("/checklist/:list", async (req, res) => {
  try {
    const { list } = req.params;
    if (!assertList(list)) {
      res.status(400).json({ error: "Invalid list" });
      return;
    }
    const items = await db
      .select()
      .from(checklistItemsTable)
      .where(eq(checklistItemsTable.list, list))
      .orderBy(desc(checklistItemsTable.createdAt));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch checklist items" });
  }
});

router.post("/checklist/:list", async (req, res) => {
  try {
    const { list } = req.params;
    if (!assertList(list)) {
      res.status(400).json({ error: "Invalid list" });
      return;
    }
    const body = req.body;
    if (!body.id || typeof body.text !== "string" || !body.text.trim()) {
      res.status(400).json({ error: "Missing id or text" });
      return;
    }
    const [item] = await db
      .insert(checklistItemsTable)
      .values({
        id: body.id,
        list,
        text: body.text.trim(),
        done: body.done ?? false,
        category: body.category ?? null,
        dueDate: body.dueDate ?? null,
      })
      .returning();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to create checklist item" });
  }
});

router.patch("/checklist/:list/:id", async (req, res) => {
  try {
    const { list, id } = req.params;
    if (!assertList(list)) {
      res.status(400).json({ error: "Invalid list" });
      return;
    }
    const body = req.body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.text === "string") {
      const trimmed = body.text.trim();
      if (!trimmed) {
        res.status(400).json({ error: "Text cannot be empty" });
        return;
      }
      updates.text = trimmed;
    }
    if (typeof body.done === "boolean") updates.done = body.done;
    if ("category" in body) updates.category = body.category ?? null;
    if ("dueDate" in body) updates.dueDate = body.dueDate ?? null;

    const [item] = await db
      .update(checklistItemsTable)
      .set(updates)
      .where(
        and(
          eq(checklistItemsTable.id, id),
          eq(checklistItemsTable.list, list),
        ),
      )
      .returning();
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to update checklist item" });
  }
});

router.patch("/checklist/:list/:id/toggle", async (req, res) => {
  try {
    const { list, id } = req.params;
    if (!assertList(list)) {
      res.status(400).json({ error: "Invalid list" });
      return;
    }
    const [current] = await db
      .select()
      .from(checklistItemsTable)
      .where(
        and(
          eq(checklistItemsTable.id, id),
          eq(checklistItemsTable.list, list),
        ),
      );
    if (!current) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    const [item] = await db
      .update(checklistItemsTable)
      .set({ done: !current.done, updatedAt: new Date() })
      .where(
        and(
          eq(checklistItemsTable.id, id),
          eq(checklistItemsTable.list, list),
        ),
      )
      .returning();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle checklist item" });
  }
});

router.delete("/checklist/:list/completed", async (req, res) => {
  try {
    const { list } = req.params;
    if (!assertList(list)) {
      res.status(400).json({ error: "Invalid list" });
      return;
    }
    await db
      .delete(checklistItemsTable)
      .where(
        and(
          eq(checklistItemsTable.list, list),
          eq(checklistItemsTable.done, true),
        ),
      );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to clear completed items" });
  }
});

router.delete("/checklist/:list/:id", async (req, res) => {
  try {
    const { list, id } = req.params;
    if (!assertList(list)) {
      res.status(400).json({ error: "Invalid list" });
      return;
    }
    await db
      .delete(checklistItemsTable)
      .where(
        and(
          eq(checklistItemsTable.id, id),
          eq(checklistItemsTable.list, list),
        ),
      );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete checklist item" });
  }
});

export default router;
