import React from "react";

import { useGrocery } from "@/context/ChecklistContext";
import { ChecklistSection } from "@/components/ChecklistSection";

export function GroceryListSection({
  bottomPadding,
}: {
  bottomPadding: number;
}) {
  const ctx = useGrocery();
  return (
    <ChecklistSection
      bottomPadding={bottomPadding}
      items={ctx.items}
      loading={ctx.loading}
      addItem={ctx.addItem}
      toggleItem={ctx.toggleItem}
      updateItem={ctx.updateItem}
      deleteItem={ctx.deleteItem}
      clearCompleted={ctx.clearCompleted}
      placeholder="Add an item…"
      emptyIcon="shopping-cart"
      emptyTitle="Grocery list is empty"
      emptyText="Add items you need to buy on your next trip"
    />
  );
}
