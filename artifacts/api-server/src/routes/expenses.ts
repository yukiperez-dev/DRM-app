import { Router } from "express";
import { db, expensesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/expenses", async (req, res) => {
  try {
    const expenses = await db
      .select()
      .from(expensesTable)
      .orderBy(expensesTable.createdAt);
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.post("/expenses", async (req, res) => {
  try {
    const body = req.body;
    const [expense] = await db
      .insert(expensesTable)
      .values({
        id: body.id,
        title: body.title,
        amount: String(body.amount),
        currency: body.currency,
        category: body.category,
        paidBy: body.paidBy,
        juanfePaidAmount: body.juanfePaidAmount != null ? String(body.juanfePaidAmount) : null,
        yukitaPaidAmount: body.yukitaPaidAmount != null ? String(body.yukitaPaidAmount) : null,
        splitType: body.splitType,
        juanfeSplitPct: body.juanfeSplitPct ?? null,
        isPaid: body.isPaid ?? false,
        date: body.date,
        note: body.note ?? null,
        billImageBase64: body.billImageBase64 ?? null,
        recurringExpenseId: body.recurringExpenseId ?? null,
      })
      .returning();
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: "Failed to create expense" });
  }
});

router.put("/expenses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const [expense] = await db
      .update(expensesTable)
      .set({
        title: body.title,
        amount: String(body.amount),
        currency: body.currency,
        category: body.category,
        paidBy: body.paidBy,
        juanfePaidAmount: body.juanfePaidAmount != null ? String(body.juanfePaidAmount) : null,
        yukitaPaidAmount: body.yukitaPaidAmount != null ? String(body.yukitaPaidAmount) : null,
        splitType: body.splitType,
        juanfeSplitPct: body.juanfeSplitPct ?? null,
        isPaid: body.isPaid ?? false,
        date: body.date,
        note: body.note ?? null,
        billImageBase64: body.billImageBase64 ?? null,
        updatedAt: new Date(),
      })
      .where(eq(expensesTable.id, id))
      .returning();
    if (!expense) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: "Failed to update expense" });
  }
});

router.patch("/expenses/:id/toggle-paid", async (req, res) => {
  try {
    const { id } = req.params;
    const [current] = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.id, id));
    if (!current) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }
    const [expense] = await db
      .update(expensesTable)
      .set({ isPaid: !current.isPaid, updatedAt: new Date() })
      .where(eq(expensesTable.id, id))
      .returning();
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle expense" });
  }
});

router.delete("/expenses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(expensesTable).where(eq(expensesTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

export default router;
