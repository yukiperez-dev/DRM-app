import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ChecklistItem } from "@/context/ChecklistContext";
import { useColors } from "@/hooks/useColors";

interface ChecklistSectionProps {
  bottomPadding: number;
  items: ChecklistItem[];
  loading: boolean;
  addItem: (text: string) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  updateItem: (id: string, text: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  placeholder: string;
  emptyIcon: keyof typeof Feather.glyphMap;
  emptyTitle: string;
  emptyText: string;
}

export function ChecklistSection({
  bottomPadding,
  items,
  loading,
  addItem,
  toggleItem,
  updateItem,
  deleteItem,
  clearCompleted,
  placeholder,
  emptyIcon,
  emptyTitle,
  emptyText,
}: ChecklistSectionProps) {
  const colors = useColors();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const completedCount = items.filter((i) => i.done).length;

  const handleAdd = async () => {
    if (!draft.trim()) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await addItem(draft);
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
        void deleteItem(item.id);
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
        void clearCompleted();
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

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
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
                    color: item.done ? colors.mutedForeground : colors.foreground,
                    textDecorationLine: item.done ? "line-through" : "none",
                  },
                ]}
              >
                {item.text}
              </Text>
            )}
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              hitSlop={10}
              style={styles.deleteBtn}
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
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
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
});
