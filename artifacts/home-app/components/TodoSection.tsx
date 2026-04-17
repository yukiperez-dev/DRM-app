import React from "react";

import { useTodo } from "@/context/ChecklistContext";
import { ChecklistSection } from "@/components/ChecklistSection";

export function TodoSection({ bottomPadding }: { bottomPadding: number }) {
  const ctx = useTodo();
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
      placeholder="Add a task…"
      emptyIcon="check-square"
      emptyTitle="Nothing to do"
      emptyText="Add a task above to get started"
    />
  );
}
