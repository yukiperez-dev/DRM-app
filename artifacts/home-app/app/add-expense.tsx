import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
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
  Person,
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
  const [currency, setCurrency] = useState<Currency>("COP");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState<Person>("Juanfe");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const handleSave = () => {
    const parsedAmount = parseFloat(amount.replace(/,/g, ""));
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }
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
    router.back();
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

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
            style={[
              styles.errorBox,
              { backgroundColor: colors.destructive + "18" },
            ]}
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
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            value={title}
            onChangeText={(t) => { setTitle(t); setError(""); }}
            placeholder="e.g. Mercadona groceries"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />
        </View>

        {/* Amount & Currency */}
        <View style={styles.field}>
          <View style={styles.amountLabelRow}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Amount
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
                    currency === c && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyOptText,
                      {
                        color:
                          currency === c
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <TextInput
            style={[
              styles.amountInput,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            value={amount}
            onChangeText={(t) => { setAmount(t); setError(""); }}
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
          />
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
                    backgroundColor:
                      category === cat ? colors.primary : colors.secondary,
                    borderColor:
                      category === cat ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        category === cat
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Paid by */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Paid by
          </Text>
          <View style={styles.personRow}>
            {(["Juanfe", "Yukita"] as Person[]).map((p) => {
              const personColor =
                p === "Juanfe" ? colors.juanfe : colors.yukita;
              const isSelected = paidBy === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPaidBy(p)}
                  style={[
                    styles.personBtn,
                    {
                      backgroundColor: isSelected
                        ? personColor + "22"
                        : colors.secondary,
                      borderColor: isSelected ? personColor : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.personDot,
                      { backgroundColor: personColor },
                    ]}
                  />
                  <Text
                    style={[
                      styles.personBtnText,
                      { color: isSelected ? personColor : colors.mutedForeground },
                    ]}
                  >
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Split */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Split
          </Text>
          <View style={styles.personRow}>
            <Pressable
              onPress={() => setSplitType("equal")}
              style={[
                styles.personBtn,
                {
                  backgroundColor:
                    splitType === "equal" ? colors.primary + "22" : colors.secondary,
                  borderColor:
                    splitType === "equal" ? colors.primary : colors.border,
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
                  styles.personBtnText,
                  {
                    color:
                      splitType === "equal" ? colors.primary : colors.mutedForeground,
                  },
                ]}
              >
                Split equally
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSplitType("full")}
              style={[
                styles.personBtn,
                {
                  backgroundColor:
                    splitType === "full" ? colors.primary + "22" : colors.secondary,
                  borderColor:
                    splitType === "full" ? colors.primary : colors.border,
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
                  styles.personBtnText,
                  {
                    color:
                      splitType === "full" ? colors.primary : colors.mutedForeground,
                  },
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
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
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
  personRow: {
    flexDirection: "row",
    gap: 10,
  },
  personBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  personDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  personBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
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
