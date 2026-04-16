import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Expense,
  formatBoth,
  getSplitLabel,
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
  const [billVisible, setBillVisible] = useState(false);

  const handleDelete = (e: any) => {
    if (Platform.OS === "web") {
      if (window.confirm("Delete this expense?")) {
        onDelete(expense.id);
      }
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete Expense", "Are you sure you want to delete this?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(expense.id) },
    ]);
  };

  const handleCardPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/expense/${expense.id}`);
  };

  const iconName = (CATEGORY_ICONS[expense.category] as any) || "circle";
  const isBoth = expense.paidBy === "Both";
  const splitLabel = getSplitLabel(expense);
  const hasBill = Boolean(expense.billImageBase64);

  const date = new Date(expense.date);
  const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <>
      <Pressable
        onPress={handleCardPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
          <Feather name={iconName} size={20} color={colors.primary} />
        </View>
        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {expense.title}
            </Text>
            <View style={styles.rowActions}>
              {hasBill && (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); setBillVisible(true); }}
                  hitSlop={8}
                  style={[styles.billBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
                >
                  <Feather name="image" size={12} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleDelete} hitSlop={8}>
                <Feather name="trash-2" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.amount, { color: colors.foreground }]}>
            {formatBoth(expense.amount, expense.currency)}
          </Text>
          <View style={styles.meta}>
            <View style={[styles.pill, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.pillText, { color: colors.mutedForeground }]}>{expense.category}</Text>
            </View>
            <View style={styles.spacer} />
            {isBoth ? (
              <View style={styles.bothPayer}>
                <View style={[styles.payerDot, { backgroundColor: colors.juanfe }]} />
                <View style={[styles.payerDotOverlap, { backgroundColor: colors.yukita }]} />
                <Text style={[styles.payer, { color: colors.mutedForeground }]}>Both</Text>
              </View>
            ) : (
              <View style={styles.singlePayer}>
                <View style={[styles.payerDot, {
                  backgroundColor: expense.paidBy === "Juanfe" ? colors.juanfe : colors.yukita,
                }]} />
                <Text style={[styles.payer, {
                  color: expense.paidBy === "Juanfe" ? colors.juanfe : colors.yukita,
                }]}>{expense.paidBy}</Text>
              </View>
            )}
            <Text style={[styles.date, { color: colors.mutedForeground }]}>{" · "}{dateStr}</Text>
          </View>
          {splitLabel ? (
            <Text style={[styles.splitNote, { color: colors.mutedForeground }]}>{splitLabel}</Text>
          ) : null}
          {hasBill && (
            <Pressable onPress={(e) => { e.stopPropagation?.(); setBillVisible(true); }}>
              <Image
                source={{ uri: expense.billImageBase64 }}
                style={[styles.billThumb, { borderColor: colors.border }]}
                contentFit="cover"
              />
            </Pressable>
          )}
        </View>
        <View style={[styles.chevronWrap]}>
          <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
        </View>
      </Pressable>

      {hasBill && (
        <Modal
          visible={billVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setBillVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setBillVisible(false)}>
            <View style={styles.modalContent}>
              <Image
                source={{ uri: expense.billImageBase64 }}
                style={styles.modalImage}
                contentFit="contain"
              />
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: colors.card }]}
                onPress={() => setBillVisible(false)}
              >
                <Feather name="x" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}
    </>
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
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  content: { flex: 1, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  amount: { fontSize: 13, fontFamily: "Inter_500Medium" },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  spacer: { flex: 1 },
  singlePayer: { flexDirection: "row", alignItems: "center", gap: 4 },
  bothPayer: { flexDirection: "row", alignItems: "center", gap: 3 },
  payerDot: { width: 7, height: 7, borderRadius: 3.5 },
  payerDotOverlap: { width: 7, height: 7, borderRadius: 3.5, marginLeft: -3 },
  payer: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  splitNote: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  billBadge: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  billThumb: { width: "100%", height: 120, borderRadius: 10, marginTop: 6, borderWidth: 1 },
  chevronWrap: { justifyContent: "center", paddingTop: 4 },
  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center", justifyContent: "center", padding: 20,
  },
  modalContent: { width: "100%", maxWidth: 500, position: "relative" },
  modalImage: { width: "100%", height: 500, borderRadius: 16 },
  modalClose: {
    position: "absolute", top: -14, right: -14,
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
});
