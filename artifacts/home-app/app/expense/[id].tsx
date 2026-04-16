import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActionSheetIOS,
  Alert,
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

export default function ExpenseDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { expenses, updateExpense, togglePaid, deleteExpense } = useExpenses();

  const expense = expenses.find((e) => e.id === id);

  const [title, setTitle] = useState(expense?.title ?? "");
  const [amount, setAmount] = useState(
    expense && expense.paidBy !== "Both" ? String(expense.amount) : ""
  );
  const [juanfeAmount, setJuanfeAmount] = useState(
    expense?.juanfePaidAmount != null ? String(expense.juanfePaidAmount) : ""
  );
  const [yukitaAmount, setYukitaAmount] = useState(
    expense?.yukitaPaidAmount != null ? String(expense.yukitaPaidAmount) : ""
  );
  const [currency, setCurrency] = useState<Currency>(expense?.currency ?? "COP");
  const [category, setCategory] = useState(expense?.category ?? CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState<PaidBy>(expense?.paidBy ?? "Juanfe");
  const [splitType, setSplitType] = useState<SplitType>(expense?.splitType ?? "equal");
  const initPct = expense?.juanfeSplitPct ?? 50;
  const [juanfePct, setJuanfePct] = useState(initPct);
  const [juanfePctText, setJuanfePctText] = useState(String(initPct));
  const [yukitaPctText, setYukitaPctText] = useState(String(100 - initPct));
  const [note, setNote] = useState(expense?.note ?? "");
  const [isPaid, setIsPaid] = useState(expense?.isPaid !== false);
  const [date, setDate] = useState(expense?.date.slice(0, 10) ?? "");
  const [billImageBase64, setBillImageBase64] = useState<string | undefined>(expense?.billImageBase64);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  if (!expense) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Expense not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isBoth = paidBy === "Both";
  const isCustomSplit = splitType === "custom";

  // ── percent helpers ──────────────────────────────────────────────────
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

  // ── image picker ─────────────────────────────────────────────────────
  const pickFromSource = async (useCamera: boolean) => {
    if (useCamera) {
      if (Platform.OS !== "web") {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) { Alert.alert("Permission needed", "Camera access is required."); return; }
      }
      const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6, base64: true });
      if (!r.canceled && r.assets[0].base64) setBillImageBase64(`data:image/jpeg;base64,${r.assets[0].base64}`);
    } else {
      if (Platform.OS !== "web") {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) { Alert.alert("Permission needed", "Photo library access is required."); return; }
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: true, quality: 0.6, base64: true });
      if (!r.canceled && r.assets[0].base64) setBillImageBase64(`data:image/jpeg;base64,${r.assets[0].base64}`);
    }
  };

  const handlePickBill = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Take Photo", "Choose from Library"], cancelButtonIndex: 0 },
        (i) => { if (i === 1) pickFromSource(true); if (i === 2) pickFromSource(false); }
      );
    } else if (Platform.OS === "web") {
      pickFromSource(false);
    } else {
      Alert.alert("Bill Photo", "Choose source", [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: () => pickFromSource(true) },
        { text: "Choose from Library", onPress: () => pickFromSource(false) },
      ]);
    }
  };

  // ── save ─────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!title.trim()) { setError("Please enter a title"); return; }
    if (isCustomSplit) {
      const j = parseInt(juanfePctText, 10), y = parseInt(yukitaPctText, 10);
      if (isNaN(j) || isNaN(y) || j + y !== 100 || j < 0 || y < 0) {
        setError("Percentages must add up to 100%"); return;
      }
    }
    if (isBoth) {
      const j = parseFloat(juanfeAmount.replace(/,/g, ""));
      const y = parseFloat(yukitaAmount.replace(/,/g, ""));
      const jf = isNaN(j) ? 0 : j, yf = isNaN(y) ? 0 : y;
      if (jf + yf <= 0) { setError("Please enter at least one amount"); return; }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateExpense(id!, {
        title: title.trim(), amount: jf + yf, currency, category,
        paidBy: "Both", juanfePaidAmount: jf, yukitaPaidAmount: yf,
        splitType, juanfeSplitPct: isCustomSplit ? juanfePct : undefined,
        isPaid,
        date: new Date(`${date || expense.date.slice(0, 10)}T12:00:00.000Z`).toISOString(), note: note.trim() || undefined, billImageBase64,
      });
    } else {
      const parsed = parseFloat(amount.replace(/,/g, ""));
      if (!amount || isNaN(parsed) || parsed <= 0) { setError("Please enter a valid amount"); return; }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateExpense(id!, {
        title: title.trim(), amount: parsed, currency, category, paidBy,
        splitType, juanfeSplitPct: isCustomSplit ? juanfePct : undefined,
        isPaid,
        date: new Date(`${date || expense.date.slice(0, 10)}T12:00:00.000Z`).toISOString(), note: note.trim() || undefined, billImageBase64,
      });
    }
    setIsEditing(false);
    setError("");
  };

  // ── delete ───────────────────────────────────────────────────────────
  const handleDelete = () => {
    const doDelete = () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      deleteExpense(id!);
      router.back();
    };
    if (Platform.OS === "web") {
      if (window.confirm("Delete this expense?")) doDelete();
    } else {
      Alert.alert("Delete Expense", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const paidByOptions: { key: PaidBy; label: string; color: string }[] = [
    { key: "Juanfe", label: "Juanfe", color: colors.juanfe },
    { key: "Yukita", label: "Yukita", color: colors.yukita },
    { key: "Both", label: "Both", color: colors.primary },
  ];

  // ── read-only detail ──────────────────────────────────────────────────
  const dateStr = new Date(expense.date).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const splitLabel =
    expense.splitType === "full"
      ? "Not shared"
      : expense.splitType === "custom"
      ? `Juanfe ${expense.juanfeSplitPct ?? 50}% · Yukita ${100 - (expense.juanfeSplitPct ?? 50)}%`
      : "Split equally (50 / 50)";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        paddingTop: topPadding + 12,
        backgroundColor: colors.background,
        borderBottomColor: colors.border,
      }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {isEditing ? "Edit Expense" : expense.title}
        </Text>
        <TouchableOpacity onPress={() => { setIsEditing(!isEditing); setError(""); }} hitSlop={8}>
          <Text style={[styles.editBtn, { color: isEditing ? colors.mutedForeground : colors.primary }]}>
            {isEditing ? "Cancel" : "Edit"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Read-only view ── */}
      {!isEditing && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 60 : insets.bottom + 40 }]}
        >
          {/* Amount hero */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.heroAmount, { color: colors.foreground }]}>
              {expense.currency === "COP"
                ? `$\u2009${expense.amount.toLocaleString("es-CO")}`
                : `€${expense.amount.toFixed(2)}`}
            </Text>
            <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
              {expense.currency === "COP"
                ? `≈ €${(expense.amount * 0.00023).toFixed(2)}`
                : `≈ $\u2009${Math.round(expense.amount * 4348).toLocaleString("es-CO")}`}
            </Text>
            <View style={styles.heroPills}>
              <View style={[styles.pill, { backgroundColor: colors.primary + "18" }]}>
                <Text style={[styles.pillText, { color: colors.primary }]}>{expense.category}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.pillText, { color: colors.mutedForeground }]}>{dateStr}</Text>
              </View>
            </View>
          </View>

          {/* Status quick-toggle */}
          <TouchableOpacity
            onPress={() => togglePaid(id!)}
            activeOpacity={0.75}
            style={[
              styles.statusBar,
              {
                backgroundColor: expense.isPaid !== false ? "#16a34a18" : colors.primary + "12",
                borderColor: expense.isPaid !== false ? "#16a34a60" : colors.primary + "60",
              },
            ]}
          >
            <Feather
              name={expense.isPaid !== false ? "check-circle" : "clock"}
              size={16}
              color={expense.isPaid !== false ? "#16a34a" : colors.primary}
            />
            <Text style={[styles.statusBarText, { color: expense.isPaid !== false ? "#16a34a" : colors.primary }]}>
              {expense.isPaid !== false ? "Paid" : "Pending — tap to mark as paid"}
            </Text>
            {expense.isPaid !== false && (
              <Text style={[styles.statusBarHint, { color: "#16a34a99" }]}>Tap to mark pending</Text>
            )}
          </TouchableOpacity>

          {/* Detail rows */}
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Paid by</Text>
              <View style={styles.detailValueWrap}>
                {expense.paidBy === "Both" ? (
                  <View style={{ gap: 6 }}>
                    <View style={styles.personRow}>
                      <View style={[styles.dot, { backgroundColor: colors.juanfe }]} />
                      <Text style={[styles.detailValue, { color: colors.foreground }]}>
                        Juanfe{expense.juanfePaidAmount != null
                          ? ` — ${expense.currency === "COP" ? "$" : "€"}${expense.juanfePaidAmount.toLocaleString()}`
                          : ""}
                      </Text>
                    </View>
                    <View style={styles.personRow}>
                      <View style={[styles.dot, { backgroundColor: colors.yukita }]} />
                      <Text style={[styles.detailValue, { color: colors.foreground }]}>
                        Yukita{expense.yukitaPaidAmount != null
                          ? ` — ${expense.currency === "COP" ? "$" : "€"}${expense.yukitaPaidAmount.toLocaleString()}`
                          : ""}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.personRow}>
                    <View style={[styles.dot, {
                      backgroundColor: expense.paidBy === "Juanfe" ? colors.juanfe : colors.yukita,
                    }]} />
                    <Text style={[styles.detailValue, {
                      color: expense.paidBy === "Juanfe" ? colors.juanfe : colors.yukita,
                    }]}>{expense.paidBy}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Split</Text>
              <View style={styles.detailValueWrap}>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>{splitLabel}</Text>
              </View>
            </View>
            {expense.note ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Note</Text>
                  <View style={styles.detailValueWrap}>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>{expense.note}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>

          {/* Bill photo */}
          {expense.billImageBase64 ? (
            <View style={{ gap: 8 }}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Bill Photo</Text>
              <Pressable onPress={() => setBillModalVisible(true)}>
                <Image
                  source={{ uri: expense.billImageBase64 }}
                  style={[styles.billImage, { borderColor: colors.border }]}
                  contentFit="cover"
                />
                <View style={[styles.viewBillBadge, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
                  <Feather name="maximize-2" size={12} color="#fff" />
                  <Text style={styles.viewBillText}>View full</Text>
                </View>
              </Pressable>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.destructive + "60" }]}
            onPress={handleDelete} activeOpacity={0.7}
          >
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Delete Expense</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Edit form ── */}
      {isEditing && (
        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          bottomOffset={20}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 60 : insets.bottom + 40 }]}
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
              value={title} onChangeText={(t) => { setTitle(t); setError(""); }}
              placeholder="e.g. Mercadona groceries" placeholderTextColor={colors.mutedForeground}
            />
          </View>

          {/* Paid by */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Paid by</Text>
            <View style={styles.threeRow}>
              {paidByOptions.map(({ key, label, color }) => {
                const sel = paidBy === key;
                return (
                  <Pressable key={key} onPress={() => { setPaidBy(key); setError(""); }}
                    style={[styles.threeBtn, {
                      backgroundColor: sel ? color + "22" : colors.secondary,
                      borderColor: sel ? color : colors.border,
                    }]}
                  >
                    {key === "Both" ? (
                      <View style={{ flexDirection: "row" }}>
                        <View style={[styles.dot, { backgroundColor: colors.juanfe }]} />
                        <View style={[styles.dot, { backgroundColor: colors.yukita, marginLeft: -4 }]} />
                      </View>
                    ) : (
                      <View style={[styles.dot, { backgroundColor: color }]} />
                    )}
                    <Text style={[styles.threeBtnText, { color: sel ? color : colors.mutedForeground }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Date</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
              ]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          {/* Amount */}
          <View style={styles.field}>
            <View style={styles.amountLabelRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {isBoth ? "Amount per person" : "Amount"}
              </Text>
              <View style={[styles.currencyToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                {(["COP", "EUR"] as Currency[]).map((c) => (
                  <Pressable key={c} onPress={() => setCurrency(c)}
                    style={[styles.currencyOpt, currency === c && { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.currencyOptText, {
                      color: currency === c ? colors.primaryForeground : colors.mutedForeground,
                    }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {isBoth ? (
              <View style={styles.splitAmountRow}>
                {[
                  { key: "j" as const, label: "Juanfe", color: colors.juanfe, val: juanfeAmount, set: setJuanfeAmount },
                  { key: "y" as const, label: "Yukita", color: colors.yukita, val: yukitaAmount, set: setYukitaAmount },
                ].map((p, i) => (
                  <React.Fragment key={p.key}>
                    {i === 1 && <View style={styles.plusSeparator}><Text style={[styles.plusText, { color: colors.mutedForeground }]}>+</Text></View>}
                    <View style={styles.splitAmountField}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <View style={[styles.dot, { backgroundColor: p.color }]} />
                        <Text style={[styles.splitAmountName, { color: p.color }]}>{p.label}</Text>
                      </View>
                      <TextInput
                        style={[styles.splitAmountInput, { backgroundColor: colors.card, borderColor: p.color + "60", color: colors.foreground }]}
                        value={p.val} onChangeText={(t) => { p.set(t); setError(""); }}
                        placeholder="0" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad"
                      />
                    </View>
                  </React.Fragment>
                ))}
              </View>
            ) : (
              <TextInput
                style={[styles.amountInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={amount} onChangeText={(t) => { setAmount(t); setError(""); }}
                placeholder="0" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad"
              />
            )}
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable key={cat} onPress={() => setCategory(cat)}
                  style={[styles.chip, {
                    backgroundColor: category === cat ? colors.primary : colors.secondary,
                    borderColor: category === cat ? colors.primary : colors.border,
                  }]}
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
              {([
                { key: "equal" as SplitType, icon: "users", label: "50 / 50" },
                { key: "custom" as SplitType, icon: "sliders", label: "Custom" },
                { key: "full" as SplitType, icon: "user", label: "No split" },
              ] as const).map(({ key, icon, label }) => {
                const sel = splitType === key;
                return (
                  <Pressable key={key} onPress={() => setSplitType(key)}
                    style={[styles.threeBtn, {
                      backgroundColor: sel ? colors.primary + "22" : colors.secondary,
                      borderColor: sel ? colors.primary : colors.border,
                    }]}
                  >
                    <Feather name={icon} size={14} color={sel ? colors.primary : colors.mutedForeground} />
                    <Text style={[styles.threeBtnText, { color: sel ? colors.primary : colors.mutedForeground }]}>{label}</Text>
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
                  {[
                    { name: "Juanfe", color: colors.juanfe, text: juanfePctText, onChange: handleJuanfePctChange },
                    { name: "Yukita", color: colors.yukita, text: yukitaPctText, onChange: handleYukitaPctChange },
                  ].map((p, i) => (
                    <React.Fragment key={p.name}>
                      {i === 1 && <Text style={[styles.pctDivider, { color: colors.mutedForeground }]}>+</Text>}
                      <View style={styles.pctField}>
                        <View style={[styles.dot, { backgroundColor: p.color }]} />
                        <Text style={[styles.pctName, { color: p.color }]}>{p.name}</Text>
                        <View style={[styles.pctInputWrap, { borderColor: p.color + "60", backgroundColor: colors.card }]}>
                          <TextInput style={[styles.pctInput, { color: colors.foreground }]}
                            value={p.text} onChangeText={p.onChange}
                            keyboardType="number-pad" maxLength={3} selectTextOnFocus />
                          <Text style={[styles.pctSign, { color: colors.mutedForeground }]}>%</Text>
                        </View>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
                <View style={styles.presetRow}>
                  {SPLIT_PRESETS.map((preset) => {
                    const active = juanfePct === preset;
                    return (
                      <Pressable key={preset} onPress={() => applyPreset(preset)}
                        style={[styles.presetChip, {
                          backgroundColor: active ? colors.primary : colors.card,
                          borderColor: active ? colors.primary : colors.border,
                        }]}
                      >
                        <Text style={[styles.presetChipText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                          {preset}/{100 - preset}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Bill photo */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Bill Photo (optional)</Text>
            {billImageBase64 ? (
              <View style={styles.billPreviewWrap}>
                <Image source={{ uri: billImageBase64 }} style={styles.billPreview} contentFit="cover" />
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
                  <Text style={[styles.billChangeBtnText, { color: colors.mutedForeground }]}>Replace</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.billPicker, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={handlePickBill} activeOpacity={0.7}
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
                <Text style={[styles.twoBtnText, { color: isPaid ? "#16a34a" : colors.mutedForeground }]}>Paid</Text>
              </Pressable>
              <Pressable
                onPress={() => setIsPaid(false)}
                style={[styles.twoBtn, {
                  backgroundColor: !isPaid ? colors.primary + "18" : colors.secondary,
                  borderColor: !isPaid ? colors.primary : colors.border,
                }]}
              >
                <Feather name="clock" size={15} color={!isPaid ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.twoBtnText, { color: !isPaid ? colors.primary : colors.mutedForeground }]}>Pending</Text>
              </Pressable>
            </View>
          </View>

          {/* Note */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Note (optional)</Text>
            <TextInput
              style={[styles.input, styles.noteInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={note} onChangeText={setNote}
              placeholder="Any extra details..." placeholderTextColor={colors.mutedForeground}
              multiline numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave} activeOpacity={0.85}
          >
            <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.destructive + "60" }]}
            onPress={handleDelete} activeOpacity={0.7}
          >
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Delete Expense</Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      )}

      {/* Full-screen bill viewer modal */}
      <Modal
        visible={billModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setBillModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setBillModalVisible(false)}>
          <View style={styles.modalContent}>
            <Image source={{ uri: expense.billImageBase64 }} style={styles.modalImage} contentFit="contain" />
            <TouchableOpacity
              style={[styles.modalClose, { backgroundColor: colors.card }]}
              onPress={() => setBillModalVisible(false)}
            >
              <Feather name="x" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound: { fontSize: 16, fontFamily: "Inter_400Regular" },
  backLink: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  editBtn: { fontSize: 16, fontFamily: "Inter_600SemiBold", minWidth: 52, textAlign: "right" },
  scroll: { padding: 20, gap: 16 },
  // Hero
  heroCard: { borderRadius: 20, padding: 24, borderWidth: 1, alignItems: "center", gap: 6 },
  heroAmount: { fontSize: 36, fontFamily: "Inter_700Bold" },
  heroSub: { fontSize: 15, fontFamily: "Inter_400Regular" },
  heroPills: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center" },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  // Detail card
  detailCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  detailRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  detailLabel: { fontSize: 14, fontFamily: "Inter_500Medium", width: 72, paddingTop: 1 },
  detailValueWrap: { flex: 1 },
  detailValue: { fontSize: 15, fontFamily: "Inter_400Regular" },
  divider: { height: 1, marginHorizontal: 16 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  // Bill (read view)
  sectionLabel: { fontSize: 13, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  billImage: { width: "100%", height: 220, borderRadius: 16, borderWidth: 1 },
  viewBillBadge: {
    position: "absolute", bottom: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  viewBillText: { color: "#fff", fontSize: 12, fontFamily: "Inter_500Medium" },
  // Delete
  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
  },
  deleteBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  // Edit form
  errorBox: { padding: 12, borderRadius: 10 },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  field: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: "Inter_400Regular" },
  noteInput: { height: 80, textAlignVertical: "top", paddingTop: 12 },
  threeRow: { flexDirection: "row", gap: 8 },
  threeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  threeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  amountLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  amountInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 22, fontFamily: "Inter_600SemiBold" },
  splitAmountRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  splitAmountField: { flex: 1, gap: 6 },
  splitAmountName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  splitAmountInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 20, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  plusSeparator: { paddingBottom: 14, alignItems: "center", justifyContent: "flex-end" },
  plusText: { fontSize: 20 },
  currencyToggle: { flexDirection: "row", borderRadius: 12, padding: 3, borderWidth: 1 },
  currencyOpt: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 9 },
  currencyOptText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  customSplitBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12, marginTop: 4 },
  splitBar: { height: 8, borderRadius: 4, flexDirection: "row", overflow: "hidden" },
  splitBarJ: { height: "100%", borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  splitBarY: { height: "100%", borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  pctRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pctField: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  pctName: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  pctInputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  pctInput: { fontSize: 18, fontFamily: "Inter_700Bold", width: 36, textAlign: "center", padding: 0 },
  pctSign: { fontSize: 14, fontFamily: "Inter_500Medium" },
  pctDivider: { fontSize: 18, fontFamily: "Inter_400Regular" },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  presetChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  presetChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  billPicker: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14, padding: 16 },
  billPickerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  billPickerText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  billPreviewWrap: { position: "relative", borderRadius: 14, overflow: "visible" },
  billPreview: { width: "100%", height: 200, borderRadius: 14 },
  billRemoveBtn: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  billChangeBtn: { position: "absolute", bottom: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  billChangeBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  // Status
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusBarText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statusBarHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  twoRow: { flexDirection: "row", gap: 8 },
  twoBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 13, borderRadius: 12, borderWidth: 1,
  },
  twoBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saveButton: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  saveButtonText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalContent: { width: "100%", maxWidth: 500, position: "relative" },
  modalImage: { width: "100%", height: 500, borderRadius: 16 },
  modalClose: { position: "absolute", top: -14, right: -14, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
