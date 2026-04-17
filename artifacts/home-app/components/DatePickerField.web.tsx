import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

function isoToDate(iso: string): Date {
  if (!iso) return new Date();
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateToIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function DatePickerField({ value, onChange }: DatePickerFieldProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<View>(null);

  const selected = value ? isoToDate(value) : null;
  const today = new Date();
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());

  const displayValue = isoToDisplay(value);
  const cells = buildCalendarDays(viewYear, viewMonth);

  useEffect(() => {
    if (open && selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    } else if (open) {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    onChange(dateToIso(d));
    setOpen(false);
  };

  const isSelected = (day: number) => {
    if (!selected) return false;
    return (
      selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day
    );
  };

  const isToday = (day: number) => {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  };

  return (
    <View style={{ position: "relative" as any }}>
      <Pressable
        style={[
          styles.fieldWrap,
          { backgroundColor: colors.card, borderColor: open ? colors.primary : colors.border },
        ]}
        onPress={() => setOpen((v) => !v)}
      >
        <Text
          style={[
            styles.valueText,
            { color: displayValue ? colors.foreground : colors.mutedForeground },
          ]}
        >
          {displayValue || "DD-MM-YYYY"}
        </Text>
        <Feather name="calendar" size={16} color={open ? colors.primary : colors.mutedForeground} />
      </Pressable>

      {open && (
        <>
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
          />
          <View
            style={[
              styles.calendar,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: "#000",
              },
            ]}
          >
            <View style={styles.calHeader}>
              <Pressable onPress={prevMonth} style={styles.navBtn}>
                <Feather name="chevron-left" size={18} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.monthLabel, { color: colors.foreground }]}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Pressable onPress={nextMonth} style={styles.navBtn}>
                <Feather name="chevron-right" size={18} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={styles.dayNamesRow}>
              {DAY_NAMES.map((d) => (
                <Text key={d} style={[styles.dayName, { color: colors.mutedForeground }]}>
                  {d}
                </Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {cells.map((day, idx) => {
                if (day === null) {
                  return <View key={`e-${idx}`} style={styles.dayCell} />;
                }
                const sel = isSelected(day);
                const tod = isToday(day);
                return (
                  <Pressable
                    key={`d-${day}`}
                    style={[
                      styles.dayCell,
                      sel && { backgroundColor: colors.primary, borderRadius: 8 },
                      !sel && tod && {
                        borderWidth: 1,
                        borderColor: colors.primary,
                        borderRadius: 8,
                      },
                    ]}
                    onPress={() => selectDay(day)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: sel ? "#fff" : tod ? colors.primary : colors.foreground },
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      )}
    </View>
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
  },
  valueText: {
    fontSize: 15,
    flex: 1,
  },
  backdrop: {
    position: "fixed" as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  calendar: {
    position: "absolute" as any,
    top: "100%" as any,
    left: 0,
    right: 0,
    zIndex: 100,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navBtn: {
    padding: 6,
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  dayNamesRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayName: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    paddingVertical: 2,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
