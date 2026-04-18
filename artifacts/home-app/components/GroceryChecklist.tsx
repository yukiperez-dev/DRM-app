import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useMemo, useState } from "react";
import {
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

import { ChecklistItem } from "@/context/ChecklistContext";
import { useColors } from "@/hooks/useColors";

export const GROCERY_SECTIONS: {
  key: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { key: "Produce", icon: "sun" },
  { key: "Dairy", icon: "droplet" },
  { key: "Meat & Fish", icon: "anchor" },
  { key: "Bakery", icon: "coffee" },
  { key: "Pantry", icon: "package" },
  { key: "Frozen", icon: "cloud-snow" },
  { key: "Drinks", icon: "wind" },
  { key: "Household", icon: "home" },
  { key: "Other", icon: "more-horizontal" },
];

const SECTION_KEYS = GROCERY_SECTIONS.map((s) => s.key);

function normalizeCategory(cat: string | undefined): string {
  if (!cat) return "Other";
  return SECTION_KEYS.includes(cat) ? cat : "Other";
}

interface Props {
  bottomPadding: number;
  items: ChecklistItem[];
  loading: boolean;
  addItem: (text: string, opts?: { category?: string }) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  updateItem: (id: string, text: string) => Promise<void>;
  setItemCategory: (id: string, category: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
}

export function GroceryChecklist({
  bottomPadding,
  items,
  loading,
  addItem,
  toggleItem,
  updateItem,
  setItemCategory,
  deleteItem,
  clearCompleted,
}: Props) {
  const colors = useColors();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [moveItem, setMoveItem] = useState<ChecklistItem | null>(null);

  const [quickText, setQuickText] = useState("");
  const [quickCategory, setQuickCategory] = useState(GROCERY_SECTIONS[0].key);
  const quickInputRef = useRef<TextInput>(null);
  const categoryScrollRef = useRef<ScrollView>(null);

  const handleQuickAdd = async () => {
    const value = quickText.trim();
    if (!value) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await addItem(value, { category: quickCategory });
    setQuickText("");
    quickInputRef.current?.focus();
  };

  const completedCount = items.filter((i) => i.done).length;

  const buckets = useMemo(() => {
    const map: Record<string, ChecklistItem[]> = {};
    for (const key of SECTION_KEYS) map[key] = [];
    for (const item of items) {
      const key = normalizeCategory(item.category);
      map[key].push(item);
    }
    return map;
  }, [items]);

  const setDraft = (section: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [section]: value }));
  };

  const handleAddTo = async (section: string) => {
    const value = (drafts[section] ?? "").trim();
    if (!value) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await addItem(value, { category: section });
    setDraft(section, "");
  };

  const handleToggle = async (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    await toggleItem(id);
  };

  const handleDelete = (item: ChecklistItem) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Remove "${item.text}"?`)) {
        deleteItem(item.id);
      }
      return;
    }
    Alert.alert("Delete item", `Remove "${item.text}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteItem(item.id);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
    ]);
  };

  const handleClearCompleted = () => {
    if (completedCount === 0) return;
    if (Platform.OS === "web") {
      if (
        window.confirm(
          `Remove ${completedCount} completed item${completedCount > 1 ? "s" : ""}?`
        )
      ) {
        clearCompleted();
      }
      return;
    }
    Alert.alert(
      "Clear completed",
      `Remove ${completedCount} completed item${completedCount > 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearCompleted();
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            }
          },
        },
      ]
    );
  };

  const startEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const commitEdit = async () => {
    if (editingId && editText.trim()) {
      await updateItem(editingId, editText);
    }
    setEditingId(null);
    setEditText("");
  };

  const handleMove = async (category: string) => {
    if (moveItem) {
      await setItemCategory(moveItem.id, category);
      setMoveItem(null);
    }
  };

  const toggleCollapsed = (section: string) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <View style={styles.container}>
      {/* Quick-add bar */}
      <View style={[styles.quickAddWrap, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.quickInputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="plus" size={16} color={colors.mutedForeground} />
          <TextInput
            ref={quickInputRef}
            value={quickText}
            onChangeText={setQuickText}
            placeholder="Add an item…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.quickInput, { color: colors.foreground }]}
            returnKeyType="done"
            onSubmitEditing={handleQuickAdd}
            blurOnSubmit={false}
          />
          {quickText.trim().length > 0 && (
            <TouchableOpacity
              onPress={handleQuickAdd}
              style={[styles.quickAddBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Feather name="check" size={15} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={categoryScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChips}
          keyboardShouldPersistTaps="handled"
        >
          {GROCERY_SECTIONS.map((s) => {
            const active = quickCategory === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                onPress={() => setQuickCategory(s.key)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.75}
              >
                <Feather
                  name={s.icon}
                  size={12}
                  color={active ? "#fff" : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: active ? "#fff" : colors.foreground },
                  ]}
                >
                  {s.key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {completedCount > 0 && (
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {completedCount} of {items.length} completed
          </Text>
          <TouchableOpacity onPress={handleClearCompleted} hitSlop={8}>
            <Text style={[styles.clearText, { color: colors.primary }]}>
              Clear completed
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {GROCERY_SECTIONS.map((section) => {
          const sectionItems = buckets[section.key];
          const isCollapsed = collapsed[section.key] ?? false;
          const draft = drafts[section.key] ?? "";

          return (
            <View
              key={section.key}
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Pressable
                onPress={() => toggleCollapsed(section.key)}
                style={styles.sectionHeader}
              >
                <View
                  style={[
                    styles.sectionIcon,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Feather
                    name={section.icon}
                    size={14}
                    color={colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.sectionHeaderText,
                    { color: colors.foreground },
                  ]}
                >
                  {section.key}
                </Text>
                {sectionItems.length > 0 && (
                  <View
                    style={[
                      styles.sectionBadge,
                      { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sectionBadgeText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {sectionItems.length}
                    </Text>
                  </View>
                )}
                <View style={styles.flexSpacer} />
                <Feather
                  name={isCollapsed ? "chevron-down" : "chevron-up"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>

              {!isCollapsed && (
                <View style={styles.sectionBody}>
                  {sectionItems.map((item) => (
                    <Pressable
                      key={item.id}
                      onLongPress={() => startEdit(item)}
                      onPress={() => handleToggle(item.id)}
                      style={[
                        styles.item,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: item.done
                              ? colors.primary
                              : colors.border,
                            backgroundColor: item.done
                              ? colors.primary
                              : "transparent",
                          },
                        ]}
                      >
                        {item.done && (
                          <Feather name="check" size={14} color="#fff" />
                        )}
                      </View>
                      {editingId === item.id ? (
                        <TextInput
                          value={editText}
                          onChangeText={setEditText}
                          style={[
                            styles.itemText,
                            { color: colors.foreground, flex: 1 },
                          ]}
                          autoFocus
                          onBlur={commitEdit}
                          onSubmitEditing={commitEdit}
                          returnKeyType="done"
                        />
                      ) : (
                        <Text
                          style={[
                            styles.itemText,
                            {
                              color: item.done
                                ? colors.mutedForeground
                                : colors.foreground,
                              textDecorationLine: item.done
                                ? "line-through"
                                : "none",
                            },
                          ]}
                        >
                          {item.text}
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={() => setMoveItem(item)}
                        hitSlop={8}
                        style={styles.iconBtn}
                      >
                        <Feather
                          name="folder"
                          size={15}
                          color={colors.mutedForeground}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(item)}
                        hitSlop={10}
                        style={styles.iconBtn}
                      >
                        <Feather
                          name="x"
                          size={16}
                          color={colors.mutedForeground}
                        />
                      </TouchableOpacity>
                    </Pressable>
                  ))}

                  <View
                    style={[
                      styles.addRow,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Feather
                      name="plus"
                      size={16}
                      color={colors.mutedForeground}
                    />
                    <TextInput
                      value={draft}
                      onChangeText={(t) => setDraft(section.key, t)}
                      placeholder={`Add to ${section.key}…`}
                      placeholderTextColor={colors.mutedForeground}
                      style={[
                        styles.addInput,
                        { color: colors.foreground },
                      ]}
                      returnKeyType="done"
                      onSubmitEditing={() => handleAddTo(section.key)}
                      blurOnSubmit={false}
                    />
                    {draft.trim() ? (
                      <TouchableOpacity
                        onPress={() => handleAddTo(section.key)}
                        style={[
                          styles.addConfirm,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Feather name="check" size={14} color="#fff" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {!loading && items.length === 0 && (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Tap any section above to add items
          </Text>
        )}
      </ScrollView>

      <Modal
        visible={moveItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveItem(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMoveItem(null)}
        >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Move "{moveItem?.text}" to…
            </Text>
            <View style={styles.modalGrid}>
              {GROCERY_SECTIONS.map((s) => {
                const isCurrent =
                  normalizeCategory(moveItem?.category) === s.key;
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => handleMove(s.key)}
                    style={[
                      styles.modalChip,
                      {
                        backgroundColor: isCurrent
                          ? colors.primary + "22"
                          : colors.secondary,
                        borderColor: isCurrent ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Feather
                      name={s.icon}
                      size={13}
                      color={
                        isCurrent ? colors.primary : colors.mutedForeground
                      }
                    />
                    <Text
                      style={[
                        styles.modalChipText,
                        {
                          color: isCurrent
                            ? colors.primary
                            : colors.foreground,
                        },
                      ]}
                    >
                      {s.key}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  clearText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeaderText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  sectionBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  flexSpacer: { flex: 1 },
  sectionBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  iconBtn: { padding: 4 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 8,
  },
  addConfirm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingTop: 24,
  },
  quickAddWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  quickInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 10,
  },
  quickAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChips: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  modalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
