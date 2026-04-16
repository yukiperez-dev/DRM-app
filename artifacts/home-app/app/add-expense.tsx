import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActionSheetIOS,
  Alert,
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

const SPLIT_PRESETS = [25, 30, 40, 50, 60, 70, 75];

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
  // juanfe's share %, yukita = 100 - juanfePct
  const [juanfePct, setJuanfePct] = useState(50);
  const [juanfePctText, setJuanfePctText] = useState("50");
  const [yukitaPctText, setYukitaPctText] = useState("50");
  const [note, setNote] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [billImageBase64, setBillImageBase64] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");

  const isBoth = paidBy === "Both";

  const pickFromSource = async (useCamera: boolean) => {
    if (useCamera) {
      if (Platform.OS !== "web") {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
          Alert.alert("Permission needed", "Camera access is required to take a photo.");
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        setBillImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } else {
      if (Platform.OS !== "web") {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
          Alert.alert("Permission needed", "Photo library access is required.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        setBillImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    }
  };

  const handlePickBill = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Take Photo", "Choose from Library"], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) pickFromSource(true);
          if (index === 2) pickFromSource(false);
        }
      );
    } else if (Platform.OS === "web") {
      pickFromSource(false);
    } else {
      Alert.alert("Add Bill", "Choose source", [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: () => pickFromSource(true) },
        { text: "Choose from Library", onPress: () => pickFromSource(false) },
      ]);
    }
  };
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

  const handleSave = () => {
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

    if (isBoth) {
      const j = parseFloat(juanfeAmount.replace(/,/g, ""));
      const y = parseFloat(yukitaAmount.replace(/,/g, ""));
      const juanfeFinal = isNaN(j) || juanfeAmount === "" ? 0 : j;
      const yukitaFinal = isNaN(y) || yukitaAmount === "" ? 0 : y;
      const total = juanfeFinal + yukitaFinal;
      if (total <= 0) {
        setError("Please enter at least one amount");
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
        juanfeSplitPct: isCustomSplit ? juanfePct : undefined,
        isPaid,
        date: new Date().toISOString(),
        note: note.trim() || undefined,
        billImageBase64,
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
        juanfeSplitPct: isCustomSplit ? juanfePct : undefined,
        isPaid,
        date: new Date().toISOString(),
        note: note.trim() || undefined,
        billImageBase64,
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
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18" }]}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Title */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Title</Text>
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
                <View style={styles.splitAmountLabelRow}>
                  <View style={[styles.personDot, { backgroundColor: colors.juanfe }]} />
                  <Text style={[styles.splitAmountName, { color: colors.juanfe }]}>Juanfe</Text>
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
              <View style={styles.plusSeparator}>
                <Text style={[styles.plusText, { color: colors.mutedForeground }]}>+</Text>
              </View>
              <View style={styles.splitAmountField}>
                <View style={styles.splitAmountLabelRow}>
                  <View style={[styles.personDot, { backgroundColor: colors.yukita }]} />
                  <Text style={[styles.splitAmountName, { color: colors.yukita }]}>Yukita</Text>
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
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
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
                  <Feather
                    name={icon}
                    size={14}
                    color={isSelected ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.threeBtnText,
                      { color: isSelected ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom split controls */}
          {isCustomSplit && (
            <View
              style={[
                styles.customSplitBox,
                { backgroundColor: colors.secondary, borderColor: colors.border },
              ]}
            >
              {/* Visual split bar */}
              <View style={[styles.splitBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.splitBarJ,
                    { width: `${juanfePct}%` as any, backgroundColor: colors.juanfe },
                  ]}
                />
                <View
                  style={[
                    styles.splitBarY,
                    { width: `${100 - juanfePct}%` as any, backgroundColor: colors.yukita },
                  ]}
                />
              </View>

              {/* Percentage inputs */}
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

              {/* Quick presets */}
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
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: isActive ? colors.primaryForeground : colors.mutedForeground },
                        ]}
                      >
                        {preset}/{100 - preset}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Bill Photo */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Bill Photo (optional)
          </Text>
          {billImageBase64 ? (
            <View style={styles.billPreviewWrap}>
              <Image
                source={{ uri: billImageBase64 }}
                style={styles.billPreview}
                contentFit="cover"
              />
              <TouchableOpacity
                style={[styles.billRemoveBtn, { backgroundColor: colors.destructive }]}
                onPress={() => setBillImageBase64(undefined)}
              >
                <Feather name="x" size={14} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.billChangeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handlePickBill}
              >
                <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
                <Text style={[styles.billChangeBtnText, { color: colors.mutedForeground }]}>
                  Replace
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.billPicker, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={handlePickBill}
              activeOpacity={0.7}
            >
              <View style={[styles.billPickerIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="camera" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.billPickerText, { color: colors.mutedForeground }]}>
                {Platform.OS === "web" ? "Upload photo" : "Take photo or choose from library"}
              </Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Status</Text>
          <View style={styles.twoRow}>
            <Pressable
              onPress={() => setIsPaid(true)}
              style={[styles.twoBtn, {
                backgroundColor: isPaid ? "#16a34a18" : colors.secondary,
                borderColor: isPaid ? "#16a34a" : colors.border,
              }]}
            >
              <Feather name="check-circle" size={15} color={isPaid ? "#16a34a" : colors.mutedForeground} />
              <Text style={[styles.twoBtnText, { color: isPaid ? "#16a34a" : colors.mutedForeground }]}>
                Paid
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsPaid(false)}
              style={[styles.twoBtn, {
                backgroundColor: !isPaid ? colors.primary + "18" : colors.secondary,
                borderColor: !isPaid ? colors.primary : colors.border,
              }]}
            >
              <Feather name="clock" size={15} color={!isPaid ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.twoBtnText, { color: !isPaid ? colors.primary : colors.mutedForeground }]}>
                Pending
              </Text>
            </Pressable>
          </View>
          {!isPaid && (
            <Text style={[styles.statusHint, { color: colors.mutedForeground }]}>
              Pending expenses are tracked but won't affect the balance.
            </Text>
          )}
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
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveBtn: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 20, gap: 20 },
  errorBox: { padding: 12, borderRadius: 10 },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium" },
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
  noteInput: { height: 80, textAlignVertical: "top", paddingTop: 12 },
  // Three-button rows
  threeRow: { flexDirection: "row", gap: 8 },
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
  threeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bothDots: { flexDirection: "row" },
  personDot: { width: 8, height: 8, borderRadius: 4 },
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
  splitAmountRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  splitAmountField: { flex: 1, gap: 6 },
  splitAmountLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  splitAmountName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  splitAmountInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  plusSeparator: { paddingBottom: 14, alignItems: "center", justifyContent: "flex-end" },
  plusText: { fontSize: 20, fontFamily: "Inter_400Regular" },
  // Currency toggle
  currencyToggle: { flexDirection: "row", borderRadius: 12, padding: 3, borderWidth: 1 },
  currencyOpt: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 9 },
  currencyOptText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  // Category chips
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  // Custom split
  customSplitBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginTop: 4,
  },
  splitBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
  },
  splitBarJ: { height: "100%", borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  splitBarY: { height: "100%", borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  pctRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pctField: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  pctName: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  pctInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  pctInput: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    width: 36,
    textAlign: "center",
    padding: 0,
  },
  pctSign: { fontSize: 14, fontFamily: "Inter_500Medium" },
  pctDivider: { fontSize: 18, fontFamily: "Inter_400Regular" },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  // Status toggle
  twoRow: { flexDirection: "row", gap: 8 },
  twoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  twoBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statusHint: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  // Bill photo
  billPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 16,
  },
  billPickerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  billPickerText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  billPreviewWrap: { position: "relative", borderRadius: 14, overflow: "visible" },
  billPreview: { width: "100%", height: 200, borderRadius: 14 },
  billRemoveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  billChangeBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  billChangeBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  // Save button
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
  saveButtonText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
