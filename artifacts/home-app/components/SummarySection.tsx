import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
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

import DatePickerField from "@/components/DatePickerField";
import { ExpenseAnalytics } from "@/components/ExpenseAnalytics";
import {
  Currency,
  Person,
  convertAmount,
  formatCOP,
  formatDateEU,
  formatEUR,
  useExpenses,
} from "@/context/ExpensesContext";
import { useColors } from "@/hooks/useColors";

function formatSettlementInput(amount: number, currency: Currency): string {
  return currency === "COP"
    ? String(Math.round(amount))
    : amount.toFixed(2).replace(/\.00$/, "");
}

export function SummarySection({
  bottomPadding,
  currency,
}: {
  bottomPadding: number;
  currency: Currency;
}) {
  const colors = useColors();
  const { expenses, settlements, getBalance, addSettlement, deleteSettlement } = useExpenses();
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [settlementFromPerson, setSettlementFromPerson] = useState<Person>("Juanfe");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementCurrency, setSettlementCurrency] = useState<Currency>(currency);
  const [settlementDate, setSettlementDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [settlementNote, setSettlementNote] = useState("");
  const [settlementSaving, setSettlementSaving] = useState(false);

  const balance = getBalance(currency);

  const formatAmt = (amount: number) =>
    currency === "COP" ? formatCOP(amount) : formatEUR(amount);

  const openSettlementModal = () => {
    const defaultPayer = balance.netOwer ?? "Juanfe";
    setSettlementFromPerson(defaultPayer);
    setSettlementAmount(
      balance.netOwer === null ? "" : formatSettlementInput(balance.netAmount, currency)
    );
    setSettlementCurrency(currency);
    setSettlementDate(new Date().toISOString().slice(0, 10));
    setSettlementNote("");
    setSettlementModalOpen(true);
  };

  const closeSettlementModal = () => {
    setSettlementModalOpen(false);
    setSettlementSaving(false);
  };

  const saveSettlement = async () => {
    const parsedAmount = parseFloat(settlementAmount.replace(/,/g, ""));
    if (!settlementAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid settlement amount.");
      return;
    }

    const toPerson = settlementFromPerson === "Juanfe" ? "Yukita" : "Juanfe";

    setSettlementSaving(true);
    try {
      await addSettlement({
        fromPerson: settlementFromPerson,
        toPerson,
        amount: parsedAmount,
        currency: settlementCurrency,
        date: new Date(`${settlementDate}T12:00:00.000Z`).toISOString(),
        note: settlementNote.trim() || undefined,
      });
      closeSettlementModal();
    } catch {
      setSettlementSaving(false);
      Alert.alert("Error", "Failed to save settlement.");
    }
  };

  const confirmDeleteSettlement = (settlementId: string) => {
    const runDelete = async () => {
      try {
        await deleteSettlement(settlementId);
      } catch {
        Alert.alert("Error", "Failed to delete settlement.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Delete this settlement?")) {
        void runDelete();
      }
      return;
    }

    Alert.alert("Delete settlement", "Remove this settlement from the summary?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void runDelete();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding }]}
      >
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
                  { color: balance.netOwer === "Juanfe" ? colors.juanfe : colors.yukita },
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

          <TouchableOpacity
            style={[styles.settlementBtn, { backgroundColor: colors.primary }]}
            onPress={openSettlementModal}
            activeOpacity={0.85}
          >
            <Feather name="repeat" size={16} color={colors.primaryForeground} />
            <Text style={[styles.settlementBtnText, { color: colors.primaryForeground }]}>
              Record settlement
            </Text>
          </TouchableOpacity>

          {balance.hasPending && (
            <Text style={[styles.pendingBalanceNote, { color: colors.mutedForeground }]}>
              Pending expenses are still excluded from the balance.
            </Text>
          )}
        </View>

        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Settlements</Text>
            <TouchableOpacity
              style={[
                styles.sectionAction,
                { borderColor: colors.border, backgroundColor: colors.secondary },
              ]}
              onPress={openSettlementModal}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color={colors.primary} />
              <Text style={[styles.sectionActionText, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>

          {settlements.length === 0 ? (
            <Text style={[styles.emptySectionText, { color: colors.mutedForeground }]}>
              Record payments between Juanfe and Yukita here. Each settlement is included
              in the balance above.
            </Text>
          ) : (
            settlements.map((settlement) => {
              const amount = convertAmount(settlement.amount, settlement.currency, currency);

              return (
                <View
                  key={settlement.id}
                  style={[styles.settlementRow, { borderColor: colors.border }]}
                >
                  <View style={styles.settlementMeta}>
                    <Text style={[styles.settlementTitle, { color: colors.foreground }]}>
                      {settlement.fromPerson} paid {settlement.toPerson}
                    </Text>
                    <Text style={[styles.settlementSub, { color: colors.mutedForeground }]}>
                      {formatDateEU(settlement.date)}
                      {settlement.note ? ` · ${settlement.note}` : ""}
                    </Text>
                  </View>
                  <View style={styles.settlementSide}>
                    <Text style={[styles.settlementAmount, { color: colors.foreground }]}>
                      {formatAmt(amount)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => confirmDeleteSettlement(settlement.id)}
                      hitSlop={8}
                    >
                      <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Paid by each</Text>
          <View style={styles.personRow}>
            <View style={[styles.personBadge, { backgroundColor: colors.juanfe + "18" }]}>
              <View style={[styles.dot, { backgroundColor: colors.juanfe }]} />
              <Text style={[styles.personName, { color: colors.juanfe }]}>Juanfe</Text>
            </View>
            <Text style={[styles.personAmt, { color: colors.foreground }]}>
              {formatAmt(
                expenses
                  .filter((expense) => expense.paidBy === "Juanfe")
                  .reduce(
                    (total, expense) =>
                      total + convertAmount(expense.amount, expense.currency, currency),
                    0
                  )
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
                  .filter((expense) => expense.paidBy === "Yukita")
                  .reduce(
                    (total, expense) =>
                      total + convertAmount(expense.amount, expense.currency, currency),
                    0
                  )
              )}
            </Text>
          </View>
        </View>

        {expenses.length > 0 && (
          <ExpenseAnalytics expenses={expenses} currency={currency} />
        )}

        {expenses.length === 0 && settlements.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No data yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add expenses to see your summary
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={settlementModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeSettlementModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSettlementModal} />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Record settlement
            </Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              This payment will be deducted from the balance automatically.
            </Text>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Paid by</Text>
              <View style={styles.personToggleRow}>
                {(["Juanfe", "Yukita"] as const).map((person) => {
                  const isSelected = settlementFromPerson === person;
                  const accent = person === "Juanfe" ? colors.juanfe : colors.yukita;
                  return (
                    <TouchableOpacity
                      key={person}
                      style={[
                        styles.personToggleBtn,
                        {
                          backgroundColor: isSelected ? accent + "18" : colors.secondary,
                          borderColor: isSelected ? accent : colors.border,
                        },
                      ]}
                      onPress={() => setSettlementFromPerson(person)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.personToggleText,
                          { color: isSelected ? accent : colors.mutedForeground },
                        ]}
                      >
                        {person}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Received by</Text>
              <Text style={[styles.readonlyValue, { color: colors.foreground }]}>
                {settlementFromPerson === "Juanfe" ? "Yukita" : "Juanfe"}
              </Text>
            </View>

            <View style={styles.modalField}>
              <View style={styles.amountHeaderRow}>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Amount</Text>
                <View
                  style={[
                    styles.currencyToggle,
                    { backgroundColor: colors.secondary, borderColor: colors.border },
                  ]}
                >
                  {(["COP", "EUR"] as Currency[]).map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => setSettlementCurrency(option)}
                      style={[
                        styles.currencyOpt,
                        settlementCurrency === option && { backgroundColor: colors.primary },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.currencyOptText,
                          {
                            color:
                              settlementCurrency === option
                                ? colors.primaryForeground
                                : colors.mutedForeground,
                          },
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View
                style={[
                  styles.modalInputWrap,
                  { borderColor: colors.border, backgroundColor: colors.secondary },
                ]}
              >
                <Text style={[styles.modalCurrencyLabel, { color: colors.mutedForeground }]}>
                  {settlementCurrency === "COP" ? "$" : "€"}
                </Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.foreground }]}
                  value={settlementAmount}
                  onChangeText={setSettlementAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Date</Text>
              <DatePickerField value={settlementDate} onChange={setSettlementDate} />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Note</Text>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.secondary,
                    color: colors.foreground,
                  },
                ]}
                value={settlementNote}
                onChangeText={setSettlementNote}
                placeholder="Optional note"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: colors.border }]}
                onPress={closeSettlementModal}
              >
                <Text style={[styles.modalBtnText, { color: colors.mutedForeground }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave, { backgroundColor: colors.primary }]}
                onPress={() => {
                  void saveSettlement();
                }}
                disabled={settlementSaving}
              >
                <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>
                  {settlementSaving ? "Saving..." : "Save"}
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
  balanceTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  balanceAmount: { fontSize: 32, fontFamily: "Inter_700Bold" },
  balanceSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  settlementBtn: {
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settlementBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  pendingBalanceNote: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  section: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sectionAction: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptySectionText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  settlementRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  settlementMeta: { flex: 1, gap: 2 },
  settlementTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  settlementSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  settlementSide: { alignItems: "flex-end", gap: 10 },
  settlementAmount: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 260,
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
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  modalSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: -8,
  },
  modalField: { gap: 8 },
  modalLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  personToggleRow: { flexDirection: "row", gap: 10 },
  personToggleBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  personToggleText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  readonlyValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  amountHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  currencyToggle: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
  },
  currencyOpt: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  currencyOptText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  modalCurrencyLabel: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    width: 16,
    textAlign: "center",
  },
  modalInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    padding: 0,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: { borderWidth: 1 },
  modalBtnSave: {},
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
