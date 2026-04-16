import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  recurringExpenseId?: string;
}


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

interface ExpensesContextType {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => Promise<void>;
  updateExpense: (id: string, updates: Omit<Expense, "id">) => Promise<void>;
  togglePaid: (id: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getBalance: (currency: Currency) => Balance;
  loading: boolean;
}

const ExpensesContext = createContext<ExpensesContextType | null>(null);

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}/api`;
  }
  return "/api";
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
    recurringExpenseId: row.recurringExpenseId ?? row.recurring_expense_id ?? undefined,
  };
}

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const apiBase = useMemo(() => getApiBase(), []);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/expenses`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setExpenses((data as any[]).map(dbRowToExpense).reverse());
    } catch (err) {
      console.error("Failed to load expenses from API", err);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

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
      setExpenses((prev) => [created, ...prev]);
    },
    [apiBase]
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
      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    },
    [apiBase]
  );

  const togglePaid = useCallback(
    async (id: string) => {
      const res = await fetch(`${apiBase}/expenses/${id}/toggle-paid`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to toggle expense");
      const updated = dbRowToExpense(await res.json());
      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    },
    [apiBase]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const res = await fetch(`${apiBase}/expenses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete expense");
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    },
    [apiBase]
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
    [expenses]
  );

  return (
    <ExpensesContext.Provider
      value={{ expenses, addExpense, updateExpense, togglePaid, deleteExpense, getBalance, loading }}
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
