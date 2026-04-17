import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExpenseCard } from "@/components/ExpenseCard";
import { RecurringSection } from "@/components/RecurringSection";
import { SummarySection } from "@/components/SummarySection";
import { BudgetsSection } from "@/components/BudgetsSection";
import { TodoSection } from "@/components/TodoSection";
import { GroceryListSection } from "@/components/GroceryListSection";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { CATEGORIES, Currency, useExpenses } from "@/context/ExpensesContext";
import { useColors } from "@/hooks/useColors";

const ALL = "All";
const PENDING = "Pending";
type Tab =
  | "Expenses"
  | "Recurring"
  | "Budgets"
  | "Summary"
  | "To do"
  | "Grocery list";
const TABS: Tab[] = [
  "Expenses",
  "Recurring",
  "Budgets",
  "Summary",
  "To do",
  "Grocery list",
];

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, deleteExpense, loading } = useExpenses();
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  const [activeTab, setActiveTab] = useState<Tab>("Expenses");
  const [currency, setCurrency] = useState<Currency>("COP");

  const categories = [ALL, PENDING, ...CATEGORIES];

  const pendingCount = useMemo(
    () => expenses.filter((e) => e.isPaid === false).length,
    [expenses]
  );

  const filtered = useMemo(() => {
    if (selectedCategory === ALL) return expenses;
    if (selectedCategory === PENDING) return expenses.filter((e) => e.isPaid === false);
    return expenses.filter((e) => e.category === selectedCategory);
  }, [expenses, selectedCategory]);

  const handleAdd = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (activeTab === "Recurring") {
      router.push("/add-recurring");
    } else {
      router.push("/add-expense");
    }
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 100 : insets.bottom + 100;

  const showAddBtn = activeTab === "Expenses" || activeTab === "Recurring";
  const showCurrencyToggle = activeTab === "Summary" || activeTab === "Budgets";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
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
            Expenses
          </Text>
        </View>
        {showCurrencyToggle ? (
          <CurrencyToggle value={currency} onChange={setCurrency} />
        ) : showAddBtn ? (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={handleAdd}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Segmented control */}
      <View style={[styles.segmentRow, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.segmentBtn, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: isActive ? colors.primary : colors.mutedForeground },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {activeTab === "Expenses" && (
        <View style={styles.expensesContent}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const isPendingChip = cat === PENDING;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isPendingChip
                        ? colors.primary + "12"
                        : colors.secondary,
                      borderColor: isSelected
                        ? colors.primary
                        : isPendingChip
                        ? colors.primary + "60"
                        : colors.border,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    },
                  ]}
                >
                  {isPendingChip && (
                    <Feather
                      name="clock"
                      size={11}
                      color={isSelected ? colors.primaryForeground : colors.primary}
                    />
                  )}
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: isSelected
                          ? colors.primaryForeground
                          : isPendingChip
                          ? colors.primary
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                  {isPendingChip && pendingCount > 0 && (
                    <View
                      style={[
                        styles.pendingBadge,
                        { backgroundColor: isSelected ? "rgba(255,255,255,0.3)" : colors.primary },
                      ]}
                    >
                      <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ExpenseCard expense={item} onDelete={deleteExpense} />
            )}
            contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={filtered.length > 0}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="inbox" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  No expenses yet
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Tap the + button to add your first expense
                </Text>
              </View>
            }
          />
        </View>
      )}

      {activeTab === "Recurring" && (
        <RecurringSection bottomPadding={bottomPadding} />
      )}

      {activeTab === "Budgets" && (
        <BudgetsSection bottomPadding={bottomPadding} currency={currency} />
      )}

      {activeTab === "Summary" && (
        <SummarySection bottomPadding={bottomPadding} currency={currency} />
      )}

      {activeTab === "To do" && (
        <TodoSection bottomPadding={bottomPadding} />
      )}

      {activeTab === "Grocery list" && (
        <GroceryListSection bottomPadding={bottomPadding} />
      )}
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
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C0623A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  segmentRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  segmentText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  expensesContent: { flex: 1 },
  filterScroll: { maxHeight: 48, flexGrow: 0 },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 260,
  },
  pendingBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  pendingBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});
