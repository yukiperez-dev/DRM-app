import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CATEGORIES,
  Currency,
  PaidBy,
  SplitType,
  useExpenses,
} from "@/context/ExpensesContext";
import { useColors } from "@/hooks/useColors";

export default function AddExpenseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addExpense } = useExpenses();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [juanfeAmount, setJuanfeAmount] = useState("");
  const [yukitaAmount, setYukitaAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("COP");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState<PaidBy>("Juanfe");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const isBoth = paidBy === "Both";

  const handleSave = () => {
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (isBoth) {
      const j = parseFloat(juanfeAmount.replace(/,/g, ""));
      const y = parseFloat(yukitaAmount.replace(/,/g, ""));
      if ((!juanfeAmount && !yukitaAmount) || (isNaN(j) && isNaN(y))) {
        setError("Please enter at least one amount");
        return;
      }
      const juanfeFinal = isNaN(j) || juanfeAmount === "" ? 0 : j;
      const yukitaFinal = isNaN(y) || yukitaAmount === "" ? 0 : y;
      const total = juanfeFinal + yukitaFinal;
      if (total <= 0) {
        setError("Total amount must be greater than 0");
        return;
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      addExpense({
        title: title.trim(),
        amount: total,
        currency,
        category,
        paidBy: "Both",
        juanfePaidAmount: juanfeFinal,
        yukitaPaidAmount: yukitaFinal,
        splitType,
        date: new Date().toISOString(),
        note: note.trim() || undefined,
      });
    } else {
      const parsedAmount = parseFloat(amount.replace(/,/g, ""));
      if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
        setError("Please enter a valid amount");
        return;
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      addExpense({
        title: title.trim(),
        amount: parsedAmount,
        currency,
        category,
        paidBy,
        splitType,
        date: new Date().toISOString(),
        note: note.trim() || undefined,
      });
    }

    router.back();
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const paidByOptions: { key: PaidBy; label: string; color: string }[] = [
    { key: "Juanfe", label: "Juanfe", color: colors.juanfe },
    { key: "Yukita", label: "Yukita", color: colors.yukita },
    { key: "Both", label: "Both", color: colors.primary },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Feather name="x" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          New Expense
        </Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.saveBtn, { color: colors.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Platform.OS === "web" ? 60 : insets.bottom + 40 },
        ]}
      >
        {error ? (
          <View
            style={[styles.errorBox, { backgroundColor: colors.destructive + "18" }]}
          >
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Title */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Title
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
            ]}
            value={title}
            onChangeText={(t) => { setTitle(t); setError(""); }}
            placeholder="e.g. Mercadona groceries"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />
        </View>

        {/* Paid by — placed before amount so "Both" reveals split inputs */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Paid by
          </Text>
          <View style={styles.threeRow}>
            {paidByOptions.map(({ key, label, color }) => {
              const isSelected = paidBy === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => { setPaidBy(key); setError(""); }}
                  style={[
                    styles.threeBtn,
                    {
                      backgroundColor: isSelected ? color + "22" : colors.secondary,
                      borderColor: isSelected ? color : colors.border,
                    },
                  ]}
                >
                  {key !== "Both" && (
                    <View style={[styles.personDot, { backgroundColor: color }]} />
                  )}
                  {key === "Both" && (
                    <View style={styles.bothDots}>
                      <View style={[styles.personDot, { backgroundColor: colors.juanfe }]} />
                      <View style={[styles.personDot, { backgroundColor: colors.yukita, marginLeft: -4 }]} />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.threeBtnText,
                      { color: isSelected ? color : colors.mutedForeground },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Amount & Currency */}
        <View style={styles.field}>
          <View style={styles.amountLabelRow}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              {isBoth ? "Amount per person" : "Amount"}
            </Text>
            <View
              style={[
                styles.currencyToggle,
                { backgroundColor: colors.secondary, borderColor: colors.border },
              ]}
            >
              {(["COP", "EUR"] as Currency[]).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCurrency(c)}
                  style={[
                    styles.currencyOpt,
                    currency === c && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyOptText,
                      { color: currency === c ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {isBoth ? (
            <View style={styles.splitAmountRow}>
              <View style={styles.splitAmountField}>
                <View style={styles.splitAmountLabel}>
                  <View style={[styles.personDot, { backgroundColor: colors.juanfe }]} />
                  <Text style={[styles.splitAmountName, { color: colors.juanfe }]}>
                    Juanfe
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.splitAmountInput,
                    { backgroundColor: colors.card, borderColor: colors.juanfe + "60", color: colors.foreground },
                  ]}
                  value={juanfeAmount}
                  onChangeText={(t) => { setJuanfeAmount(t); setError(""); }}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.plusSeparator]}>
                <Text style={[styles.plusText, { color: colors.mutedForeground }]}>+</Text>
              </View>

              <View style={styles.splitAmountField}>
                <View style={styles.splitAmountLabel}>
                  <View style={[styles.personDot, { backgroundColor: colors.yukita }]} />
                  <Text style={[styles.splitAmountName, { color: colors.yukita }]}>
                    Yukita
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.splitAmountInput,
                    { backgroundColor: colors.card, borderColor: colors.yukita + "60", color: colors.foreground },
                  ]}
                  value={yukitaAmount}
                  onChangeText={(t) => { setYukitaAmount(t); setError(""); }}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          ) : (
            <TextInput
              style={[
                styles.amountInput,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
              ]}
              value={amount}
              onChangeText={(t) => { setAmount(t); setError(""); }}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />
          )}
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Category
          </Text>
          <View style={styles.chipGrid}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: category === cat ? colors.primary : colors.secondary,
                    borderColor: category === cat ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: category === cat ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Split */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Split
          </Text>
          <View style={styles.twoRow}>
            <Pressable
              onPress={() => setSplitType("equal")}
              style={[
                styles.twoBtn,
                {
                  backgroundColor: splitType === "equal" ? colors.primary + "22" : colors.secondary,
                  borderColor: splitType === "equal" ? colors.primary : colors.border,
                },
              ]}
            >
              <Feather
                name="users"
                size={16}
                color={splitType === "equal" ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.twoBtnText,
                  { color: splitType === "equal" ? colors.primary : colors.mutedForeground },
                ]}
              >
                Split equally
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSplitType("full")}
              style={[
                styles.twoBtn,
                {
                  backgroundColor: splitType === "full" ? colors.primary + "22" : colors.secondary,
                  borderColor: splitType === "full" ? colors.primary : colors.border,
                },
              ]}
            >
              <Feather
                name="user"
                size={16}
                color={splitType === "full" ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.twoBtnText,
                  { color: splitType === "full" ? colors.primary : colors.mutedForeground },
                ]}
              >
                Not shared
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Note */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Note (optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.noteInput,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
            ]}
            value={note}
            onChangeText={setNote}
            placeholder="Any extra details..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>
            Add Expense
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  scroll: {
    padding: 20,
    gap: 20,
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  field: { gap: 8 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  noteInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  // Three-button row (Juanfe / Yukita / Both)
  threeRow: {
    flexDirection: "row",
    gap: 8,
  },
  threeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  threeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  bothDots: {
    flexDirection: "row",
  },
  personDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Two-button row (split)
  twoRow: {
    flexDirection: "row",
    gap: 10,
  },
  twoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  twoBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  // Amount fields
  amountLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
  },
  // Split amount (Both mode)
  splitAmountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  splitAmountField: {
    flex: 1,
    gap: 6,
  },
  splitAmountLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  splitAmountName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  splitAmountInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  plusSeparator: {
    paddingBottom: 14,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  plusText: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
  },
  // Currency toggle
  currencyToggle: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
  },
  currencyOpt: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9,
  },
  currencyOptText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  // Category chips
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#C0623A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
