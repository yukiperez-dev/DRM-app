import { Feather } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import React, { useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

function dateToIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoToDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

export default function DatePickerField({ value, onChange }: DatePickerFieldProps) {
  const colors = useColors();
  const [showPicker, setShowPicker] = useState(false);
  const webInputRef = useRef<any>(null);

  const displayValue = isoToDisplay(value);
  const dateValue = value ? isoToDate(value) : new Date();

  if (Platform.OS === "web") {
    return (
      <Pressable
        style={[
          styles.fieldWrap,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => {
          if (webInputRef.current) {
            webInputRef.current.showPicker?.();
            webInputRef.current.click();
          }
        }}
      >
        <Text style={[styles.valueText, { color: displayValue ? colors.foreground : colors.mutedForeground }]}>
          {displayValue || "DD-MM-YYYY"}
        </Text>
        <Feather name="calendar" size={16} color={colors.mutedForeground} />
        <input
          ref={webInputRef}
          type="date"
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

  const handleNativeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChange(dateToIso(selectedDate));
    }
  };

  return (
    <>
      <Pressable
        style={[
          styles.fieldWrap,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[styles.valueText, { color: displayValue ? colors.foreground : colors.mutedForeground }]}>
          {displayValue || "DD-MM-YYYY"}
        </Text>
        <Feather name="calendar" size={16} color={colors.mutedForeground} />
      </Pressable>

      {Platform.OS === "ios" ? (
        <Modal
          transparent
          animationType="slide"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.pickerSheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={[styles.pickerDone, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={handleNativeChange}
                style={styles.iosPicker}
                textColor={colors.foreground}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showPicker && (
          <DateTimePicker
            value={dateValue}
            mode="date"
            display="default"
            onChange={handleNativeChange}
          />
        )
      )}
    </>
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  pickerSheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pickerDone: {
    fontSize: 17,
    fontWeight: "600",
  },
  iosPicker: {
    height: 200,
  },
});
