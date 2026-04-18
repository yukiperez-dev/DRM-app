import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ChecklistItem } from "@/context/ChecklistContext";
import { useColors } from "@/hooks/useColors";

interface TodoChecklistSectionProps {
  bottomPadding: number;
  items: ChecklistItem[];
  loading: boolean;
  addItem: (text: string, opts?: { dueDate?: string }) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  updateItem: (id: string, text: string) => Promise<void>;
  setItemDueDate: (id: string, dueDate: string | undefined) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  placeholder: string;
  emptyIcon: keyof typeof Feather.glyphMap;
  emptyTitle: string;
  emptyText: string;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDueDate(iso: string): string {
  const d = parseLocalDate(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function monthKey(iso: string): string {
  const [y, m] = iso.split("-");
  return `${y}-${m}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function isOverdue(iso: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseLocalDate(iso) < today;
}

interface Section {
  title: string;
  key: string;
  data: ChecklistItem[];
}

function buildSections(items: ChecklistItem[]): Section[] {
  const withDate = items.filter((i) => i.dueDate);
  const noDate = items.filter((i) => !i.dueDate);

  withDate.sort((a, b) => {
    if (a.dueDate! < b.dueDate!) return -1;
    if (a.dueDate! > b.dueDate!) return 1;
    return 0;
  });

  const monthMap = new Map<string, ChecklistItem[]>();
  for (const item of withDate) {
    const mk = monthKey(item.dueDate!);
    if (!monthMap.has(mk)) monthMap.set(mk, []);
    monthMap.get(mk)!.push(item);
  }

  const sections: Section[] = [];
  const sortedKeys = Array.from(monthMap.keys()).sort();
  for (const mk of sortedKeys) {
    sections.push({
      key: mk,
      title: monthLabel(mk),
      data: monthMap.get(mk)!,
    });
  }

  if (noDate.length > 0) {
    sections.push({
      key: "__nodate__",
      title: "No due date",
      data: noDate,
    });
  }

  return sections;
}

export function TodoChecklistSection({
  bottomPadding,
  items,
  loading,
  addItem,
  toggleItem,
  updateItem,
  setItemDueDate,
  deleteItem,
  clearCompleted,
  placeholder,
  emptyIcon,
  emptyTitle,
  emptyText,
}: TodoChecklistSectionProps) {
  const colors = useColors();
  const [draft, setDraft] = useState("");
  const [draftDate, setDraftDate] = useState<Date | null>(null);
  const [showNewDatePicker, setShowNewDatePicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editingDueDateId, setEditingDueDateId] = useState<string | null>(null);

  const completedCount = items.filter((i) => i.done).length;
  const sections = useMemo(() => buildSections(items), [items]);

  const handleAdd = async () => {
    if (!draft.trim()) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await addItem(draft, { dueDate: draftDate ? toISODate(draftDate) : undefined });
    setDraft("");
    setDraftDate(null);
  };

  const handleToggle = async (id: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    await toggleItem(id);
  };

  const handleDelete = (item: ChecklistItem) => {
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const handleDueDateChange = async (id: string, date: Date | undefined) => {
    setEditingDueDateId(null);
    if (date) {
      await setItemDueDate(id, toISODate(date));
    }
  };

  const handleRemoveDueDate = async (id: string) => {
    await setItemDueDate(id, undefined);
  };

  const renderItem = ({ item }: { item: ChecklistItem }) => (
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

      <View style={styles.itemContent}>
        {editingId === item.id ? (
          <TextInput
            value={editText}
            onChangeText={setEditText}
            style={[styles.itemText, { color: colors.foreground }]}
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
                color: item.done ? colors.mutedForeground : colors.foreground,
                textDecorationLine: item.done ? "line-through" : "none",
              },
            ]}
          >
            {item.text}
          </Text>
        )}

        {item.dueDate && (
          <TouchableOpacity
            onPress={() => setEditingDueDateId(item.id)}
            onLongPress={() => handleRemoveDueDate(item.id)}
            hitSlop={6}
            style={[
              styles.dueDateBadge,
              {
                backgroundColor: isOverdue(item.dueDate) && !item.done
                  ? "#fef2f2"
                  : colors.secondary,
                borderColor: isOverdue(item.dueDate) && !item.done
                  ? "#fecaca"
                  : colors.border,
              },
            ]}
          >
            <Feather
              name="calendar"
              size={10}
              color={
                isOverdue(item.dueDate) && !item.done
                  ? "#ef4444"
                  : colors.mutedForeground
              }
            />
            <Text
              style={[
                styles.dueDateText,
                {
                  color:
                    isOverdue(item.dueDate) && !item.done
                      ? "#ef4444"
                      : colors.mutedForeground,
                },
              ]}
            >
              {formatDueDate(item.dueDate)}
            </Text>
          </TouchableOpacity>
        )}

        {!item.dueDate && (
          <TouchableOpacity
            onPress={() => setEditingDueDateId(item.id)}
            hitSlop={6}
            style={styles.addDateBtn}
          >
            <Feather name="calendar" size={10} color={colors.mutedForeground} />
            <Text style={[styles.addDateText, { color: colors.mutedForeground }]}>
              Add date
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={() => handleDelete(item)}
        hitSlop={10}
        style={styles.deleteBtn}
      >
        <Feather name="x" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </Pressable>
  );

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        {section.title.toUpperCase()}
      </Text>
      <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
    </View>
  );

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
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          onPress={() => setShowNewDatePicker(true)}
          style={[
            styles.calendarBtn,
            {
              backgroundColor: draftDate ? colors.primary + "22" : "transparent",
              borderColor: draftDate ? colors.primary : colors.border,
            },
          ]}
          hitSlop={4}
        >
          <Feather
            name="calendar"
            size={16}
            color={draftDate ? colors.primary : colors.mutedForeground}
          />
          {draftDate && (
            <Text style={[styles.calendarBtnLabel, { color: colors.primary }]}>
              {formatDueDate(toISODate(draftDate))}
            </Text>
          )}
        </TouchableOpacity>

        {draftDate && (
          <TouchableOpacity onPress={() => setDraftDate(null)} hitSlop={6}>
            <Feather name="x-circle" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleAdd}
          disabled={!draft.trim()}
          style={[
            styles.addBtn,
            {
              backgroundColor: draft.trim() ? colors.primary : colors.secondary,
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

      {draftDate && (
        <Text style={[styles.draftDateHint, { color: colors.mutedForeground }]}>
          Due {formatDueDate(toISODate(draftDate))}
        </Text>
      )}

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
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Feather name={emptyIcon} size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {emptyTitle}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {emptyText}
              </Text>
            </View>
          )
        }
      />

      {showNewDatePicker && Platform.OS !== "web" && (
        <DateTimePicker
          value={draftDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(_, date) => {
            setShowNewDatePicker(Platform.OS === "ios" ? true : false);
            if (date) setDraftDate(date);
          }}
          minimumDate={new Date()}
        />
      )}

      {showNewDatePicker && Platform.OS === "web" && (
        <Modal transparent animationType="fade" visible>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowNewDatePicker(false)}
          >
            <Pressable
              style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {}}
            >
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Pick a due date
              </Text>
              <input
                type="date"
                min={toISODate(new Date())}
                defaultValue={draftDate ? toISODate(draftDate) : ""}
                onChange={(e) => {
                  if (e.target.value) setDraftDate(parseLocalDate(e.target.value));
                }}
                style={{
                  fontSize: 16,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                  color: colors.foreground,
                  backgroundColor: colors.background,
                }}
              />
              <TouchableOpacity
                onPress={() => setShowNewDatePicker(false)}
                style={[styles.modalDone, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {editingDueDateId && Platform.OS !== "web" && (
        <DateTimePicker
          value={
            items.find((i) => i.id === editingDueDateId)?.dueDate
              ? parseLocalDate(items.find((i) => i.id === editingDueDateId)!.dueDate!)
              : new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(_, date) => {
            if (Platform.OS !== "ios") setEditingDueDateId(null);
            handleDueDateChange(editingDueDateId!, date);
          }}
        />
      )}

      {editingDueDateId && Platform.OS === "web" && (
        <Modal transparent animationType="fade" visible>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setEditingDueDateId(null)}
          >
            <Pressable
              style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {}}
            >
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Change due date
              </Text>
              <input
                type="date"
                defaultValue={
                  items.find((i) => i.id === editingDueDateId)?.dueDate ?? ""
                }
                onChange={(e) => {
                  if (e.target.value) {
                    handleDueDateChange(editingDueDateId!, parseLocalDate(e.target.value));
                  }
                }}
                style={{
                  fontSize: 16,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                  color: colors.foreground,
                  backgroundColor: colors.background,
                }}
              />
              <TouchableOpacity
                onPress={() => handleRemoveDueDate(editingDueDateId!).then(() => setEditingDueDateId(null))}
                style={styles.removeDateBtn}
                hitSlop={4}
              >
                <Text style={{ color: "#ef4444", fontSize: 13, fontFamily: "Inter_500Medium" }}>
                  Remove date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditingDueDateId(null)}
                style={[styles.modalDone, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
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
  calendarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  calendarBtnLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  draftDateHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginHorizontal: 20,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  clearText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
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
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  dueDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  dueDateText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  addDateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  addDateText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  deleteBtn: {
    padding: 4,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
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
    maxWidth: 260,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: 300,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  modalDone: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modalDoneText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  removeDateBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
});
