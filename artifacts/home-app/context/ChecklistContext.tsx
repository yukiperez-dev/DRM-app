import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  category?: string;
  dueDate?: string;
}

interface ChecklistContextType {
  items: ChecklistItem[];
  addItem: (text: string, opts?: { category?: string; dueDate?: string }) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  updateItem: (id: string, text: string) => Promise<void>;
  setItemCategory: (id: string, category: string) => Promise<void>;
  setItemDueDate: (id: string, dueDate: string | undefined) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  loading: boolean;
}

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}/api`;
  }
  return "/api";
}

function rowToItem(row: any): ChecklistItem {
  const createdAtRaw = row.createdAt ?? row.created_at;
  const createdAt = createdAtRaw
    ? typeof createdAtRaw === "number"
      ? createdAtRaw
      : new Date(createdAtRaw).getTime()
    : Date.now();
  const dueDate = row.dueDate ?? row.due_date;
  return {
    id: row.id,
    text: row.text,
    done: !!row.done,
    createdAt,
    category: row.category ?? undefined,
    dueDate: dueDate ?? undefined,
  };
}

function sortItems(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

function createChecklistContext(listKey: "todo" | "grocery") {
  const Ctx = createContext<ChecklistContextType | null>(null);

  function Provider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const apiBase = useMemo(() => getApiBase(), []);

    const fetchItems = useCallback(async () => {
      try {
        const res = await fetch(`${apiBase}/checklist/${listKey}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setItems(sortItems((data as any[]).map(rowToItem)));
      } catch (err) {
        console.error(`Failed to load ${listKey} items`, err);
      } finally {
        setLoading(false);
      }
    }, [apiBase]);

    useEffect(() => {
      fetchItems();
    }, [fetchItems]);

    const addItem = useCallback(
      async (text: string, opts?: { category?: string; dueDate?: string }) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const id = genId();
        const res = await fetch(`${apiBase}/checklist/${listKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            text: trimmed,
            category: opts?.category,
            dueDate: opts?.dueDate,
          }),
        });
        if (!res.ok) throw new Error("Failed to create item");
        const created = rowToItem(await res.json());
        setItems((prev) => sortItems([created, ...prev]));
      },
      [apiBase]
    );

    const patchItem = useCallback(
      async (id: string, body: Record<string, unknown>) => {
        const res = await fetch(`${apiBase}/checklist/${listKey}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update item");
        const updated = rowToItem(await res.json());
        setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      },
      [apiBase]
    );

    const toggleItem = useCallback(
      async (id: string) => {
        const res = await fetch(`${apiBase}/checklist/${listKey}/${id}/toggle`, {
          method: "PATCH",
        });
        if (!res.ok) throw new Error("Failed to toggle item");
        const updated = rowToItem(await res.json());
        setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      },
      [apiBase]
    );

    const updateItem = useCallback(
      async (id: string, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        await patchItem(id, { text: trimmed });
      },
      [patchItem]
    );

    const setItemCategory = useCallback(
      async (id: string, category: string) => {
        await patchItem(id, { category });
      },
      [patchItem]
    );

    const setItemDueDate = useCallback(
      async (id: string, dueDate: string | undefined) => {
        await patchItem(id, { dueDate: dueDate ?? null });
      },
      [patchItem]
    );

    const deleteItem = useCallback(
      async (id: string) => {
        const res = await fetch(`${apiBase}/checklist/${listKey}/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete item");
        setItems((prev) => prev.filter((it) => it.id !== id));
      },
      [apiBase]
    );

    const clearCompleted = useCallback(async () => {
      const res = await fetch(`${apiBase}/checklist/${listKey}/completed`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear completed");
      setItems((prev) => prev.filter((it) => !it.done));
    }, [apiBase]);

    return (
      <Ctx.Provider
        value={{
          items,
          addItem,
          toggleItem,
          updateItem,
          setItemCategory,
          setItemDueDate,
          deleteItem,
          clearCompleted,
          loading,
        }}
      >
        {children}
      </Ctx.Provider>
    );
  }

  function useChecklist() {
    const ctx = useContext(Ctx);
    if (!ctx) {
      throw new Error(`Checklist provider for ${listKey} not found`);
    }
    return ctx;
  }

  return { Provider, useChecklist };
}

const todo = createChecklistContext("todo");
export const TodoProvider = todo.Provider;
export const useTodo = todo.useChecklist;

const grocery = createChecklistContext("grocery");
export const GroceryProvider = grocery.Provider;
export const useGrocery = grocery.useChecklist;
