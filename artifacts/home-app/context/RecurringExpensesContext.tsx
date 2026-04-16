import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Currency, PaidBy, SplitType, type Expense } from "./ExpensesContext";

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
  loading: boolean;
}

const RecurringExpensesContext = createContext<RecurringExpensesContextType | null>(null);

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}/api`;
  }
  return "/api";
}

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

  const apiBase = useMemo(() => getApiBase(), []);

  const fetchRecurring = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/recurring-expenses`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRecurringExpenses((data as any[]).map(rowToRecurring));
    } catch (err) {
      console.error("Failed to load recurring expenses", err);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  const addRecurring = useCallback(
    async (data: Omit<RecurringExpense, "id">) => {
      const res = await fetch(`${apiBase}/recurring-expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      const created = rowToRecurring(await res.json());
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
      value={{ recurringExpenses, addRecurring, updateRecurring, deleteRecurring, generateForMonth, loading }}
    >
      {children}
    </RecurringExpensesContext.Provider>
  );
}

export function useRecurringExpenses() {
  const ctx = useContext(RecurringExpensesContext);
  if (!ctx) throw new Error("useRecurringExpenses must be used within RecurringExpensesProvider");
  return ctx;
}
