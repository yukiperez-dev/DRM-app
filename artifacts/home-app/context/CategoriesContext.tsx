import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const DEFAULT_CATEGORIES = [
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

interface CategoriesContextType {
  categories: string[];
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
  loading: boolean;
}

const CategoriesContext = createContext<CategoriesContextType | null>(null);

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  return "/api";
}

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const apiBase = useMemo(() => getApiBase(), []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data: string[] = await res.json();
      if (data.length > 0) setCategories(data);
    } catch (err) {
      console.error("Failed to load categories", err);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      const res = await fetch(`${apiBase}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to add category");
      }
      setCategories((prev) => [...prev, trimmed]);
    },
    [apiBase]
  );

  const deleteCategory = useCallback(
    async (name: string) => {
      const res = await fetch(
        `${apiBase}/categories/by-name/${encodeURIComponent(name)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete category");
      setCategories((prev) => prev.filter((c) => c !== name));
    },
    [apiBase]
  );

  return (
    <CategoriesContext.Provider value={{ categories, addCategory, deleteCategory, loading }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategories must be used within CategoriesProvider");
  return ctx;
}
