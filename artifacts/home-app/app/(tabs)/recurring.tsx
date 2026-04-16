import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  RecurringExpense,
  useRecurringExpenses,
} from "@/context/RecurringExpensesContext";
import { formatCOP, formatEUR } from "@/context/ExpensesContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS: Record<string, string> = {
  "Groceries": "shopping-cart",
  "Rent & Utilities": "home",
  "Dining Out": "coffee",
  "Transport": "navigation",
  "Health": "heart",
  "Entertainment": "film",
  "Travel": "map",
  "Shopping": "tag",
  "Home": "home",
  "Other": "more-horizontal",
};

export default function RecurringScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { recurringExpenses, deleteRecurring, generateForMonth, loading } = useRecurringExpenses();
  const [generating, setGenerating] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });

  const handleGenerate = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setGenerating(true);
    try {
      const result = await generateForMonth(currentYear, currentMonth);
      const generatedCount = result.generated?.length ?? 0;
      const skippedCount = result.skipped?.length ?? 0;

      let message = "";
      if (generatedCount > 0) {
        message += `${generatedCount} expense${generatedCount > 1 ? "s" : ""} created for ${monthName}.`;
      }
      if (skippedCount > 0) {
        message += `\n${skippedCount} already exist${skippedCount === 1 ? "s" : ""} for this month.`;
      }
      if (generatedCount === 0 && skippedCount === 0) {
        message = "No active recurring expenses to generate.";
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Done", message);
    } catch (err) {
      Alert.alert("Error", "Failed to generate expenses. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = (item: RecurringExpense) => {
    Alert.alert(
      "Delete Recurring Expense",
      `Remove "${item.title}" from recurring expenses?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRecurring(item.id);
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch {
              Alert.alert("Error", "Failed to delete.");
            }
          },
        },
      ]
    );
  };

  const formatAmount = (item: RecurringExpense) => {
    if (item.amount === 0) return "Amount not set";
    return item.currency === "COP" ? formatCOP(item.amount) : formatEUR(item.amount);
  };

  const getSplitLabel = (item: RecurringExpense) => {
    if (item.splitType === "full") return "No split";
    if (item.splitType === "custom") {
      const j = item.juanfeSplitPct ?? 50;
      return `J ${j}% · Y ${100 - j}%`;
    }
    return "50 / 50";
  };

  const activeCount = recurringExpenses.filter((r) => r.isActive).length;

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
            Recurring
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/add-recurring")}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={recurringExpenses}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Pressable
              style={[
                styles.generateBtn,
                {
                  backgroundColor: activeCount === 0 ? colors.secondary : colors.primary + "18",
                  borderColor: activeCount === 0 ? colors.border : colors.primary,
                  opacity: generating ? 0.6 : 1,
                },
              ]}
              onPress={handleGenerate}
              disabled={generating || activeCount === 0}
            >
              <Feather
                name={generating ? "loader" : "refresh-cw"}
                size={16}
                color={activeCount === 0 ? colors.mutedForeground : colors.primary}
              />
              <View style={styles.generateBtnText}>
                <Text
                  style={[
                    styles.generateBtnTitle,
                    { color: activeCount === 0 ? colors.mutedForeground : colors.primary },
                  ]}
                >
                  {generating ? "Generating…" : `Generate for ${monthName}`}
                </Text>
                <Text style={[styles.generateBtnSub, { color: colors.mutedForeground }]}>
                  {activeCount} active recurring expense{activeCount !== 1 ? "s" : ""}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <RecurringCard
            item={item}
            formatAmount={formatAmount}
            getSplitLabel={getSplitLabel}
            onEdit={() => router.push({ pathname: "/add-recurring", params: { id: item.id } })}
            onDelete={() => handleDelete(item)}
            colors={colors}
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Feather name="repeat" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No recurring expenses
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Tap + to add expenses that repeat every month
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

function RecurringCard({
  item,
  formatAmount,
  getSplitLabel,
  onEdit,
  onDelete,
  colors,
}: {
  item: RecurringExpense;
  formatAmount: (item: RecurringExpense) => string;
  getSplitLabel: (item: RecurringExpense) => string;
  onEdit: () => void;
  onDelete: () => void;
  colors: any;
}) {
  const icon = CATEGORY_ICONS[item.category] ?? "tag";

  return (
    <Pressable
      onPress={onEdit}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: item.isActive ? colors.border : colors.border,
          opacity: item.isActive ? 1 : 0.5,
        },
      ]}
    >
      <View style={[styles.cardIcon, { backgroundColor: colors.primary + "18" }]}>
        <Feather name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.isActive && (
            <View style={[styles.pausedBadge, { backgroundColor: colors.mutedForeground + "22" }]}>
              <Text style={[styles.pausedText, { color: colors.mutedForeground }]}>Paused</Text>
            </View>
          )}
        </View>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardAmount, { color: colors.primary }]}>
            {formatAmount(item)}
          </Text>
          <Text style={[styles.cardDot, { color: colors.mutedForeground }]}>·</Text>
          <Text style={[styles.cardSplit, { color: colors.mutedForeground }]}>
            {getSplitLabel(item)}
          </Text>
          <Text style={[styles.cardDot, { color: colors.mutedForeground }]}>·</Text>
          <Text style={[styles.cardSplit, { color: colors.mutedForeground }]}>
            Day {item.dayOfMonth}
          </Text>
        </View>
        <Text style={[styles.cardCategory, { color: colors.mutedForeground }]}>
          {item.category}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={12}
        style={styles.deleteBtn}
      >
        <Feather name="trash-2" size={16} color={colors.destructive} />
      </TouchableOpacity>
    </Pressable>
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
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  generateBtnText: {
    flex: 1,
    gap: 2,
  },
  generateBtnTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  generateBtnSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  pausedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pausedText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardAmount: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  cardDot: {
    fontSize: 12,
  },
  cardSplit: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  cardCategory: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  deleteBtn: {
    padding: 4,
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
});
