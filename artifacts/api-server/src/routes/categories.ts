import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

const DEFAULT_CATEGORIES = [
  "Groceries",
  "Rent & Utilities",
  "Dining Out",
  "Transport",
  "Health",
  "Entertainment",
  "Travel",
  "Shopping",
  "Home",
  "Other",
];

async function seedDefaults() {
  const values = DEFAULT_CATEGORIES.map((name, i) => ({
    id: `cat_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
    name,
    sortOrder: i,
  }));
  await db.insert(categoriesTable).values(values).onConflictDoNothing();
}

router.get("/categories", async (req, res) => {
  try {
    let rows = await db
      .select()
      .from(categoriesTable)
      .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.createdAt));
    if (rows.length === 0) {
      await seedDefaults();
      rows = await db
        .select()
        .from(categoriesTable)
        .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.createdAt));
    }
    res.json(rows.map((r) => r.name));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    const trimmed = name.trim();
    const existing = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.name, trimmed));
    if (existing.length > 0) {
      return res.status(409).json({ error: "Category already exists" });
    }
    const allRows = await db.select().from(categoriesTable);
    const maxOrder = allRows.reduce((m, r) => Math.max(m, r.sortOrder), -1);
    const id = `cat_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;
    await db.insert(categoriesTable).values({ id, name: trimmed, sortOrder: maxOrder + 1 });
    res.status(201).json({ name: trimmed });
  } catch (err) {
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.put("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    const trimmed = name.trim();
    const [updated] = await db
      .update(categoriesTable)
      .set({ name: trimmed, updatedAt: new Date() })
      .where(eq(categoriesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Category not found" });
    res.json({ name: updated.name });
  } catch (err) {
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/categories/by-name/:name", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    await db.delete(categoriesTable).where(eq(categoriesTable.name, name));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
