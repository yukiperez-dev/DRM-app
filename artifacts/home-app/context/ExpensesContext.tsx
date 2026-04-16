import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Currency = "COP" | "EUR";
export type Person = "Juanfe" | "Yukita";
export type PaidBy = "Juanfe" | "Yukita" | "Both";
export type SplitType = "equal" | "full";

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

interface Balance {
  juanfeOwes: number;
  yukitaOwes: number;
  netOwer: Person | null;
  netAmount: number;
  currency: Currency;
}

interface ExpensesContextType {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => void;
  deleteExpense: (id: string) => void;
  getBalance: (currency: Currency) => Balance;
  loading: boolean;
}

const ExpensesContext = createContext<ExpensesContextType | null>(null);

const STORAGE_KEY = "@homeapp_expenses";

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          setExpenses(JSON.parse(data));
        } catch {
          setExpenses([]);
        }
      }
      setLoading(false);
    });
  }, []);

  const saveExpenses = useCallback((updated: Expense[]) => {
    setExpenses(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const addExpense = useCallback(
    (expense: Omit<Expense, "id">) => {
      const id =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      saveExpenses([{ ...expense, id }, ...expenses]);
    },
    [expenses, saveExpenses]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      saveExpenses(expenses.filter((e) => e.id !== id));
    },
    [expenses, saveExpenses]
  );

  const getBalance = useCallback(
    (currency: Currency): Balance => {
      // juanfePaid = total Juanfe owes to Yukita (Yukita paid, Juanfe should reimburse)
      // yukitaPaid = total Yukita owes to Juanfe (Juanfe paid, Yukita should reimburse)
      let juanfePaid = 0;
      let yukitaPaid = 0;

      for (const expense of expenses) {
        if (expense.splitType !== "equal") continue;

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
          const half = total / 2;
          // Positive excess means that person overpaid, the other owes them
          const juanfeExcess = juanfeConv - half;
          if (juanfeExcess > 0) {
            yukitaPaid += juanfeExcess; // yukita owes juanfe
          } else if (juanfeExcess < 0) {
            juanfePaid += Math.abs(juanfeExcess); // juanfe owes yukita
          }
        } else {
          const amountInCurrency = convertAmount(
            expense.amount,
            expense.currency,
            currency
          );
          const half = amountInCurrency / 2;
          if (expense.paidBy === "Juanfe") {
            yukitaPaid += half;
          } else {
            juanfePaid += half;
          }
        }
      }

      const netAmount = Math.abs(juanfePaid - yukitaPaid);
      const netOwer: Person | null =
        netAmount < 0.01
          ? null
          : juanfePaid > yukitaPaid
          ? "Yukita"
          : "Juanfe";

      return {
        juanfeOwes: juanfePaid,
        yukitaOwes: yukitaPaid,
        netOwer,
        netAmount,
        currency,
      };
    },
    [expenses]
  );

  return (
    <ExpensesContext.Provider
      value={{ expenses, addExpense, deleteExpense, getBalance, loading }}
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
