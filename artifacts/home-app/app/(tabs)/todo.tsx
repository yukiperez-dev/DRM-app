import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TodoChecklistSection } from "@/components/TodoChecklistSection";
import { useTodo } from "@/context/ChecklistContext";
import { useColors } from "@/hooks/useColors";

export default function TodoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const ctx = useTodo();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 100 : insets.bottom + 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 16,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Juanfe & Yukita
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            To do
          </Text>
        </View>
      </View>

      <TodoChecklistSection
        bottomPadding={bottomPadding}
        items={ctx.items}
        loading={ctx.loading}
        addItem={ctx.addItem}
        toggleItem={ctx.toggleItem}
        updateItem={ctx.updateItem}
        setItemDueDate={ctx.setItemDueDate}
        deleteItem={ctx.deleteItem}
        clearCompleted={ctx.clearCompleted}
        placeholder="Add a task…"
        emptyIcon="check-square"
        emptyTitle="Nothing to do"
        emptyText="Add chores or tasks for the week or month"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
});
