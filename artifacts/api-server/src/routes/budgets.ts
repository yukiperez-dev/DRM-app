import { Router } from "express";
import { db, budgetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/budgets", async (req, res) => {
  try {
    const budgets = await db.select().from(budgetsTable);
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
});

router.put("/budgets/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { amount, currency } = req.body;
    const id = `budget_${category.replace(/[^a-zA-Z0-9]/g, "_")}`;

    const existing = await db
      .select()
      .from(budgetsTable)
      .where(eq(budgetsTable.category, category));

    let budget;
    if (existing.length > 0) {
      [budget] = await db
        .update(budgetsTable)
        .set({ amount: String(amount), currency, updatedAt: new Date() })
        .where(eq(budgetsTable.category, category))
        .returning();
    } else {
      [budget] = await db
        .insert(budgetsTable)
        .values({ id, category, amount: String(amount), currency })
        .returning();
    }

    res.json(budget);
  } catch (err) {
    res.status(500).json({ error: "Failed to update budget" });
  }
});

router.delete("/budgets/:category", async (req, res) => {
  try {
    const { category } = req.params;
    await db.delete(budgetsTable).where(eq(budgetsTable.category, category));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete budget" });
  }
});

export default router;
