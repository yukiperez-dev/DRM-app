import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Currency,
  PaidBy,
  SplitType,
} from "@/context/ExpensesContext";
import { useCategories } from "@/context/CategoriesContext";
import { useRecurringExpenses } from "@/context/RecurringExpensesContext";
import { useColors } from "@/hooks/useColors";

const SPLIT_PRESETS = [25, 30, 40, 50, 60, 70, 75];

export default function AddRecurringScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { recurringExpenses, addRecurring, updateRecurring } = useRecurringExpenses();

  const isEditing = !!id;
  const existing = isEditing ? recurringExpenses.find((r) => r.id === id) : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [amount, setAmount] = useState(existing && existing.amount > 0 ? String(existing.amount) : "");
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? "COP");
  const { categories } = useCategories();
  const [category, setCategory] = useState(() => existing?.category ?? (categories[0] ?? "Groceries"));
  const [paidBy, setPaidBy] = useState<PaidBy>(existing?.paidBy ?? "Both");
  const [splitType, setSplitType] = useState<SplitType>(existing?.splitType ?? "equal");
  const [juanfePct, setJuanfePct] = useState(existing?.juanfeSplitPct ?? 50);
  const [juanfePctText, setJuanfePctText] = useState(String(existing?.juanfeSplitPct ?? 50));
  const [yukitaPctText, setYukitaPctText] = useState(String(100 - (existing?.juanfeSplitPct ?? 50)));
  const [note, setNote] = useState(existing?.note ?? "");
  const [dayOfMonth, setDayOfMonth] = useState(String(existing?.dayOfMonth ?? 1));
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState("");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const isCustomSplit = splitType === "custom";

  const handleJuanfePctChange = (text: string) => {
    setJuanfePctText(text);
    const val = parseInt(text, 10);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      setJuanfePct(val);
      setYukitaPctText(String(100 - val));
    }
  };

  const handleYukitaPctChange = (text: string) => {
    setYukitaPctText(text);
    const val = parseInt(text, 10);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      setJuanfePct(100 - val);
      setJuanfePctText(String(100 - val));
    }
  };

  const applyPreset = (preset: number) => {
    setJuanfePct(preset);
    setJuanfePctText(String(preset));
    setYukitaPctText(String(100 - preset));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (isCustomSplit) {
      const j = parseInt(juanfePctText, 10);
      const y = parseInt(yukitaPctText, 10);
      if (isNaN(j) || isNaN(y) || j + y !== 100 || j < 0 || y < 0) {
        setError("Percentages must add up to 100%");
        return;
      }
    }

    const dayNum = parseInt(dayOfMonth, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      setError("Day of month must be between 1 and 31");
      return;
    }

    const parsedAmount = parseFloat(amount.replace(/,/g, "")) || 0;

    const data = {
      title: title.trim(),
      amount: parsedAmount,
      currency,
      category,
      paidBy,
      juanfePaidAmount: undefined,
      yukitaPaidAmount: undefined,
      splitType,
      juanfeSplitPct: isCustomSplit ? juanfePct : undefined,
      note: note.trim() || undefined,
      dayOfMonth: dayNum,
      isActive,
    };

    try {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (isEditing && id) {
        await updateRecurring(id, data);
      } else {
        await addRecurring(data);
      }
      router.back();
    } catch {
      setError("Failed to save. Please try again.");
    }
  };

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
          {isEditing ? "Edit Recurring" : "New Recurring"}
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
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18" }]}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        {/* Title */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={title}
            onChangeText={(t) => { setTitle(t); setError(""); }}
            placeholder="e.g. Rent"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />
        </View>

        {/* Active Toggle */}
        <View style={[styles.field, styles.toggleRow]}>
          <View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Active</Text>
            <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
              Inactive expenses won't be generated
            </Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: colors.border, true: colors.primary + "88" }}
            thumbColor={isActive ? colors.primary : colors.mutedForeground}
          />
        </View>

        {/* Day of Month */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Day of month</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={dayOfMonth}
            onChangeText={(t) => { setDayOfMonth(t); setError(""); }}
            placeholder="1"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        {/* Paid by */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Paid by</Text>
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
                  {key === "Both" ? (
                    <View style={styles.bothDots}>
                      <View style={[styles.personDot, { backgroundColor: colors.juanfe }]} />
                      <View style={[styles.personDot, { backgroundColor: colors.yukita, marginLeft: -4 }]} />
                    </View>
                  ) : (
                    <View style={[styles.personDot, { backgroundColor: color }]} />
                  )}
                  <Text style={[styles.threeBtnText, { color: isSelected ? color : colors.mutedForeground }]}>
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
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Amount (optional)</Text>
            <View style={[styles.currencyToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              {(["COP", "EUR"] as Currency[]).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCurrency(c)}
                  style={[styles.currencyOpt, currency === c && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.currencyOptText, { color: currency === c ? colors.primaryForeground : colors.mutedForeground }]}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <TextInput
            style={[styles.amountInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={amount}
            onChangeText={(t) => { setAmount(t); setError(""); }}
            placeholder="0 — set when generating if unknown"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
          <View style={styles.chipGrid}>
            {categories.map((cat) => (
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
                <Text style={[styles.chipText, { color: category === cat ? colors.primaryForeground : colors.mutedForeground }]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Split */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Split</Text>
          <View style={styles.threeRow}>
            {(
              [
                { key: "equal" as SplitType, icon: "users", label: "50 / 50" },
                { key: "custom" as SplitType, icon: "sliders", label: "Custom" },
                { key: "full" as SplitType, icon: "user", label: "No split" },
              ] as const
            ).map(({ key, icon, label }) => {
              const isSelected = splitType === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setSplitType(key)}
                  style={[
                    styles.threeBtn,
                    {
                      backgroundColor: isSelected ? colors.primary + "22" : colors.secondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather name={icon} size={14} color={isSelected ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.threeBtnText, { color: isSelected ? colors.primary : colors.mutedForeground }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isCustomSplit && (
            <View style={[styles.customSplitBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <View style={[styles.splitBar, { backgroundColor: colors.border }]}>
                <View style={[styles.splitBarJ, { width: `${juanfePct}%` as any, backgroundColor: colors.juanfe }]} />
                <View style={[styles.splitBarY, { width: `${100 - juanfePct}%` as any, backgroundColor: colors.yukita }]} />
              </View>

              <View style={styles.pctRow}>
                <View style={styles.pctField}>
                  <View style={[styles.personDot, { backgroundColor: colors.juanfe }]} />
                  <Text style={[styles.pctName, { color: colors.juanfe }]}>Juanfe</Text>
                  <View style={[styles.pctInputWrap, { borderColor: colors.juanfe + "60", backgroundColor: colors.card }]}>
                    <TextInput
                      style={[styles.pctInput, { color: colors.foreground }]}
                      value={juanfePctText}
                      onChangeText={handleJuanfePctChange}
                      keyboardType="number-pad"
                      maxLength={3}
                      selectTextOnFocus
                    />
                    <Text style={[styles.pctSign, { color: colors.mutedForeground }]}>%</Text>
                  </View>
                </View>

                <Text style={[styles.pctDivider, { color: colors.mutedForeground }]}>+</Text>

                <View style={styles.pctField}>
                  <View style={[styles.personDot, { backgroundColor: colors.yukita }]} />
                  <Text style={[styles.pctName, { color: colors.yukita }]}>Yukita</Text>
                  <View style={[styles.pctInputWrap, { borderColor: colors.yukita + "60", backgroundColor: colors.card }]}>
                    <TextInput
                      style={[styles.pctInput, { color: colors.foreground }]}
                      value={yukitaPctText}
                      onChangeText={handleYukitaPctChange}
                      keyboardType="number-pad"
                      maxLength={3}
                      selectTextOnFocus
                    />
                    <Text style={[styles.pctSign, { color: colors.mutedForeground }]}>%</Text>
                  </View>
                </View>
              </View>

              <View style={styles.presetRow}>
                {SPLIT_PRESETS.map((preset) => {
                  const isActive = juanfePct === preset;
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => applyPreset(preset)}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isActive ? colors.primary : colors.card,
                          borderColor: isActive ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.presetChipText, { color: isActive ? colors.primaryForeground : colors.mutedForeground }]}>
                        {preset}/{100 - preset}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Note */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.noteInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={note}
            onChangeText={setNote}
            placeholder="Any details..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
          />
        </View>
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
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  scroll: {
    padding: 20,
    gap: 20,
  },
  errorBox: {
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  field: {
    gap: 10,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  toggleSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  amountLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
  },
  currencyToggle: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  currencyOpt: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  currencyOptText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
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
    borderWidth: 1.5,
  },
  threeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  personDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bothDots: {
    flexDirection: "row",
    alignItems: "center",
  },
  customSplitBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 14,
    marginTop: 4,
  },
  splitBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
  },
  splitBarJ: { height: "100%", borderRadius: 4 },
  splitBarY: { height: "100%", borderRadius: 4 },
  pctRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pctField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pctName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  pctInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  pctInput: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    width: 38,
    textAlign: "right",
    padding: 0,
  },
  pctSign: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  pctDivider: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
