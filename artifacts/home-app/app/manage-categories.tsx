import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCategories } from "@/context/CategoriesContext";
import { useColors } from "@/hooks/useColors";

export default function ManageCategoriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { categories, addCategory, deleteCategory } = useCategories();

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const topPadding = Platform.OS === "web" ? 24 : insets.top;

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      Alert.alert("Already exists", `"${trimmed}" is already in your categories.`);
      return;
    }
    setAdding(true);
    try {
      await addCategory(trimmed);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setNewName("");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to add category.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (name: string) => {
    const doDelete = async () => {
      try {
        await deleteCategory(name);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        Alert.alert("Error", "Failed to delete category.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Remove "${name}" from categories?`)) doDelete();
    } else {
      Alert.alert("Remove Category", `Remove "${name}" from categories?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 16, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.foreground }]}>Expense Types</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {categories.length} categories
          </Text>
        </View>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Current categories
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={[styles.categoryRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.categoryDot, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="tag" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.categoryName, { color: colors.foreground }]}>{item}</Text>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              hitSlop={12}
              style={styles.deleteBtn}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Add new category */}
      <View
        style={[
          styles.addBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === "web" ? 20 : insets.bottom + 12,
          },
        ]}
      >
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="plus" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            value={newName}
            onChangeText={setNewName}
            placeholder="New category name"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <Pressable
            onPress={handleAdd}
            disabled={adding || !newName.trim()}
            style={[
              styles.addBtn,
              {
                backgroundColor: newName.trim() ? colors.primary : colors.secondary,
                opacity: adding ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.addBtnText, { color: newName.trim() ? "#fff" : colors.mutedForeground }]}>
              {adding ? "Adding…" : "Add"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  backBtn: { paddingBottom: 4 },
  headerTitle: { flex: 1 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  list: {
    paddingHorizontal: 16,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  categoryDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  deleteBtn: { padding: 4 },
  separator: { height: 8 },
  addBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  inputIcon: { marginTop: 1 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 8,
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
