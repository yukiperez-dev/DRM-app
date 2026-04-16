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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CurrencyToggle } from "@/components/CurrencyToggle";
import {
  CATEGORIES,
  Currency,
  convertAmount,
  formatCOP,
  formatEUR,
  useExpenses,
} from "@/context/ExpensesContext";
import { useBudgets } from "@/context/BudgetsContext";
import { useColors } from "@/hooks/useColors";

export default function SummaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, getBalance } = useExpenses();
  const { getBudget, setBudget, removeBudget, budgets } = useBudgets();
  const [currency, setCurrency] = useState<Currency>("COP");

  const [budgetModal, setBudgetModal] = useState<{ category: string; current: string } | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);

  const balance = getBalance(currency);

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
    for (const cat of CATEGORIES) {
      totals[cat] = { juanfe: 0, yukita: 0, total: 0, thisMonth: 0 };
    }
    for (const e of expenses) {
      const amt = convertAmount(e.amount, e.currency, currency);
      if (!totals[e.category]) {
        totals[e.category] = { juanfe: 0, yukita: 0, total: 0, thisMonth: 0 };
      }
      totals[e.category].total += amt;
      if (e.paidBy === "Juanfe") {
        totals[e.category].juanfe += amt;
      } else {
        totals[e.category].yukita += amt;
      }
    }
    for (const e of thisMonthExpenses) {
      const amt = convertAmount(e.amount, e.currency, currency);
      if (!totals[e.category]) {
        totals[e.category] = { juanfe: 0, yukita: 0, total: 0, thisMonth: 0 };
      }
      totals[e.category].thisMonth += amt;
    }
    return Object.entries(totals)
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => b[1].total - a[1].total);
  }, [expenses, thisMonthExpenses, currency]);

  const monthlyTotals = useMemo(() => {
    const monthMap = new Map<string, { label: string; total: number; key: string }>();
    for (const e of expenses) {
      const d = new Date(e.date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      const existing = monthMap.get(key);
      const amt = convertAmount(e.amount, e.currency, currency);
      if (existing) {
        existing.total += amt;
      } else {
        monthMap.set(key, { label, total: amt, key });
      }
    }
    return Array.from(monthMap.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [expenses, currency]);

  const maxCategory = categoryTotals[0]?.[1].total ?? 1;
  const maxMonth = Math.max(...monthlyTotals.map((m) => m.total), 1);

  const formatAmt = (amt: number) =>
    currency === "COP" ? formatCOP(amt) : formatEUR(amt);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const monthLabel = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const openBudgetModal = (category: string) => {
    const existing = getBudget(category);
    const current = existing ? String(Math.round(convertAmount(existing.amount, existing.currency, currency))) : "";
    setBudgetInput(current);
    setBudgetModal({ category, current });
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
            Summary
          </Text>
        </View>
        <CurrencyToggle value={currency} onChange={setCurrency} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 100,
          },
        ]}
      >
        {/* Balance Card */}
        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor:
                balance.netOwer === null
                  ? colors.card
                  : balance.netOwer === "Juanfe"
                  ? colors.juanfe + "12"
                  : colors.yukita + "12",
              borderColor: colors.border,
            },
          ]}
        >
          {balance.netOwer === null ? (
            <View style={styles.balanceCenter}>
              <View style={[styles.balanceIconCircle, { backgroundColor: colors.success + "22" }]}>
                <Feather name="check-circle" size={28} color={colors.success} />
              </View>
              <Text style={[styles.balanceTitle, { color: colors.foreground }]}>
                You're all settled!
              </Text>
              <Text style={[styles.balanceSub, { color: colors.mutedForeground }]}>
                No one owes anything
              </Text>
            </View>
          ) : (
            <View style={styles.balanceCenter}>
              <View
                style={[
                  styles.balanceIconCircle,
                  {
                    backgroundColor:
                      balance.netOwer === "Juanfe"
                        ? colors.juanfe + "22"
                        : colors.yukita + "22",
                  },
                ]}
              >
                <Feather
                  name="arrow-right"
                  size={28}
                  color={balance.netOwer === "Juanfe" ? colors.juanfe : colors.yukita}
                />
              </View>
              <Text style={[styles.balanceTitle, { color: colors.foreground }]}>
                {balance.netOwer} owes
              </Text>
              <Text
                style={[
                  styles.balanceAmount,
                  {
                    color:
                      balance.netOwer === "Juanfe" ? colors.juanfe : colors.yukita,
                  },
                ]}
              >
                {formatAmt(balance.netAmount)}
              </Text>
              <Text style={[styles.balanceSub, { color: colors.mutedForeground }]}>
                {currency === "COP"
                  ? `≈ ${formatEUR(balance.netAmount * 0.00023)}`
                  : `≈ ${formatCOP(balance.netAmount * 4348)}`}
              </Text>
            </View>
          )}
        </View>

        {/* Person breakdown */}
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Paid by each
          </Text>
          <View style={styles.personRow}>
            <View style={[styles.personBadge, { backgroundColor: colors.juanfe + "18" }]}>
              <View style={[styles.dot, { backgroundColor: colors.juanfe }]} />
              <Text style={[styles.personName, { color: colors.juanfe }]}>Juanfe</Text>
            </View>
            <Text style={[styles.personAmt, { color: colors.foreground }]}>
              {formatAmt(
                expenses
                  .filter((e) => e.paidBy === "Juanfe")
                  .reduce((acc, e) => acc + convertAmount(e.amount, e.currency, currency), 0)
              )}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.personRow}>
            <View style={[styles.personBadge, { backgroundColor: colors.yukita + "18" }]}>
              <View style={[styles.dot, { backgroundColor: colors.yukita }]} />
              <Text style={[styles.personName, { color: colors.yukita }]}>Yukita</Text>
            </View>
            <Text style={[styles.personAmt, { color: colors.foreground }]}>
              {formatAmt(
                expenses
                  .filter((e) => e.paidBy === "Yukita")
                  .reduce((acc, e) => acc + convertAmount(e.amount, e.currency, currency), 0)
              )}
            </Text>
          </View>
        </View>

        {/* Monthly expenses */}
        {monthlyTotals.length > 0 && (
          <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Monthly expenses
            </Text>
            {monthlyTotals.map((item) => (
              <View key={item.key} style={styles.monthRow}>
                <Text style={[styles.monthLabel, { color: colors.foreground }]}>
                  {item.label}
                </Text>
                <View style={[styles.monthBarBg, { backgroundColor: colors.secondary }]}>
                  <View
                    style={[
                      styles.monthBarFill,
                      {
                        width: `${(item.total / maxMonth) * 100}%` as any,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.monthAmt, { color: colors.mutedForeground }]}>
                  {formatAmt(item.total)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Category breakdown with budgets */}
        {categoryTotals.length > 0 && (
          <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                By category
              </Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                This month · tap to set budget
              </Text>
            </View>
            {categoryTotals.map(([cat, vals]) => {
              const budget = getBudget(cat);
              const budgetAmt = budget
                ? convertAmount(budget.amount, budget.currency, currency)
                : null;
              const thisMonthAmt = vals.thisMonth;
              const hasBudget = budgetAmt !== null && budgetAmt > 0;
              const pct = hasBudget ? Math.min(thisMonthAmt / budgetAmt, 1) : vals.total / maxCategory;
              const isOver = hasBudget && thisMonthAmt > budgetAmt;
              const isClose = hasBudget && !isOver && thisMonthAmt / budgetAmt >= 0.8;
              const barColor = isOver
                ? colors.destructive
                : isClose
                ? colors.warning
                : colors.primary;

              return (
                <TouchableOpacity
                  key={cat}
                  style={styles.categoryRow}
                  onPress={() => openBudgetModal(cat)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryMeta}>
                    <View style={styles.categoryNameRow}>
                      <Text style={[styles.categoryName, { color: colors.foreground }]}>
                        {cat}
                      </Text>
                      {hasBudget && (
                        <View
                          style={[
                            styles.budgetStatusBadge,
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
                              styles.budgetStatusText,
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
                    </View>
                    <View style={styles.categoryAmtRow}>
                      <Text style={[styles.categoryAmt, { color: colors.mutedForeground }]}>
                        {hasBudget
                          ? `${formatAmt(thisMonthAmt)} / ${formatAmt(budgetAmt!)}`
                          : formatAmt(vals.total)}
                      </Text>
                      <Feather name="edit-2" size={12} color={colors.mutedForeground + "80"} />
                    </View>
                  </View>
                  <View style={[styles.barBg, { backgroundColor: colors.secondary }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${pct * 100}%` as any,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                  {hasBudget && (
                    <Text style={[styles.budgetRemaining, { color: isOver ? colors.destructive : colors.mutedForeground }]}>
                      {isOver
                        ? `${formatAmt(thisMonthAmt - budgetAmt!)} over budget`
                        : `${formatAmt(budgetAmt! - thisMonthAmt)} remaining`}
                    </Text>
                  )}
                  <View style={styles.catPersonRow}>
                    <Text style={[styles.catPersonText, { color: colors.juanfe }]}>
                      J: {formatAmt(vals.juanfe)}
                    </Text>
                    <Text style={[styles.catPersonText, { color: colors.yukita }]}>
                      Y: {formatAmt(vals.yukita)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {expenses.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No data yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add expenses to see your summary
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Budget edit modal */}
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
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Budget for {budgetModal?.category}
            </Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Monthly budget in {currency}. Leave empty to remove.
            </Text>
            <View style={[styles.modalInputWrap, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
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
                style={[styles.modalBtn, styles.modalBtnSave, { backgroundColor: colors.primary }]}
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
  scroll: { padding: 16, gap: 14 },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  balanceCenter: { alignItems: "center", gap: 6 },
  balanceIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  balanceTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  balanceAmount: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  balanceSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  section: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  sectionSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  personBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  personName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  personAmt: { fontSize: 14, fontFamily: "Inter_500Medium" },
  divider: { height: 1 },
  monthRow: { gap: 6 },
  monthLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  monthBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  monthBarFill: { height: "100%", borderRadius: 3 },
  monthAmt: { fontSize: 13, fontFamily: "Inter_400Regular" },
  categoryRow: { gap: 5 },
  categoryMeta: {},
  categoryNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  categoryName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  categoryAmtRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  categoryAmt: { fontSize: 13, fontFamily: "Inter_400Regular" },
  budgetStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  budgetStatusText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  budgetRemaining: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    marginTop: 2,
  },
  catPersonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  catPersonText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  modalSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: -8,
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  modalCurrencyLabel: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
  },
  modalInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    padding: 0,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    borderWidth: 1,
  },
  modalBtnSave: {},
  modalBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
