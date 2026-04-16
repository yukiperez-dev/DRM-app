import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Currency,
  convertAmount,
  formatCOP,
  formatEUR,
  useExpenses,
} from "@/context/ExpensesContext";
import { useColors } from "@/hooks/useColors";

export function SummarySection({
  bottomPadding,
  currency,
}: {
  bottomPadding: number;
  currency: Currency;
}) {
  const colors = useColors();
  const { expenses, getBalance } = useExpenses();

  const balance = getBalance(currency);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const monthlyTotals = useMemo(() => {
    const monthMap = new Map<string, { label: string; total: number; key: string }>();
    for (const e of expenses) {
      const d = new Date(e.date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      const existing = monthMap.get(key);
      const amt = convertAmount(e.amount, e.currency, currency);
      if (existing) {
        existing.total += amt;
      } else {
        monthMap.set(key, { label, total: amt, key });
      }
    }
    return Array.from(monthMap.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [expenses, currency]);

  const maxMonth = Math.max(...monthlyTotals.map((m) => m.total), 1);

  const formatAmt = (amt: number) =>
    currency === "COP" ? formatCOP(amt) : formatEUR(amt);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding }]}
    >
      {/* Balance Card */}
      <View
        style={[
          styles.balanceCard,
          {
            backgroundColor:
              balance.netOwer === null
                ? colors.card
                : balance.netOwer === "Juanfe"
                ? colors.juanfe + "12"
                : colors.yukita + "12",
            borderColor: colors.border,
          },
        ]}
      >
        {balance.netOwer === null ? (
          <View style={styles.balanceCenter}>
            <View style={[styles.balanceIconCircle, { backgroundColor: colors.success + "22" }]}>
              <Feather name="check-circle" size={28} color={colors.success} />
            </View>
            <Text style={[styles.balanceTitle, { color: colors.foreground }]}>
              You're all settled!
            </Text>
            <Text style={[styles.balanceSub, { color: colors.mutedForeground }]}>
              No one owes anything
            </Text>
          </View>
        ) : (
          <View style={styles.balanceCenter}>
            <View
              style={[
                styles.balanceIconCircle,
                {
                  backgroundColor:
                    balance.netOwer === "Juanfe"
                      ? colors.juanfe + "22"
                      : colors.yukita + "22",
                },
              ]}
            >
              <Feather
                name="arrow-right"
                size={28}
                color={balance.netOwer === "Juanfe" ? colors.juanfe : colors.yukita}
              />
            </View>
            <Text style={[styles.balanceTitle, { color: colors.foreground }]}>
              {balance.netOwer} owes
            </Text>
            <Text
              style={[
                styles.balanceAmount,
                { color: balance.netOwer === "Juanfe" ? colors.juanfe : colors.yukita },
              ]}
            >
              {formatAmt(balance.netAmount)}
            </Text>
            <Text style={[styles.balanceSub, { color: colors.mutedForeground }]}>
              {currency === "COP"
                ? `≈ ${formatEUR(balance.netAmount * 0.00023)}`
                : `≈ ${formatCOP(balance.netAmount * 4348)}`}
            </Text>
          </View>
        )}
      </View>

      {/* Person breakdown */}
      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Paid by each</Text>
        <View style={styles.personRow}>
          <View style={[styles.personBadge, { backgroundColor: colors.juanfe + "18" }]}>
            <View style={[styles.dot, { backgroundColor: colors.juanfe }]} />
            <Text style={[styles.personName, { color: colors.juanfe }]}>Juanfe</Text>
          </View>
          <Text style={[styles.personAmt, { color: colors.foreground }]}>
            {formatAmt(
              expenses
                .filter((e) => e.paidBy === "Juanfe")
                .reduce((acc, e) => acc + convertAmount(e.amount, e.currency, currency), 0)
            )}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.personRow}>
          <View style={[styles.personBadge, { backgroundColor: colors.yukita + "18" }]}>
            <View style={[styles.dot, { backgroundColor: colors.yukita }]} />
            <Text style={[styles.personName, { color: colors.yukita }]}>Yukita</Text>
          </View>
          <Text style={[styles.personAmt, { color: colors.foreground }]}>
            {formatAmt(
              expenses
                .filter((e) => e.paidBy === "Yukita")
                .reduce((acc, e) => acc + convertAmount(e.amount, e.currency, currency), 0)
            )}
          </Text>
        </View>
      </View>

      {/* Monthly expenses */}
      {monthlyTotals.length > 0 && (
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Monthly expenses</Text>
          {monthlyTotals.map((item) => (
            <View key={item.key} style={styles.monthRow}>
              <Text style={[styles.monthLabel, { color: colors.foreground }]}>{item.label}</Text>
              <View style={[styles.monthBarBg, { backgroundColor: colors.secondary }]}>
                <View
                  style={[
                    styles.monthBarFill,
                    {
                      width: `${(item.total / maxMonth) * 100}%` as any,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.monthAmt, { color: colors.mutedForeground }]}>
                {formatAmt(item.total)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {expenses.length === 0 && (
        <View style={styles.emptyState}>
          <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No data yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Add expenses to see your summary
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 14 },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  balanceCenter: { alignItems: "center", gap: 6 },
  balanceIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  balanceTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  balanceAmount: { fontSize: 32, fontFamily: "Inter_700Bold" },
  balanceSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  section: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  personBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  personName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  personAmt: { fontSize: 14, fontFamily: "Inter_500Medium" },
  divider: { height: 1 },
  monthRow: { gap: 6 },
  monthLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  monthBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  monthBarFill: { height: "100%", borderRadius: 3 },
  monthAmt: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyState: {
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
});
