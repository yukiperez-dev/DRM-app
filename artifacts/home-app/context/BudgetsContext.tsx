import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Currency } from "./ExpensesContext";
import { getApiBase } from "../lib/api";
import { useRevalidateOnActive } from "@/hooks/useRevalidateOnActive";

export interface Budget {
  id: string;
  category: string;
  amount: number;
  currency: Currency;
}

interface BudgetsContextType {
  budgets: Budget[];
  getBudget: (category: string) => Budget | undefined;
  setBudget: (category: string, amount: number, currency: Currency) => Promise<void>;
  removeBudget: (category: string) => Promise<void>;
  refreshBudgets: () => Promise<void>;
  loading: boolean;
}

const BudgetsContext = createContext<BudgetsContextType | null>(null);

function rowToBudget(row: any): Budget {
  return {
    id: row.id,
    category: row.category,
    amount: parseFloat(row.amount),
    currency: row.currency as Currency,
  };
}

export function BudgetsProvider({ children }: { children: React.ReactNode }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const apiBase = useMemo(() => getApiBase(), []);

  const fetchBudgets = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/budgets`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch budgets");
      const data = await res.json();
      setBudgets((data as any[]).map(rowToBudget));
    } catch (err) {
      console.error("Failed to load budgets", err);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  useRevalidateOnActive(fetchBudgets);

  const getBudget = useCallback(
    (category: string) => budgets.find((b) => b.category === category),
    [budgets]
  );

  const setBudget = useCallback(
    async (category: string, amount: number, currency: Currency) => {
      const res = await fetch(`${apiBase}/budgets/${encodeURIComponent(category)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency }),
      });
      if (!res.ok) throw new Error("Failed to set budget");
      const updated = rowToBudget(await res.json());
      setBudgets((prev) => {
        const idx = prev.findIndex((b) => b.category === category);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
    },
    [apiBase]
  );

  const removeBudget = useCallback(
    async (category: string) => {
      const res = await fetch(`${apiBase}/budgets/${encodeURIComponent(category)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove budget");
      setBudgets((prev) => prev.filter((b) => b.category !== category));
    },
    [apiBase]
  );

  return (
    <BudgetsContext.Provider
      value={{ budgets, getBudget, setBudget, removeBudget, refreshBudgets: fetchBudgets, loading }}
    >
      {children}
    </BudgetsContext.Provider>
  );
}

export function useBudgets() {
  const ctx = useContext(BudgetsContext);
  if (!ctx) throw new Error("useBudgets must be used within BudgetsProvider");
  return ctx;
}
