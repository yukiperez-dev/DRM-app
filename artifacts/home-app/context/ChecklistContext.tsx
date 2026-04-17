import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  category?: string;
}

interface ChecklistContextType {
  items: ChecklistItem[];
  addItem: (text: string, opts?: { category?: string }) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  updateItem: (id: string, text: string) => Promise<void>;
  setItemCategory: (id: string, category: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  loading: boolean;
}

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function createChecklistContext(storageKey: string) {
  const Ctx = createContext<ChecklistContextType | null>(null);

  function Provider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(storageKey);
          if (raw) {
            setItems(JSON.parse(raw));
          }
        } catch (err) {
          console.error(`Failed to load ${storageKey}`, err);
        } finally {
          setLoading(false);
        }
      })();
    }, []);

    const persist = useCallback(async (next: ChecklistItem[]) => {
      setItems(next);
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      } catch (err) {
        console.error(`Failed to save ${storageKey}`, err);
      }
    }, []);

    const addItem = useCallback(
      async (text: string, opts?: { category?: string }) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const item: ChecklistItem = {
          id: genId(),
          text: trimmed,
          done: false,
          createdAt: Date.now(),
          category: opts?.category,
        };
        await persist([item, ...items]);
      },
      [items, persist]
    );

    const setItemCategory = useCallback(
      async (id: string, category: string) => {
        await persist(
          items.map((it) => (it.id === id ? { ...it, category } : it))
        );
      },
      [items, persist]
    );

    const toggleItem = useCallback(
      async (id: string) => {
        await persist(
          items.map((it) => (it.id === id ? { ...it, done: !it.done } : it))
        );
      },
      [items, persist]
    );

    const updateItem = useCallback(
      async (id: string, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        await persist(
          items.map((it) => (it.id === id ? { ...it, text: trimmed } : it))
        );
      },
      [items, persist]
    );

    const deleteItem = useCallback(
      async (id: string) => {
        await persist(items.filter((it) => it.id !== id));
      },
      [items, persist]
    );

    const clearCompleted = useCallback(async () => {
      await persist(items.filter((it) => !it.done));
    }, [items, persist]);

    return (
      <Ctx.Provider
        value={{
          items,
          addItem,
          toggleItem,
          updateItem,
          setItemCategory,
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
      throw new Error(`Checklist provider for ${storageKey} not found`);
    }
    return ctx;
  }

  return { Provider, useChecklist };
}

const todo = createChecklistContext("@home/todo-items");
export const TodoProvider = todo.Provider;
export const useTodo = todo.useChecklist;

const grocery = createChecklistContext("@home/grocery-items");
export const GroceryProvider = grocery.Provider;
export const useGrocery = grocery.useChecklist;
