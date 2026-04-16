import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Expense,
  formatBoth,
  formatCOP,
  formatEUR,
} from "@/context/ExpensesContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS: Record<string, string> = {
  Groceries: "shopping-cart",
  "Rent & Utilities": "home",
  "Dining Out": "coffee",
  Transport: "navigation",
  Health: "heart",
  Entertainment: "film",
  Travel: "map",
  Shopping: "tag",
  Home: "tool",
  Other: "circle",
};

interface Props {
  expense: Expense;
  onDelete: (id: string) => void;
}

export function ExpenseCard({ expense, onDelete }: Props) {
  const colors = useColors();

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Delete this expense?")) {
        onDelete(expense.id);
      }
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete Expense", "Are you sure you want to delete this?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(expense.id),
      },
    ]);
  };

  const iconName =
    (CATEGORY_ICONS[expense.category] as any) || "circle";
  const isPaidByJuanfe = expense.paidBy === "Juanfe";
  const payerColor = isPaidByJuanfe ? colors.juanfe : colors.yukita;

  const date = new Date(expense.date);
  const dateStr = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
        <Feather name={iconName} size={20} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {expense.title}
          </Text>
          <TouchableOpacity onPress={handleDelete} hitSlop={8}>
            <Feather name="trash-2" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.amount, { color: colors.foreground }]}>
          {formatBoth(expense.amount, expense.currency)}
        </Text>
        <View style={styles.meta}>
          <View style={[styles.pill, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.pillText, { color: colors.mutedForeground }]}>
              {expense.category}
            </Text>
          </View>
          <View style={styles.spacer} />
          <View style={[styles.payerDot, { backgroundColor: payerColor }]} />
          <Text style={[styles.payer, { color: payerColor }]}>
            {expense.paidBy}
          </Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {" · "}{dateStr}
          </Text>
        </View>
        {expense.splitType === "full" && (
          <Text style={[styles.splitNote, { color: colors.mutedForeground }]}>
            Not shared
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  spacer: { flex: 1 },
  payerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  payer: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  splitNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
});
