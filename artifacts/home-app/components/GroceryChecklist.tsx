import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
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

function iconFor(cat: string): keyof typeof Feather.glyphMap {
  return GROCERY_SECTIONS.find((s) => s.key === cat)?.icon ?? "more-horizontal";
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
  const [draft, setDraft] = useState("");
  const [draftCategory, setDraftCategory] = useState<string>("Produce");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [moveItem, setMoveItem] = useState<ChecklistItem | null>(null);

  const completedCount = items.filter((i) => i.done).length;

  const sections = useMemo(() => {
    const buckets: Record<string, ChecklistItem[]> = {};
    for (const key of SECTION_KEYS) buckets[key] = [];
    for (const item of items) {
      const key = normalizeCategory(item.category);
      buckets[key].push(item);
    }
    return GROCERY_SECTIONS.filter((s) => buckets[s.key].length > 0).map(
      (s) => ({
        title: s.key,
        icon: s.icon,
        data: buckets[s.key],
      })
    );
  }, [items]);

  const handleAdd = async () => {
    if (!draft.trim()) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await addItem(draft, { category: draftCategory });
    setDraft("");
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

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add an item to buy…"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={handleAdd}
          disabled={!draft.trim()}
          style={[
            styles.addBtn,
            {
              backgroundColor: draft.trim()
                ? colors.primary
                : colors.secondary,
            },
          ]}
          activeOpacity={0.85}
        >
          <Feather
            name="plus"
            size={18}
            color={draft.trim() ? "#fff" : colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {GROCERY_SECTIONS.map((s) => {
          const isSel = draftCategory === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => setDraftCategory(s.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSel ? colors.primary : colors.card,
                  borderColor: isSel ? colors.primary : colors.border,
                },
              ]}
            >
              <Feather
                name={s.icon}
                size={12}
                color={isSel ? "#fff" : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: isSel ? "#fff" : colors.mutedForeground },
                ]}
              >
                {s.key}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Feather
              name={(section as any).icon}
              size={14}
              color={colors.primary}
            />
            <Text
              style={[styles.sectionHeaderText, { color: colors.foreground }]}
            >
              {section.title}
            </Text>
            <Text
              style={[
                styles.sectionCount,
                { color: colors.mutedForeground },
              ]}
            >
              {section.data.length}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => startEdit(item)}
            onPress={() => handleToggle(item.id)}
            style={[
              styles.item,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: item.done ? colors.primary : colors.border,
                  backgroundColor: item.done ? colors.primary : "transparent",
                },
              ]}
            >
              {item.done && <Feather name="check" size={14} color="#fff" />}
            </View>
            {editingId === item.id ? (
              <TextInput
                value={editText}
                onChangeText={setEditText}
                style={[styles.itemText, { color: colors.foreground, flex: 1 }]}
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
                    textDecorationLine: item.done ? "line-through" : "none",
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
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </Pressable>
        )}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Feather
                name="shopping-cart"
                size={48}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Grocery list is empty
              </Text>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                Pick a section above and add items you need to buy
              </Text>
            </View>
          )
        }
      />

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
                      color={isCurrent ? colors.primary : colors.mutedForeground}
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 8,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  clearText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 6 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginLeft: 2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
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
  iconBtn: {
    padding: 4,
  },
  empty: {
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
