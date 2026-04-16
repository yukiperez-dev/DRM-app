import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Currency } from "@/context/ExpensesContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  value: Currency;
  onChange: (currency: Currency) => void;
}

export function CurrencyToggle({ value, onChange }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      {(["COP", "EUR"] as Currency[]).map((c) => (
        <TouchableOpacity
          key={c}
          style={[
            styles.option,
            value === c && { backgroundColor: colors.primary },
          ]}
          onPress={() => onChange(c)}
        >
          <Text
            style={[
              styles.text,
              { color: value === c ? colors.primaryForeground : colors.mutedForeground },
            ]}
          >
            {c}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
