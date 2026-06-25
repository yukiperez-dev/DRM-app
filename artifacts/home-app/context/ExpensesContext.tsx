import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getApiBase } from "../lib/api";
import { useRevalidateOnActive } from "@/hooks/useRevalidateOnActive";

export type Currency = "COP" | "EUR";
export type Person = "Juanfe" | "Yukita";
export type PaidBy = "Juanfe" | "Yukita" | "Both";
export type SplitType = "equal" | "custom" | "full";

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: Currency;
  category: string;
  paidBy: PaidBy;
  juanfePaidAmount?: number;
  yukitaPaidAmount?: number;
  splitType: SplitType;
  juanfeSplitPct?: number;
  isPaid: boolean;
  date: string;
  note?: string;
  billImageBase64?: string;
  hasBill?: boolean;
  recurringExpenseId?: string;
}

export interface Settlement {
  id: string;
  fromPerson: Person;
  toPerson: Person;
  amount: number;
  currency: Currency;
  date: string;
  note?: string;
}

export const CATEGORIES = [
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

export const COP_TO_EUR = 0.00023;
export const EUR_TO_COP = 4348;

export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency
): number {
  if (from === to) return amount;
  if (from === "COP" && to === "EUR") return amount * COP_TO_EUR;
  return amount * EUR_TO_COP;
}

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatBoth(amount: number, currency: Currency): string {
  if (currency === "COP") {
    const eur = convertAmount(amount, "COP", "EUR");
    return `${formatCOP(amount)} · ${formatEUR(eur)}`;
  } else {
    const cop = convertAmount(amount, "EUR", "COP");
    return `${formatEUR(amount)} · ${formatCOP(cop)}`;
  }
}

export function formatDateEU(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

export function formatDateEUShort(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}-${month}`;
}

export function getSplitLabel(expense: Expense): string | null {
  if (expense.splitType === "full") return "Not shared";
  if (expense.splitType === "custom") {
    const j = expense.juanfeSplitPct ?? 50;
    return `J ${j}% · Y ${100 - j}%`;
  }
  return null;
}

interface Balance {
  juanfeOwes: number;
  yukitaOwes: number;
  netOwer: Person | null;
  netAmount: number;
  currency: Currency;
  hasPending: boolean;
}

export type AnalyticsRange = "3M" | "6M" | "12M" | "ALL";

export interface ExpenseFilters {
  category?: string;
  isPaid?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface AnalyticsMonthBucket {
  key: string;
  label: string;
  shortLabel: string;
  total: number;
  byCategory: Record<string, number>;
}

export interface AnalyticsCategoryTotal {
  category: string;
  total: number;
  thisMonth: number;
  juanfe: number;
  yukita: number;
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  currency: Currency;
  balance: Balance;
  paidTotals: Record<Person, number>;
  categoryTotals: AnalyticsCategoryTotal[];
  monthBuckets: AnalyticsMonthBucket[];
  settlementsSummary: {
    count: number;
    total: number;
  };
  hasExpenses: boolean;
}

interface ExpensesContextType {
  expenses: Expense[];
  expenseFilters: ExpenseFilters;
  settlements: Settlement[];
  settlementsLoading: boolean;
  addExpense: (expense: Omit<Expense, "id">) => Promise<void>;
  addSettlement: (settlement: Omit<Settlement, "id">) => Promise<void>;
  updateExpense: (id: string, updates: Omit<Expense, "id">) => Promise<void>;
  togglePaid: (id: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  deleteSettlement: (id: string) => Promise<void>;
  refreshExpenses: () => Promise<void>;
  loadMoreExpenses: () => Promise<void>;
  setExpenseFilters: (filters: ExpenseFilters) => void;
  loadSettlements: () => Promise<void>;
  fetchExpenseDetail: (id: string) => Promise<Expense>;
  getBalance: (currency: Currency) => Balance;
  analyticsSummaries: Record<string, AnalyticsSummary>;
  analyticsLoading: Record<string, boolean>;
  analyticsRevision: number;
  loadAnalyticsSummary: (
    range: AnalyticsRange,
    currency: Currency,
    options?: { force?: boolean }
  ) => Promise<AnalyticsSummary | null>;
  loading: boolean;
  loadingMoreExpenses: boolean;
  hasMoreExpenses: boolean;
}

const ExpensesContext = createContext<ExpensesContextType | null>(null);

const EXPENSE_PAGE_SIZE = 40;

export function analyticsSummaryKey(range: AnalyticsRange, currency: Currency): string {
  return `${range}:${currency}`;
}

function dbRowToExpense(row: any): Expense {
  return {
    id: row.id,
    title: row.title,
    amount: parseFloat(row.amount),
    currency: row.currency as Currency,
    category: row.category,
    paidBy: row.paidBy ?? row.paid_by,
    juanfePaidAmount: row.juanfePaidAmount != null ? parseFloat(row.juanfePaidAmount) :
                      row.juanfe_paid_amount != null ? parseFloat(row.juanfe_paid_amount) : undefined,
    yukitaPaidAmount: row.yukitaPaidAmount != null ? parseFloat(row.yukitaPaidAmount) :
                      row.yukita_paid_amount != null ? parseFloat(row.yukita_paid_amount) : undefined,
    splitType: (row.splitType ?? row.split_type) as SplitType,
    juanfeSplitPct: row.juanfeSplitPct ?? row.juanfe_split_pct ?? undefined,
    isPaid: row.isPaid ?? row.is_paid ?? false,
    date: row.date,
    note: row.note ?? undefined,
    billImageBase64: row.billImageBase64 ?? row.bill_image_base64 ?? undefined,
    hasBill: row.hasBill ?? row.has_bill ?? Boolean(row.billImageBase64 ?? row.bill_image_base64),
    recurringExpenseId: row.recurringExpenseId ?? row.recurring_expense_id ?? undefined,
  };
}

function dbRowToSettlement(row: any): Settlement {
  return {
    id: row.id,
    fromPerson: (row.fromPerson ?? row.from_person) as Person,
    toPerson: (row.toPerson ?? row.to_person) as Person,
    amount: parseFloat(row.amount),
    currency: row.currency as Currency,
    date: row.date,
    note: row.note ?? undefined,
  };
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toNullablePerson(value: unknown): Person | null {
  return value === "Juanfe" || value === "Yukita" ? value : null;
}

function emptyBalance(currency: Currency): Balance {
  return {
    juanfeOwes: 0,
    yukitaOwes: 0,
    netOwer: null,
    netAmount: 0,
    currency,
    hasPending: false,
  };
}

function normalizePaidTotals(raw: any): Record<Person, number> {
  const totalFromRecord = (record: any, keys: string[]) => {
    if (!record || typeof record !== "object") return 0;
    for (const key of keys) {
      if (!(key in record)) continue;
      const value = record[key];
      if (value && typeof value === "object") {
        return toNumber(value.total ?? value.amount ?? value.value);
      }
      return toNumber(value);
    }
    return 0;
  };

  if (Array.isArray(raw)) {
    return raw.reduce<Record<Person, number>>(
      (totals, row) => {
        const person = String(row.person ?? row.paidBy ?? row.paid_by ?? row.name);
        if (person === "Juanfe" || person === "Yukita") {
          totals[person] += toNumber(row.total ?? row.amount ?? row.value);
        }
        return totals;
      },
      { Juanfe: 0, Yukita: 0 }
    );
  }

  return {
    Juanfe: totalFromRecord(raw, ["Juanfe", "juanfe", "juanfeTotal", "juanfe_total"]),
    Yukita: totalFromRecord(raw, ["Yukita", "yukita", "yukitaTotal", "yukita_total"]),
  };
}

function normalizeCategoryTotals(raw: any): AnalyticsCategoryTotal[] {
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
    ? Object.entries(raw).map(([category, value]) => ({
        category,
        ...(typeof value === "object" && value !== null ? value : { total: value }),
      }))
    : [];

  return rows
    .map((row: any) => ({
      category: String(row.category ?? row.name ?? "Other"),
      total: toNumber(row.total ?? row.amount ?? row.value),
      thisMonth: toNumber(
        row.thisMonth ?? row.this_month ?? row.currentMonth ?? row.current_month
      ),
      juanfe: toNumber(row.juanfe ?? row.Juanfe ?? row.juanfeTotal ?? row.juanfe_total),
      yukita: toNumber(row.yukita ?? row.Yukita ?? row.yukitaTotal ?? row.yukita_total),
    }))
    .sort((a, b) => b.total - a.total);
}

function normalizeByCategory(raw: any): Record<string, number> {
  if (Array.isArray(raw)) {
    return raw.reduce<Record<string, number>>((totals, row) => {
      const category = String(row.category ?? row.name ?? "Other");
      totals[category] =
        (totals[category] ?? 0) + toNumber(row.total ?? row.amount ?? row.value);
      return totals;
    }, {});
  }

  if (raw && typeof raw === "object") {
    return Object.fromEntries(
      Object.entries(raw).map(([category, value]) => [
        category,
        toNumber(
          typeof value === "object" && value !== null
            ? (value as any).total ?? (value as any).amount ?? (value as any).value
            : value
        ),
      ])
    );
  }

  return {};
}

function monthShortLabel(label: string): string {
  return label.split(" ")[0] || label;
}

function normalizeMonthBuckets(raw: any): AnalyticsMonthBucket[] {
  const rows = Array.isArray(raw) ? raw : [];

  return rows.map((row: any, index) => {
    const key = String(
      row.key ?? row.month ?? row.monthKey ?? row.month_key ?? `bucket-${index}`
    );
    const label = String(row.label ?? row.name ?? key);
    const total = toNumber(row.total ?? row.amount ?? row.spend ?? row.value);
    const byCategory = normalizeByCategory(
      row.byCategory ?? row.by_category ?? row.categories ?? row.categoryTotals
    );
    return {
      key,
      label,
      shortLabel: String(row.shortLabel ?? row.short_label ?? monthShortLabel(label)),
      total,
      byCategory:
        Object.keys(byCategory).length > 0 || total <= 0
          ? byCategory
          : { Total: total },
    };
  });
}

function normalizeAnalyticsSummary(
  data: any,
  range: AnalyticsRange,
  currency: Currency
): AnalyticsSummary {
  const rawBalance = data?.balance ?? data?.balances ?? {};
  const balance: Balance = {
    ...emptyBalance(currency),
    juanfeOwes: toNumber(
      rawBalance.juanfeOwes ?? rawBalance.juanfe_owes ?? rawBalance.juanfe
    ),
    yukitaOwes: toNumber(
      rawBalance.yukitaOwes ?? rawBalance.yukita_owes ?? rawBalance.yukita
    ),
    netOwer: toNullablePerson(rawBalance.netOwer ?? rawBalance.net_ower),
    netAmount: toNumber(rawBalance.netAmount ?? rawBalance.net_amount),
    currency: (rawBalance.currency as Currency) ?? currency,
    hasPending: Boolean(rawBalance.hasPending ?? rawBalance.has_pending),
  };
  const paidTotals = normalizePaidTotals(
    data?.paidTotals ?? data?.paid_totals ?? data?.paidByTotals ?? data?.paid_by_totals
  );
  const categoryTotals = normalizeCategoryTotals(
    data?.categoryTotals ?? data?.category_totals ?? data?.categories
  );
  const monthBuckets = normalizeMonthBuckets(
    data?.monthBuckets ??
      data?.month_buckets ??
      data?.monthlyBuckets ??
      data?.monthly_buckets ??
      data?.months ??
      data?.buckets
  );
  const rawSettlements =
    data?.settlementsSummary ?? data?.settlements_summary ?? data?.settlements ?? {};
  const hasExpenses =
    Boolean(data?.hasExpenses ?? data?.has_expenses) ||
    paidTotals.Juanfe > 0 ||
    paidTotals.Yukita > 0 ||
    categoryTotals.some((cat) => cat.total > 0 || cat.thisMonth > 0) ||
    monthBuckets.some((bucket) => bucket.total > 0);

  return {
    range,
    currency,
    balance,
    paidTotals,
    categoryTotals,
    monthBuckets,
    settlementsSummary: {
      count: toNumber(rawSettlements.count),
      total: toNumber(rawSettlements.total ?? rawSettlements.amount),
    },
    hasExpenses,
  };
}

function parseExpensesResponse(data: any): {
  items: Expense[];
  nextCursor: string | null;
  hasMore: boolean;
} {
  if (Array.isArray(data)) {
    return {
      items: data.map(dbRowToExpense),
      nextCursor: null,
      hasMore: false,
    };
  }

  const rows = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.expenses)
    ? data.expenses
    : [];
  const nextCursor = data?.nextCursor ?? data?.next_cursor ?? null;

  return {
    items: rows.map(dbRowToExpense),
    nextCursor,
    hasMore: Boolean(data?.hasMore ?? data?.has_more ?? nextCursor),
  };
}

function sameExpenseFilters(a: ExpenseFilters, b: ExpenseFilters): boolean {
  return (
    a.category === b.category &&
    a.isPaid === b.isPaid &&
    a.dateFrom === b.dateFrom &&
    a.dateTo === b.dateTo
  );
}

function expenseMatchesFilters(expense: Expense, filters: ExpenseFilters): boolean {
  if (filters.category && expense.category !== filters.category) return false;
  if (filters.isPaid !== undefined && expense.isPaid !== filters.isPaid) return false;
  const expenseDate = expense.date.slice(0, 10);
  if (filters.dateFrom && expenseDate < filters.dateFrom) return false;
  if (filters.dateTo && expenseDate > filters.dateTo) return false;
  return true;
}

function mergeExpenseList(current: Expense[], incoming: Expense[]): Expense[] {
  const seen = new Set(current.map((expense) => expense.id));
  const next = [...current];
  for (const expense of incoming) {
    if (!seen.has(expense.id)) {
      seen.add(expense.id);
      next.push(expense);
    }
  }
  return next;
}

function upsertVisibleExpense(
  current: Expense[],
  expense: Expense,
  filters: ExpenseFilters,
  prepend = false
): Expense[] {
  const matches = expenseMatchesFilters(expense, filters);
  const exists = current.some((item) => item.id === expense.id);

  if (!matches) {
    return exists ? current.filter((item) => item.id !== expense.id) : current;
  }

  if (exists) {
    return current.map((item) => (item.id === expense.id ? expense : item));
  }

  return prepend ? [expense, ...current] : [...current, expense];
}

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseFilters, setExpenseFiltersState] = useState<ExpenseFilters>({});
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMoreExpenses, setLoadingMoreExpenses] = useState(false);
  const [hasMoreExpenses, setHasMoreExpenses] = useState(false);
  const [nextExpensesCursor, setNextExpensesCursor] = useState<string | null>(null);
  const [settlementsLoading, setSettlementsLoading] = useState(false);
  const [settlementsLoaded, setSettlementsLoaded] = useState(false);
  const [analyticsSummaries, setAnalyticsSummaries] = useState<
    Record<string, AnalyticsSummary>
  >({});
  const [analyticsLoading, setAnalyticsLoading] = useState<Record<string, boolean>>({});
  const [analyticsRevision, setAnalyticsRevision] = useState(0);

  const apiBase = useMemo(() => getApiBase(), []);
  const expenseFiltersRef = useRef(expenseFilters);
  const expensesRequestRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const settlementsRequestRef = useRef<Promise<void> | null>(null);
  const analyticsSummariesRef = useRef<Record<string, AnalyticsSummary>>({});
  const analyticsRequestsRef = useRef<
    Partial<Record<string, Promise<AnalyticsSummary | null>>>
  >({});

  useEffect(() => {
    expenseFiltersRef.current = expenseFilters;
  }, [expenseFilters]);

  const invalidateAnalyticsSummaries = useCallback(() => {
    analyticsSummariesRef.current = {};
    setAnalyticsSummaries({});
    setAnalyticsRevision((revision) => revision + 1);
  }, []);

  const buildExpensesUrl = useCallback(
    (filters: ExpenseFilters, cursor?: string | null) => {
      const params = new URLSearchParams();
      params.set("limit", String(EXPENSE_PAGE_SIZE));
      if (cursor) params.set("cursor", cursor);
      if (filters.category) params.set("category", filters.category);
      if (filters.isPaid !== undefined) params.set("isPaid", String(filters.isPaid));
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      return `${apiBase}/expenses?${params.toString()}`;
    },
    [apiBase]
  );

  const fetchExpenses = useCallback(async () => {
    const requestId = ++expensesRequestRef.current;
    const filters = expenseFiltersRef.current;
    setLoading(true);
    setNextExpensesCursor(null);
    setHasMoreExpenses(false);
    try {
      const res = await fetch(buildExpensesUrl(filters), { cache: "no-store" });

      if (!res.ok) throw new Error("Failed to fetch");

      const page = parseExpensesResponse(await res.json());

      if (requestId !== expensesRequestRef.current) return;
      setExpenses(page.items);
      setNextExpensesCursor(page.nextCursor);
      setHasMoreExpenses(page.hasMore);
    } catch (err) {
      console.error("Failed to load expense data from API", err);
    } finally {
      if (requestId === expensesRequestRef.current) {
        setLoading(false);
      }
    }
  }, [buildExpensesUrl]);

  useEffect(() => {
    fetchExpenses();
  }, [expenseFilters, fetchExpenses]);

  useRevalidateOnActive(fetchExpenses);

  const setExpenseFilters = useCallback((filters: ExpenseFilters) => {
    setExpenseFiltersState((prev) => (sameExpenseFilters(prev, filters) ? prev : filters));
  }, []);

  const loadMoreExpenses = useCallback(async () => {
    if (!hasMoreExpenses || !nextExpensesCursor || loadingMoreRef.current) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMoreExpenses(true);

    try {
      const filters = expenseFiltersRef.current;
      const res = await fetch(buildExpensesUrl(filters, nextExpensesCursor), {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch next expenses page");

      const page = parseExpensesResponse(await res.json());
      setExpenses((prev) => mergeExpenseList(prev, page.items));
      setNextExpensesCursor(page.nextCursor);
      setHasMoreExpenses(page.hasMore);
    } catch (err) {
      console.error("Failed to load more expenses", err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMoreExpenses(false);
    }
  }, [buildExpensesUrl, hasMoreExpenses, nextExpensesCursor]);

  const loadSettlements = useCallback(async () => {
    if (settlementsRequestRef.current) {
      return settlementsRequestRef.current;
    }

    setSettlementsLoading(true);
    const request = fetch(`${apiBase}/settlements`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch settlements");
        const data = await res.json();
        setSettlements((data as any[]).map(dbRowToSettlement).reverse());
        setSettlementsLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load settlements", err);
      })
      .finally(() => {
        settlementsRequestRef.current = null;
        setSettlementsLoading(false);
      });

    settlementsRequestRef.current = request;
    return request;
  }, [apiBase]);

  useRevalidateOnActive(loadSettlements, { enabled: settlementsLoaded });

  const loadAnalyticsSummary = useCallback(
    async (
      range: AnalyticsRange,
      currency: Currency,
      options: { force?: boolean } = {}
    ) => {
      const key = analyticsSummaryKey(range, currency);
      if (!options.force && analyticsSummariesRef.current[key]) {
        return analyticsSummariesRef.current[key];
      }

      if (!options.force && analyticsRequestsRef.current[key]) {
        return analyticsRequestsRef.current[key];
      }

      setAnalyticsLoading((prev) => ({ ...prev, [key]: true }));

      const request = fetch(
        `${apiBase}/analytics/summary?range=${encodeURIComponent(
          range
        )}&currency=${encodeURIComponent(currency)}`,
        { cache: "no-store" }
      )
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to fetch analytics summary");
          const summary = normalizeAnalyticsSummary(await res.json(), range, currency);
          analyticsSummariesRef.current = {
            ...analyticsSummariesRef.current,
            [key]: summary,
          };
          setAnalyticsSummaries(analyticsSummariesRef.current);
          return summary;
        })
        .catch((err) => {
          console.error("Failed to load analytics summary", err);
          return null;
        })
        .finally(() => {
          delete analyticsRequestsRef.current[key];
          setAnalyticsLoading((prev) => ({ ...prev, [key]: false }));
        });

      analyticsRequestsRef.current[key] = request;
      return request;
    },
    [apiBase]
  );

  const addExpense = useCallback(
    async (expense: Omit<Expense, "id">) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const body = { ...expense, id };
      const res = await fetch(`${apiBase}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create expense");
      const created = dbRowToExpense(await res.json());
      setExpenses((prev) =>
        upsertVisibleExpense(prev, created, expenseFiltersRef.current, true)
      );
      invalidateAnalyticsSummaries();
    },
    [apiBase, invalidateAnalyticsSummaries]
  );

  const updateExpense = useCallback(
    async (id: string, updates: Omit<Expense, "id">) => {
      const res = await fetch(`${apiBase}/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update expense");
      const updated = dbRowToExpense(await res.json());
      setExpenses((prev) =>
        upsertVisibleExpense(prev, updated, expenseFiltersRef.current)
      );
      invalidateAnalyticsSummaries();
    },
    [apiBase, invalidateAnalyticsSummaries]
  );

  const fetchExpenseDetail = useCallback(
    async (id: string) => {
      const res = await fetch(`${apiBase}/expenses/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch expense");
      const fetched = dbRowToExpense(await res.json());
      setExpenses((prev) =>
        upsertVisibleExpense(prev, fetched, expenseFiltersRef.current)
      );
      return fetched;
    },
    [apiBase]
  );

  const addSettlement = useCallback(
    async (settlement: Omit<Settlement, "id">) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const body = { ...settlement, id };
      const res = await fetch(`${apiBase}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create settlement");
      const created = dbRowToSettlement(await res.json());
      setSettlements((prev) => [created, ...prev]);
      setSettlementsLoaded(true);
      invalidateAnalyticsSummaries();
    },
    [apiBase, invalidateAnalyticsSummaries]
  );

  const togglePaid = useCallback(
    async (id: string) => {
      const res = await fetch(`${apiBase}/expenses/${id}/toggle-paid`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to toggle expense");
      const updated = dbRowToExpense(await res.json());
      setExpenses((prev) =>
        upsertVisibleExpense(prev, updated, expenseFiltersRef.current)
      );
      invalidateAnalyticsSummaries();
    },
    [apiBase, invalidateAnalyticsSummaries]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const res = await fetch(`${apiBase}/expenses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete expense");
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      invalidateAnalyticsSummaries();
    },
    [apiBase, invalidateAnalyticsSummaries]
  );

  const deleteSettlement = useCallback(
    async (id: string) => {
      const res = await fetch(`${apiBase}/settlements/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete settlement");
      setSettlements((prev) => prev.filter((settlement) => settlement.id !== id));
      invalidateAnalyticsSummaries();
    },
    [apiBase, invalidateAnalyticsSummaries]
  );

  const getBalance = useCallback(
    (currency: Currency): Balance => {
      let juanfePaid = 0;
      let yukitaPaid = 0;
      let hasPending = false;

      for (const expense of expenses) {
        if (expense.isPaid === false) {
          hasPending = true;
          continue;
        }
        if (expense.splitType === "full") continue;

        const juanfePct =
          expense.splitType === "custom"
            ? (expense.juanfeSplitPct ?? 50) / 100
            : 0.5;
        const yukitaPct = 1 - juanfePct;

        if (expense.paidBy === "Both") {
          const juanfeConv = convertAmount(
            expense.juanfePaidAmount ?? 0,
            expense.currency,
            currency
          );
          const yukitaConv = convertAmount(
            expense.yukitaPaidAmount ?? 0,
            expense.currency,
            currency
          );
          const total = juanfeConv + yukitaConv;
          const juanfeExcess = juanfeConv - total * juanfePct;
          if (juanfeExcess > 0) {
            yukitaPaid += juanfeExcess;
          } else if (juanfeExcess < 0) {
            juanfePaid += Math.abs(juanfeExcess);
          }
        } else {
          const amountInCurrency = convertAmount(
            expense.amount,
            expense.currency,
            currency
          );
          if (expense.paidBy === "Juanfe") {
            yukitaPaid += amountInCurrency * yukitaPct;
          } else {
            juanfePaid += amountInCurrency * juanfePct;
          }
        }
      }

      for (const settlement of settlements) {
        const amountInCurrency = convertAmount(
          settlement.amount,
          settlement.currency,
          currency
        );

        if (settlement.fromPerson === "Juanfe" && settlement.toPerson === "Yukita") {
          juanfePaid -= amountInCurrency;
        } else if (
          settlement.fromPerson === "Yukita" &&
          settlement.toPerson === "Juanfe"
        ) {
          yukitaPaid -= amountInCurrency;
        }
      }

      const netAmount = Math.abs(juanfePaid - yukitaPaid);
      const netOwer: Person | null =
        hasPending || netAmount < 0.01
          ? null
          : juanfePaid > yukitaPaid
          ? "Juanfe"
          : "Yukita";

      return {
        juanfeOwes: juanfePaid,
        yukitaOwes: yukitaPaid,
        netOwer,
        netAmount,
        currency,
        hasPending,
      };
    },
    [expenses, settlements]
  );

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        expenseFilters,
        settlements,
        settlementsLoading,
        addExpense,
        addSettlement,
        updateExpense,
        togglePaid,
        deleteExpense,
        deleteSettlement,
        refreshExpenses: fetchExpenses,
        loadMoreExpenses,
        setExpenseFilters,
        loadSettlements,
        fetchExpenseDetail,
        getBalance,
        analyticsSummaries,
        analyticsLoading,
        analyticsRevision,
        loadAnalyticsSummary,
        loading,
        loadingMoreExpenses,
        hasMoreExpenses,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error("useExpenses must be used within ExpensesProvider");
  return ctx;
}
