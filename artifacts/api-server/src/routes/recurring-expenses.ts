import { Router } from "express";
import { db, recurringExpensesTable, expensesTable } from "@workspace/db";
import { eq, and, like } from "drizzle-orm";

const router = Router();

const DEFAULT_RECURRING = [
  {
    id: "recurring-rent",
    title: "Rent",
    amount: "0",
    currency: "COP",
    category: "Rent & Utilities",
    paidBy: "Both",
    juanfePaidAmount: null,
    yukitaPaidAmount: null,
    splitType: "equal",
    juanfeSplitPct: null,
    note: null,
    dayOfMonth: 1,
    isActive: true,
  },
  {
    id: "recurring-wifi",
    title: "WiFi",
    amount: "0",
    currency: "COP",
    category: "Rent & Utilities",
    paidBy: "Both",
    juanfePaidAmount: null,
    yukitaPaidAmount: null,
    splitType: "equal",
    juanfeSplitPct: null,
    note: null,
    dayOfMonth: 1,
    isActive: true,
  },
  {
    id: "recurring-phone",
    title: "Phone",
    amount: "0",
    currency: "COP",
    category: "Rent & Utilities",
    paidBy: "Both",
    juanfePaidAmount: null,
    yukitaPaidAmount: null,
    splitType: "equal",
    juanfeSplitPct: null,
    note: null,
    dayOfMonth: 1,
    isActive: true,
  },
  {
    id: "recurring-health-insurance",
    title: "Health Insurance",
    amount: "0",
    currency: "COP",
    category: "Health",
    paidBy: "Both",
    juanfePaidAmount: null,
    yukitaPaidAmount: null,
    splitType: "equal",
    juanfeSplitPct: null,
    note: null,
    dayOfMonth: 1,
    isActive: true,
  },
];

async function seedDefaults() {
  try {
    for (const item of DEFAULT_RECURRING) {
      const existing = await db
        .select()
        .from(recurringExpensesTable)
        .where(eq(recurringExpensesTable.id, item.id));
      if (existing.length === 0) {
        await db.insert(recurringExpensesTable).values(item);
      }
    }
  } catch (err) {
    console.error("Failed to seed default recurring expenses", err);
  }
}

seedDefaults();

router.get("/recurring-expenses", async (req, res) => {
  try {
    const items = await db
      .select()
      .from(recurringExpensesTable)
      .orderBy(recurringExpensesTable.createdAt);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recurring expenses" });
  }
});

router.post("/recurring-expenses", async (req, res) => {
  try {
    const body = req.body;
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const [item] = await db
      .insert(recurringExpensesTable)
      .values({
        id,
        title: body.title,
        amount: String(body.amount),
        currency: body.currency,
        category: body.category,
        paidBy: body.paidBy,
        juanfePaidAmount: body.juanfePaidAmount != null ? String(body.juanfePaidAmount) : null,
        yukitaPaidAmount: body.yukitaPaidAmount != null ? String(body.yukitaPaidAmount) : null,
        splitType: body.splitType,
        juanfeSplitPct: body.juanfeSplitPct ?? null,
        note: body.note ?? null,
        dayOfMonth: body.dayOfMonth ?? 1,
        isActive: body.isActive ?? true,
      })
      .returning();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to create recurring expense" });
  }
});

router.put("/recurring-expenses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const [item] = await db
      .update(recurringExpensesTable)
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
        note: body.note ?? null,
        dayOfMonth: body.dayOfMonth ?? 1,
        isActive: body.isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(recurringExpensesTable.id, id))
      .returning();
    if (!item) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to update recurring expense" });
  }
});

router.delete("/recurring-expenses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(recurringExpensesTable).where(eq(recurringExpensesTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete recurring expense" });
  }
});

router.post("/recurring-expenses/generate", async (req, res) => {
  try {
    const { year, month } = req.body;
    if (!year || !month) {
      res.status(400).json({ error: "year and month are required" });
      return;
    }

    const monthStr = String(month).padStart(2, "0");
    const monthPrefix = `${year}-${monthStr}`;

    const activeRecurring = await db
      .select()
      .from(recurringExpensesTable)
      .where(eq(recurringExpensesTable.isActive, true));

    const generated: any[] = [];
    const skipped: string[] = [];

    for (const recurring of activeRecurring) {
      const existingForMonth = await db
        .select()
        .from(expensesTable)
        .where(
          and(
            eq(expensesTable.recurringExpenseId, recurring.id),
            like(expensesTable.date, `${monthPrefix}%`)
          )
        );

      if (existingForMonth.length > 0) {
        skipped.push(recurring.title);
        continue;
      }

      const day = Math.min(recurring.dayOfMonth, new Date(Number(year), Number(month), 0).getDate());
      const date = new Date(Number(year), Number(month) - 1, day, 12, 0, 0, 0).toISOString();
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);

      const [expense] = await db
        .insert(expensesTable)
        .values({
          id,
          title: recurring.title,
          amount: recurring.amount,
          currency: recurring.currency,
          category: recurring.category,
          paidBy: recurring.paidBy,
          juanfePaidAmount: recurring.juanfePaidAmount,
          yukitaPaidAmount: recurring.yukitaPaidAmount,
          splitType: recurring.splitType,
          juanfeSplitPct: recurring.juanfeSplitPct,
          isPaid: false,
          date,
          note: recurring.note,
          recurringExpenseId: recurring.id,
        })
        .returning();

      generated.push(expense);
    }

    res.json({ generated, skipped });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate expenses" });
  }
});

export default router;
