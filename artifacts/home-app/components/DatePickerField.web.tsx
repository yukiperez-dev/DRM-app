import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { useColors } from "@/hooks/useColors";

interface DatePickerFieldProps {
  value: string;
  onChange: (date: string) => void;
}

function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}-${month}-${year}`;
}

export default function DatePickerField({ value, onChange }: DatePickerFieldProps) {
  const colors = useColors();
  const inputRef = useRef<any>(null);
  const [showNativePicker, setShowNativePicker] = useState(false);

  const displayValue = isoToDisplay(value);

  return (
    <Pressable
      style={[
        styles.fieldWrap,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => {
        setShowNativePicker(true);
        requestAnimationFrame(() => {
          inputRef.current?.click();
          setShowNativePicker(false);
        });
      }}
    >
      <Text
        style={[
          styles.valueText,
          { color: displayValue ? colors.foreground : colors.mutedForeground },
        ]}
      >
        {displayValue || "DD-MM-YYYY"}
      </Text>
      <Feather name="calendar" size={16} color={colors.mutedForeground} />
      <input
        ref={inputRef}
        type="date"
        tabIndex={showNativePicker ? 0 : -1}
        value={value}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        style={{
          position: "absolute",
          opacity: 0,
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          cursor: "pointer",
          border: "none",
          background: "transparent",
        }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    position: "relative",
    overflow: "hidden",
  },
  valueText: {
    fontSize: 15,
    flex: 1,
  },
});
