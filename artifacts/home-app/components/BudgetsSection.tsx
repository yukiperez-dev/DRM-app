import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Currency,
  convertAmount,
  formatCOP,
  formatEUR,
  useExpenses,
} from "@/context/ExpensesContext";
import { useCategories } from "@/context/CategoriesContext";
import { useBudgets } from "@/context/BudgetsContext";
import { useColors } from "@/hooks/useColors";

export function BudgetsSection({
  bottomPadding,
  currency,
}: {
  bottomPadding: number;
  currency: Currency;
}) {
  const colors = useColors();
  const { expenses } = useExpenses();
  const { categories } = useCategories();
  const { getBudget, setBudget, removeBudget } = useBudgets();

  const [budgetModal, setBudgetModal] = useState<{ category: string } | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const thisMonthExpenses = useMemo(
    () =>
      expenses.filter((e) => {
        const d = new Date(e.date);
        return d.getUTCFullYear() === currentYear && d.getUTCMonth() === currentMonth;
      }),
    [expenses, currentYear, currentMonth]
  );

  const categoryTotals = useMemo(() => {
    const totals: Record<string, { juanfe: number; yukita: number; total: number; thisMonth: number }> = {};
    for (const cat of categories) {
      totals[cat] = { juanfe: 0, yukita: 0, total: 0, thisMonth: 0 };
    }
    for (const e of expenses) {
      const amt = convertAmount(e.amount, e.currency, currency);
      if (!totals[e.category]) {
        totals[e.category] = { juanfe: 0, yukita: 0, total: 0, thisMonth: 0 };
      }
      totals[e.category].total += amt;
      if (e.paidBy === "Juanfe") totals[e.category].juanfe += amt;
      else totals[e.category].yukita += amt;
    }
    for (const e of thisMonthExpenses) {
      const amt = convertAmount(e.amount, e.currency, currency);
      if (!totals[e.category]) {
        totals[e.category] = { juanfe: 0, yukita: 0, total: 0, thisMonth: 0 };
      }
      totals[e.category].thisMonth += amt;
    }
    return Object.entries(totals).sort((a, b) => b[1].total - a[1].total);
  }, [expenses, thisMonthExpenses, currency, categories]);

  const formatAmt = (amt: number) =>
    currency === "COP" ? formatCOP(amt) : formatEUR(amt);

  const openBudgetModal = (category: string) => {
    const existing = getBudget(category);
    const current = existing
      ? String(Math.round(convertAmount(existing.amount, existing.currency, currency)))
      : "";
    setBudgetInput(current);
    setBudgetModal({ category });
  };

  const closeBudgetModal = () => {
    setBudgetModal(null);
    setBudgetInput("");
  };

  const saveBudget = async () => {
    if (!budgetModal) return;
    const val = parseFloat(budgetInput.replace(/,/g, ""));
    if (budgetInput === "" || val <= 0) {
      const existing = getBudget(budgetModal.category);
      if (existing) {
        if (Platform.OS === "web") {
          if (window.confirm("Remove budget for this category?")) {
            await removeBudget(budgetModal.category);
          }
        } else {
          Alert.alert("Remove Budget", "Remove the budget for this category?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Remove",
              style: "destructive",
              onPress: async () => {
                await removeBudget(budgetModal.category);
                closeBudgetModal();
              },
            },
          ]);
          return;
        }
      }
      closeBudgetModal();
      return;
    }
    setBudgetSaving(true);
    try {
      await setBudget(budgetModal.category, val, currency);
      closeBudgetModal();
    } catch {
      Alert.alert("Error", "Failed to save budget.");
    } finally {
      setBudgetSaving(false);
    }
  };

  const monthName = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding }]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
            {monthName} · tap a category to set a budget
          </Text>
        </View>

        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {categoryTotals.map(([cat, vals], index) => {
            const budget = getBudget(cat);
            const budgetAmt = budget
              ? convertAmount(budget.amount, budget.currency, currency)
              : null;
            const thisMonthAmt = vals.thisMonth;
            const hasBudget = budgetAmt !== null && budgetAmt > 0;
            const hasSpend = vals.total > 0;
            const pct = hasBudget
              ? Math.min(thisMonthAmt / budgetAmt, 1)
              : 0;
            const isOver = hasBudget && thisMonthAmt > budgetAmt;
            const isClose = hasBudget && !isOver && thisMonthAmt / budgetAmt >= 0.8;
            const barColor = isOver
              ? colors.destructive
              : isClose
              ? colors.warning
              : colors.primary;

            return (
              <React.Fragment key={cat}>
                {index > 0 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
                <TouchableOpacity
                  style={styles.categoryRow}
                  onPress={() => openBudgetModal(cat)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryTopRow}>
                    <Text style={[styles.categoryName, { color: colors.foreground }]}>{cat}</Text>
                    <View style={styles.categoryRight}>
                      {hasBudget && (
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isOver
                                ? colors.destructive + "18"
                                : isClose
                                ? colors.warning + "18"
                                : colors.success + "18",
                            },
                          ]}
                        >
                          <Feather
                            name={isOver ? "alert-circle" : isClose ? "alert-triangle" : "check"}
                            size={10}
                            color={isOver ? colors.destructive : isClose ? colors.warning : colors.success}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color: isOver
                                  ? colors.destructive
                                  : isClose
                                  ? colors.warning
                                  : colors.success,
                              },
                            ]}
                          >
                            {isOver ? "Over" : isClose ? "Close" : "OK"}
                          </Text>
                        </View>
                      )}
                      <Feather name="edit-2" size={13} color={colors.mutedForeground + "80"} />
                    </View>
                  </View>

                  {hasBudget ? (
                    <>
                      <View style={[styles.barBg, { backgroundColor: colors.secondary }]}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${pct * 100}%` as any, backgroundColor: barColor },
                          ]}
                        />
                      </View>
                      <View style={styles.amtRow}>
                        <Text style={[styles.spentText, { color: colors.foreground }]}>
                          {formatAmt(thisMonthAmt)}
                          <Text style={[styles.budgetLimitText, { color: colors.mutedForeground }]}>
                            {" "}/ {formatAmt(budgetAmt!)}
                          </Text>
                        </Text>
                        <Text
                          style={[
                            styles.remainingText,
                            { color: isOver ? colors.destructive : colors.mutedForeground },
                          ]}
                        >
                          {isOver
                            ? `${formatAmt(thisMonthAmt - budgetAmt!)} over`
                            : `${formatAmt(budgetAmt! - thisMonthAmt)} left`}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text style={[styles.noBudgetText, { color: colors.mutedForeground }]}>
                      {hasSpend
                        ? `${formatAmt(vals.thisMonth)} spent this month · no budget set`
                        : "No budget set"}
                    </Text>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={budgetModal !== null}
        transparent
        animationType="fade"
        onRequestClose={closeBudgetModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeBudgetModal} />
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Budget for {budgetModal?.category}
            </Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Monthly limit in {currency}. Leave empty to remove.
            </Text>
            <View
              style={[
                styles.modalInputWrap,
                { borderColor: colors.border, backgroundColor: colors.secondary },
              ]}
            >
              <Text style={[styles.modalCurrencyLabel, { color: colors.mutedForeground }]}>
                {currency === "COP" ? "$" : "€"}
              </Text>
              <TextInput
                style={[styles.modalInput, { color: colors.foreground }]}
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                selectTextOnFocus
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: colors.border }]}
                onPress={closeBudgetModal}
              >
                <Text style={[styles.modalBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={saveBudget}
                disabled={budgetSaving}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  {budgetSaving ? "Saving…" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  headerRow: { marginBottom: 4 },
  subLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  section: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  divider: { height: 1 },
  categoryRow: { gap: 8 },
  categoryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryName: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  categoryRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  barBg: { height: 7, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  amtRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  spentText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  budgetLimitText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  remainingText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  noBudgetText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -8 },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  modalCurrencyLabel: { fontSize: 18, fontFamily: "Inter_500Medium" },
  modalInput: { flex: 1, fontSize: 24, fontFamily: "Inter_600SemiBold" },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: { borderWidth: 1 },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
