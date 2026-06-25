import { Router } from "express";
import { db, expensesTable, settlementsTable } from "@workspace/db";
import { and, desc, gte, lte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

const router = Router();

type Currency = "COP" | "EUR";
type SummaryRange = "3M" | "6M" | "12M" | "ALL";
type Person = "Juanfe" | "Yukita";

const COP_TO_EUR = 0.00023;
const EUR_TO_COP = 4348;
const SETTLEMENT_LIST_LIMIT = 100;

const RANGE_MONTHS: Record<Exclude<SummaryRange, "ALL">, number> = {
  "3M": 3,
  "6M": 6,
  "12M": 12,
};

interface MonthBucket {
  month: string;
  label: string;
  shortLabel: string;
  total: number;
  byCategory: Record<string, number>;
}

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  return typeof value === "string" ? value : undefined;
}

function parseCurrency(value: unknown): Currency | null {
  const raw = firstQueryValue(value) ?? "COP";
  return raw === "COP" || raw === "EUR" ? raw : null;
}

function parseRange(value: unknown): SummaryRange | null {
  const raw = firstQueryValue(value) ?? "6M";
  return raw === "3M" || raw === "6M" || raw === "12M" || raw === "ALL"
    ? raw
    : null;
}

function money(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function count(value: unknown): number {
  return Number(value ?? 0);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function shiftMonth(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function monthEnd(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function parseMonthKey(key: string): Date | null {
  const [yearRaw, monthRaw] = key.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, 1));
}

function monthLabels(key: string): { label: string; shortLabel: string } {
  const parsed = parseMonthKey(key);
  if (!parsed) return { label: key, shortLabel: key };

  return {
    label: parsed.toLocaleDateString("en-GB", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }),
    shortLabel: parsed.toLocaleDateString("en-GB", {
      month: "short",
      timeZone: "UTC",
    }),
  };
}

function listMonthKeys(startKey: string, endKey: string): string[] {
  const start = parseMonthKey(startKey);
  const end = parseMonthKey(endKey);
  if (!start || !end || start > end) return [];

  const keys: string[] = [];
  let cursor = start;
  let safety = 0;
  while (cursor <= end && safety < 240) {
    keys.push(monthKey(cursor));
    cursor = shiftMonth(cursor, 1);
    safety++;
  }

  return keys;
}

function rangeWindow(range: SummaryRange, now = new Date()) {
  if (range === "ALL") {
    return {
      start: null,
      startMonth: null,
      end: null,
      endMonth: null,
    };
  }

  const currentMonth = monthStart(now);
  const start = shiftMonth(currentMonth, -(RANGE_MONTHS[range] - 1));
  const end = monthEnd(currentMonth);

  return {
    start: start.toISOString().slice(0, 10),
    startMonth: monthKey(start),
    end: end.toISOString(),
    endMonth: monthKey(currentMonth),
  };
}

function amountInCurrencySql(amount: SQL, sourceCurrency: SQL, target: Currency): SQL {
  const value = sql`coalesce(${amount}, 0)::numeric`;

  if (target === "COP") {
    return sql`case
      when ${sourceCurrency} = 'COP' then ${value}
      when ${sourceCurrency} = 'EUR' then ${value} * ${EUR_TO_COP}
      else 0
    end`;
  }

  return sql`case
    when ${sourceCurrency} = 'EUR' then ${value}
    when ${sourceCurrency} = 'COP' then ${value} * ${COP_TO_EUR}
    else 0
  end`;
}

function sumSql(expression: SQL): SQL<string> {
  return sql<string>`coalesce(sum(${expression}), 0)`;
}

function rangeConditions(range: ReturnType<typeof rangeWindow>): SQL[] {
  const conditions: SQL[] = [];
  if (range.start) conditions.push(gte(expensesTable.date, range.start));
  if (range.end) conditions.push(lte(expensesTable.date, range.end));
  return conditions;
}

router.get("/analytics/summary", async (req, res) => {
  try {
    const currency = parseCurrency(req.query.currency);
    const range = parseRange(req.query.range);

    if (!currency) {
      res.status(400).json({ error: "currency must be COP or EUR" });
      return;
    }
    if (!range) {
      res.status(400).json({ error: "range must be 3M, 6M, 12M, or ALL" });
      return;
    }

    const window = rangeWindow(range);
    const conditions = rangeConditions(window);
    const expenseAmount = amountInCurrencySql(
      sql`${expensesTable.amount}`,
      sql`${expensesTable.currency}`,
      currency,
    );
    const settlementAmount = amountInCurrencySql(
      sql`${settlementsTable.amount}`,
      sql`${settlementsTable.currency}`,
      currency,
    );

    const currentMonth = monthStart(new Date());
    const currentMonthStart = currentMonth.toISOString().slice(0, 10);
    const currentMonthEnd = monthEnd(currentMonth).toISOString();

    const juanfePaidAmount = amountInCurrencySql(
      sql`${expensesTable.juanfePaidAmount}`,
      sql`${expensesTable.currency}`,
      currency,
    );
    const yukitaPaidAmount = amountInCurrencySql(
      sql`${expensesTable.yukitaPaidAmount}`,
      sql`${expensesTable.currency}`,
      currency,
    );
    const juanfePct = sql`case
      when ${expensesTable.splitType} = 'custom'
        then coalesce(${expensesTable.juanfeSplitPct}, 50)::numeric / 100
      else 0.5
    end`;
    const yukitaPct = sql`1 - (${juanfePct})`;
    const bothTotal = sql`(${juanfePaidAmount} + ${yukitaPaidAmount})`;
    const juanfeExcess = sql`(${juanfePaidAmount} - (${bothTotal} * (${juanfePct})))`;

    const [
      expenseBalanceRows,
      settlementBalanceRows,
      paidByRows,
      categoryRows,
      monthlyRows,
      settlementRows,
      countRows,
    ] = await Promise.all([
      db
        .select({
          juanfeOwes: sumSql(sql`case
            when ${expensesTable.isPaid} = false or ${expensesTable.splitType} = 'full' then 0
            when ${expensesTable.paidBy} = 'Yukita' then ${expenseAmount} * (${juanfePct})
            when ${expensesTable.paidBy} = 'Both' then greatest(-(${juanfeExcess}), 0)
            else 0
          end`),
          yukitaOwes: sumSql(sql`case
            when ${expensesTable.isPaid} = false or ${expensesTable.splitType} = 'full' then 0
            when ${expensesTable.paidBy} = 'Juanfe' then ${expenseAmount} * (${yukitaPct})
            when ${expensesTable.paidBy} = 'Both' then greatest(${juanfeExcess}, 0)
            else 0
          end`),
          hasPending: sql<boolean>`coalesce(bool_or(${expensesTable.isPaid} = false), false)`,
        })
        .from(expensesTable),
      db
        .select({
          juanfeOwesAdjustment: sumSql(sql`case
            when ${settlementsTable.fromPerson} = 'Juanfe'
              and ${settlementsTable.toPerson} = 'Yukita'
            then -(${settlementAmount})
            else 0
          end`),
          yukitaOwesAdjustment: sumSql(sql`case
            when ${settlementsTable.fromPerson} = 'Yukita'
              and ${settlementsTable.toPerson} = 'Juanfe'
            then -(${settlementAmount})
            else 0
          end`),
          juanfeToYukita: sumSql(sql`case
            when ${settlementsTable.fromPerson} = 'Juanfe'
              and ${settlementsTable.toPerson} = 'Yukita'
            then ${settlementAmount}
            else 0
          end`),
          yukitaToJuanfe: sumSql(sql`case
            when ${settlementsTable.fromPerson} = 'Yukita'
              and ${settlementsTable.toPerson} = 'Juanfe'
            then ${settlementAmount}
            else 0
          end`),
          count: sql<number>`count(*)::int`,
        })
        .from(settlementsTable),
      db
        .select({
          paidBy: expensesTable.paidBy,
          total: sumSql(expenseAmount),
          count: sql<number>`count(*)::int`,
        })
        .from(expensesTable)
        .where(and(...conditions))
        .groupBy(expensesTable.paidBy),
      db
        .select({
          category: expensesTable.category,
          total: sumSql(expenseAmount),
          juanfe: sumSql(sql`case when ${expensesTable.paidBy} = 'Juanfe' then ${expenseAmount} else 0 end`),
          yukita: sumSql(sql`case when ${expensesTable.paidBy} = 'Yukita' then ${expenseAmount} else 0 end`),
          both: sumSql(sql`case when ${expensesTable.paidBy} = 'Both' then ${expenseAmount} else 0 end`),
          currentMonth: sumSql(sql`case
            when ${expensesTable.date} >= ${currentMonthStart}
              and ${expensesTable.date} <= ${currentMonthEnd}
            then ${expenseAmount}
            else 0
          end`),
          count: sql<number>`count(*)::int`,
        })
        .from(expensesTable)
        .where(and(...conditions))
        .groupBy(expensesTable.category),
      db
        .select({
          month: sql<string>`substring(${expensesTable.date} from 1 for 7)`,
          category: expensesTable.category,
          total: sumSql(expenseAmount),
          count: sql<number>`count(*)::int`,
        })
        .from(expensesTable)
        .where(and(...conditions))
        .groupBy(sql`substring(${expensesTable.date} from 1 for 7)`, expensesTable.category)
        .orderBy(sql`substring(${expensesTable.date} from 1 for 7)`),
      db
        .select({
          id: settlementsTable.id,
          fromPerson: settlementsTable.fromPerson,
          toPerson: settlementsTable.toPerson,
          amount: settlementsTable.amount,
          amountInCurrency: settlementAmount,
          currency: settlementsTable.currency,
          date: settlementsTable.date,
          note: settlementsTable.note,
          createdAt: settlementsTable.createdAt,
          updatedAt: settlementsTable.updatedAt,
        })
        .from(settlementsTable)
        .orderBy(desc(settlementsTable.createdAt), desc(settlementsTable.id))
        .limit(SETTLEMENT_LIST_LIMIT + 1),
      db
        .select({
          expenses: sql<number>`count(*)::int`,
          paidExpenses: sql<number>`count(*) filter (where ${expensesTable.isPaid} = true)::int`,
          pendingExpenses: sql<number>`count(*) filter (where ${expensesTable.isPaid} = false)::int`,
        })
        .from(expensesTable)
        .where(and(...conditions)),
    ]);

    const expenseBalance = expenseBalanceRows[0];
    const settlementBalance = settlementBalanceRows[0];
    const juanfeOwes =
      money(expenseBalance?.juanfeOwes) + money(settlementBalance?.juanfeOwesAdjustment);
    const yukitaOwes =
      money(expenseBalance?.yukitaOwes) + money(settlementBalance?.yukitaOwesAdjustment);
    const netAmount = Math.abs(juanfeOwes - yukitaOwes);
    const hasPending = Boolean(expenseBalance?.hasPending);
    const netOwer: Person | null =
      hasPending || netAmount < 0.01
        ? null
        : juanfeOwes > yukitaOwes
          ? "Juanfe"
          : "Yukita";

    const paidByTotals = {
      Juanfe: { total: 0, count: 0 },
      Yukita: { total: 0, count: 0 },
      Both: { total: 0, count: 0 },
    };
    for (const row of paidByRows) {
      if (row.paidBy === "Juanfe" || row.paidBy === "Yukita" || row.paidBy === "Both") {
        paidByTotals[row.paidBy] = {
          total: money(row.total),
          count: count(row.count),
        };
      }
    }

    const categoryTotals = categoryRows
      .map((row) => ({
        category: row.category,
        total: money(row.total),
        juanfe: money(row.juanfe),
        yukita: money(row.yukita),
        both: money(row.both),
        currentMonth: money(row.currentMonth),
        count: count(row.count),
      }))
      .sort((a, b) => b.total - a.total);

    const bucketStart =
      window.startMonth ??
      monthlyRows.reduce<string | null>((earliest, row) => {
        if (!row.month) return earliest;
        return earliest === null || row.month < earliest ? row.month : earliest;
      }, null);
    const bucketEnd =
      window.endMonth ??
      monthlyRows.reduce<string | null>((latest, row) => {
        if (!row.month) return latest;
        return latest === null || row.month > latest ? row.month : latest;
      }, null);

    const bucketMap = new Map<string, MonthBucket>();
    if (bucketStart && bucketEnd) {
      for (const key of listMonthKeys(bucketStart, bucketEnd)) {
        const labels = monthLabels(key);
        bucketMap.set(key, {
          month: key,
          label: labels.label,
          shortLabel: labels.shortLabel,
          total: 0,
          byCategory: {},
        });
      }
    }

    for (const row of monthlyRows) {
      if (!row.month) continue;
      const labels = monthLabels(row.month);
      const bucket =
        bucketMap.get(row.month) ??
        {
          month: row.month,
          label: labels.label,
          shortLabel: labels.shortLabel,
          total: 0,
          byCategory: {},
        };
      const total = money(row.total);
      bucket.total += total;
      bucket.byCategory[row.category] = total;
      bucketMap.set(row.month, bucket);
    }

    const monthlyBuckets = Array.from(bucketMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
    const totalsInRange = monthlyBuckets.reduce((sum, bucket) => sum + bucket.total, 0);
    const monthsWithSpend = monthlyBuckets.filter((bucket) => bucket.total > 0).length;
    const lastBucket = monthlyBuckets[monthlyBuckets.length - 1];
    const prevBucket = monthlyBuckets[monthlyBuckets.length - 2];
    const topCategory = categoryTotals[0] ?? null;
    const lastMonthDeltaPct =
      lastBucket && prevBucket && prevBucket.total > 0
        ? ((lastBucket.total - prevBucket.total) / prevBucket.total) * 100
        : null;

    const settlementItems = settlementRows.slice(0, SETTLEMENT_LIST_LIMIT).map((row) => ({
      id: row.id,
      fromPerson: row.fromPerson,
      toPerson: row.toPerson,
      amount: money(row.amount),
      amountInCurrency: money(row.amountInCurrency),
      currency: row.currency,
      date: row.date,
      note: row.note,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const settlementsTotal =
      money(settlementBalance?.juanfeToYukita) + money(settlementBalance?.yukitaToJuanfe);
    const settlementsCount = count(settlementBalance?.count);

    res.json({
      range,
      currency,
      generatedAt: new Date().toISOString(),
      filters: {
        rangeStart: window.start,
        rangeEnd: window.end,
      },
      counts: {
        expenses: count(countRows[0]?.expenses),
        paidExpenses: count(countRows[0]?.paidExpenses),
        pendingExpenses: count(countRows[0]?.pendingExpenses),
        settlements: settlementsCount,
      },
      balance: {
        juanfeOwes,
        yukitaOwes,
        netOwer,
        netAmount,
        currency,
        hasPending,
      },
      paidByTotals,
      categoryTotals,
      monthBuckets: monthlyBuckets,
      monthlyBuckets,
      insights: {
        totalsInRange,
        averageMonthly: monthsWithSpend === 0 ? 0 : totalsInRange / monthsWithSpend,
        monthsWithSpend,
        topCategory: topCategory
          ? { category: topCategory.category, total: topCategory.total }
          : null,
        lastMonthDeltaPct,
      },
      settlementsSummary: {
        count: settlementsCount,
        total: settlementsTotal,
      },
      settlements: {
        total: settlementsTotal,
        byDirection: {
          juanfeToYukita: money(settlementBalance?.juanfeToYukita),
          yukitaToJuanfe: money(settlementBalance?.yukitaToJuanfe),
        },
        items: settlementItems,
        hasMore: settlementRows.length > SETTLEMENT_LIST_LIMIT,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics summary" });
  }
});

export default router;
