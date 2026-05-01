import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
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
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { CATEGORIES, Currency, Expense, useExpenses } from "@/context/ExpensesContext";
import { useColors } from "@/hooks/useColors";

const ALL = "All";
const PENDING = "Pending";
type Tab = "Expenses" | "Recurring" | "Budgets" | "Summary";
const TABS: Tab[] = ["Expenses", "Recurring", "Budgets", "Summary"];

interface ExpenseSection {
  key: string;
  title: string;
  count: number;
  data: Expense[];
}

function expenseMonthKey(date: string): string {
  const [year, month] = date.split("-");
  return `${year}-${month}`;
}

function expenseMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const parsed = new Date(year, (month || 1) - 1, 1);
  return parsed.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function buildExpenseSections(expenses: Expense[]): ExpenseSection[] {
  const sortedExpenses = [...expenses].sort((a, b) => {
    if (a.date === b.date) {
      return b.id.localeCompare(a.id);
    }
    return b.date.localeCompare(a.date);
  });

  const monthMap = new Map<string, Expense[]>();

  for (const expense of sortedExpenses) {
    const key = expenseMonthKey(expense.date);
    if (!monthMap.has(key)) {
      monthMap.set(key, []);
    }
    monthMap.get(key)!.push(expense);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, data]) => ({
      key,
      title: expenseMonthLabel(key),
      count: data.length,
      data,
    }));
}

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
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

  const expenseSections = useMemo(() => buildExpenseSections(filtered), [filtered]);

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

  const topPadding = isWeb ? Math.max(insets.top, 12) : insets.top;
  const bottomPadding = isWeb ? 100 : insets.bottom + 100;

  const showAddBtn = activeTab === "Expenses" || activeTab === "Recurring";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.pageShell, isWeb && styles.pageShellWeb]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            isWeb && styles.headerWeb,
            {
              paddingTop: topPadding + (isWeb ? 8 : 16),
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View>
            <Text style={[styles.greeting, isWeb && styles.greetingWeb, { color: colors.mutedForeground }]}>
              Juanfe & Yukita
            </Text>
            <Text style={[styles.title, isWeb && styles.titleWeb, { color: colors.foreground }]}>
              Expenses
            </Text>
          </View>
          {activeTab === "Summary" || activeTab === "Budgets" ? (
            <CurrencyToggle value={currency} onChange={setCurrency} />
          ) : (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={handleAdd}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={isWeb ? 20 : 22} color="#fff" />
            </TouchableOpacity>
          )}
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
            <View style={styles.filtersWrap}>
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
            </View>

            <SectionList
              sections={expenseSections}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ExpenseCard expense={item} onDelete={deleteExpense} />
              )}
              renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    {section.title}
                  </Text>
                  <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
                    {section.count} expense{section.count === 1 ? "" : "s"}
                  </Text>
                </View>
              )}
              contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
              showsVerticalScrollIndicator={false}
              scrollEnabled={expenseSections.length > 0}
              stickySectionHeadersEnabled={false}
              ListEmptyComponent={
                loading ? (
                  <View style={styles.empty}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                      Loading expenses...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.empty}>
                    <Feather name="inbox" size={48} color={colors.mutedForeground} />
                    <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                      No expenses yet
                    </Text>
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                      Tap the + button to add your first expense
                    </Text>
                  </View>
                )
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageShell: {
    flex: 1,
    width: "100%",
  },
  pageShellWeb: {
    alignSelf: "center",
    maxWidth: 1180,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerWeb: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  greetingWeb: {
    fontSize: 12,
    marginBottom: 0,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  titleWeb: {
    fontSize: 24,
    lineHeight: 30,
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
  filtersWrap: {
    overflow: "visible",
  },
  filterScroll: {
    flexGrow: 0,
    overflow: "visible",
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 34,
    flexShrink: 0,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionHeader: {
    paddingTop: 6,
    paddingBottom: 10,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  sectionMeta: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
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
