import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Currency, PaidBy, SplitType, type Expense } from "./ExpensesContext";
import { getApiBase } from "../lib/api";
import { useRevalidateOnActive } from "@/hooks/useRevalidateOnActive";

export interface RecurringExpense {
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
  note?: string;
  dayOfMonth: number;
  isActive: boolean;
}

interface RecurringExpensesContextType {
  recurringExpenses: RecurringExpense[];
  addRecurring: (data: Omit<RecurringExpense, "id">) => Promise<void>;
  updateRecurring: (id: string, data: Omit<RecurringExpense, "id">) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  generateForMonth: (year: number, month: number) => Promise<{ generated: Expense[]; skipped: string[] }>;
  refreshRecurringExpenses: () => Promise<void>;
  ensureRecurringExpensesLoaded: () => Promise<void>;
  loading: boolean;
}

const RecurringExpensesContext = createContext<RecurringExpensesContextType | null>(null);

function rowToRecurring(row: any): RecurringExpense {
  return {
    id: row.id,
    title: row.title,
    amount: parseFloat(row.amount),
    currency: row.currency as Currency,
    category: row.category,
    paidBy: (row.paidBy ?? row.paid_by) as PaidBy,
    juanfePaidAmount: row.juanfePaidAmount != null ? parseFloat(row.juanfePaidAmount) :
                      row.juanfe_paid_amount != null ? parseFloat(row.juanfe_paid_amount) : undefined,
    yukitaPaidAmount: row.yukitaPaidAmount != null ? parseFloat(row.yukitaPaidAmount) :
                      row.yukita_paid_amount != null ? parseFloat(row.yukita_paid_amount) : undefined,
    splitType: (row.splitType ?? row.split_type) as SplitType,
    juanfeSplitPct: row.juanfeSplitPct ?? row.juanfe_split_pct ?? undefined,
    note: row.note ?? undefined,
    dayOfMonth: row.dayOfMonth ?? row.day_of_month ?? 1,
    isActive: row.isActive ?? row.is_active ?? true,
  };
}

export function RecurringExpensesProvider({ children }: { children: React.ReactNode }) {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const apiBase = useMemo(() => getApiBase(), []);

  const fetchRecurring = useCallback(async () => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    setLoading(true);
    const request = (async () => {
      try {
        const res = await fetch(`${apiBase}/recurring-expenses`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setRecurringExpenses((data as any[]).map(rowToRecurring));
        setLoaded(true);
      } catch (err) {
        console.error("Failed to load recurring expenses", err);
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = request;
    return request;
  }, [apiBase]);

  const ensureRecurringExpensesLoaded = useCallback(async () => {
    if (loaded) return;
    await fetchRecurring();
  }, [fetchRecurring, loaded]);

  useRevalidateOnActive(fetchRecurring, { enabled: loaded });

  const addRecurring = useCallback(
    async (data: Omit<RecurringExpense, "id">) => {
      const res = await fetch(`${apiBase}/recurring-expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      const created = rowToRecurring(await res.json());
      setLoaded(true);
      setRecurringExpenses((prev) => [...prev, created]);
    },
    [apiBase]
  );

  const updateRecurring = useCallback(
    async (id: string, data: Omit<RecurringExpense, "id">) => {
      const res = await fetch(`${apiBase}/recurring-expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = rowToRecurring(await res.json());
      setLoaded(true);
      setRecurringExpenses((prev) => prev.map((r) => (r.id === id ? updated : r)));
    },
    [apiBase]
  );

  const deleteRecurring = useCallback(
    async (id: string) => {
      const res = await fetch(`${apiBase}/recurring-expenses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setLoaded(true);
      setRecurringExpenses((prev) => prev.filter((r) => r.id !== id));
    },
    [apiBase]
  );

  const generateForMonth = useCallback(
    async (year: number, month: number) => {
      const res = await fetch(`${apiBase}/recurring-expenses/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      return await res.json();
    },
    [apiBase]
  );

  return (
    <RecurringExpensesContext.Provider
      value={{
        recurringExpenses,
        addRecurring,
        updateRecurring,
        deleteRecurring,
        generateForMonth,
        refreshRecurringExpenses: fetchRecurring,
        ensureRecurringExpensesLoaded,
        loading,
      }}
    >
      {children}
    </RecurringExpensesContext.Provider>
  );
}

export function useRecurringExpenses() {
  const ctx = useContext(RecurringExpensesContext);
  if (!ctx) throw new Error("useRecurringExpenses must be used within RecurringExpensesProvider");
  useEffect(() => {
    void ctx.ensureRecurringExpensesLoaded();
  }, [ctx.ensureRecurringExpensesLoaded]);
  return ctx;
}
