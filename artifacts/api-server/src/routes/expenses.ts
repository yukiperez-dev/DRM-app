import { Router } from "express";
import { db, expensesTable } from "@workspace/db";
import { and, desc, eq, gte, lt, lte, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

const router = Router();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

interface ExpenseCursor {
  createdAt: string;
  id: string;
}

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  return typeof value === "string" ? value : undefined;
}

function parseLimit(value: unknown): number | null {
  const raw = firstQueryValue(value);
  if (raw === undefined) return DEFAULT_LIMIT;

  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1) return null;

  return Math.min(limit, MAX_LIMIT);
}

function parseBooleanQuery(value: unknown): boolean | null | undefined {
  const raw = firstQueryValue(value);
  if (raw === undefined) return undefined;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

function normalizeDateBound(value: unknown, endOfDay: boolean): string | null | undefined {
  const raw = firstQueryValue(value)?.trim();
  if (!raw) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const instant = endOfDay ? `${raw}T23:59:59.999Z` : `${raw}T00:00:00.000Z`;
    if (Number.isNaN(new Date(instant).getTime())) return null;

    return endOfDay ? instant : raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function decodeCursor(value: unknown): ExpenseCursor | null | undefined {
  const raw = firstQueryValue(value);
  if (raw === undefined) return undefined;

  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string"
    ) {
      return null;
    }

    const cursorDate = new Date(parsed.createdAt);
    if (Number.isNaN(cursorDate.getTime())) return null;

    return { createdAt: cursorDate.toISOString(), id: parsed.id };
  } catch {
    return null;
  }
}

function encodeCursor(row: { createdAt: Date | string; id: string }): string {
  const createdAt =
    row.createdAt instanceof Date
      ? row.createdAt.toISOString()
      : new Date(row.createdAt).toISOString();

  return Buffer.from(JSON.stringify({ createdAt, id: row.id })).toString("base64url");
}

router.get("/expenses", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    if (limit === null) {
      res.status(400).json({ error: "limit must be a positive integer" });
      return;
    }

    const isPaid = parseBooleanQuery(req.query.isPaid);
    if (isPaid === null) {
      res.status(400).json({ error: "isPaid must be true or false" });
      return;
    }

    const dateFrom = normalizeDateBound(req.query.dateFrom, false);
    const dateTo = normalizeDateBound(req.query.dateTo, true);
    if (dateFrom === null || dateTo === null) {
      res.status(400).json({ error: "dateFrom and dateTo must be valid dates" });
      return;
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      res.status(400).json({ error: "dateFrom must be before dateTo" });
      return;
    }

    const cursor = decodeCursor(req.query.cursor);
    if (cursor === null) {
      res.status(400).json({ error: "cursor is invalid" });
      return;
    }

    const conditions: SQL[] = [];
    const category = firstQueryValue(req.query.category)?.trim();
    if (category) conditions.push(eq(expensesTable.category, category));
    if (isPaid !== undefined) conditions.push(eq(expensesTable.isPaid, isPaid));
    if (dateFrom) conditions.push(gte(expensesTable.date, dateFrom));
    if (dateTo) conditions.push(lte(expensesTable.date, dateTo));
    if (cursor) {
      const cursorDate = new Date(cursor.createdAt);
      const cursorCondition = or(
        lt(expensesTable.createdAt, cursorDate),
        and(
          eq(expensesTable.createdAt, cursorDate),
          lt(expensesTable.id, cursor.id),
        ),
      );
      if (cursorCondition) conditions.push(cursorCondition);
    }

    const rows = await db
      .select({
        id: expensesTable.id,
        title: expensesTable.title,
        amount: expensesTable.amount,
        currency: expensesTable.currency,
        category: expensesTable.category,
        paidBy: expensesTable.paidBy,
        juanfePaidAmount: expensesTable.juanfePaidAmount,
        yukitaPaidAmount: expensesTable.yukitaPaidAmount,
        splitType: expensesTable.splitType,
        juanfeSplitPct: expensesTable.juanfeSplitPct,
        isPaid: expensesTable.isPaid,
        date: expensesTable.date,
        note: expensesTable.note,
        hasBill: sql<boolean>`${expensesTable.billImageBase64} is not null`,
        recurringExpenseId: expensesTable.recurringExpenseId,
        createdAt: expensesTable.createdAt,
        updatedAt: expensesTable.updatedAt,
      })
      .from(expensesTable)
      .where(and(...conditions))
      .orderBy(desc(expensesTable.createdAt), desc(expensesTable.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1])
      : null;

    res.json({ items, nextCursor, hasMore });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.get("/expenses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [expense] = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.id, id));

    if (!expense) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch expense" });
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
