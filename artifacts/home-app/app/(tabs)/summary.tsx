import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CurrencyToggle } from "@/components/CurrencyToggle";
import {
  CATEGORIES,
  Currency,
  convertAmount,
  formatBoth,
  formatCOP,
  formatEUR,
  useExpenses,
} from "@/context/ExpensesContext";
import { useColors } from "@/hooks/useColors";

export default function SummaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, getBalance } = useExpenses();
  const [currency, setCurrency] = useState<Currency>("COP");

  const balance = getBalance(currency);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, { juanfe: number; yukita: number; total: number }> = {};
    for (const cat of CATEGORIES) {
      totals[cat] = { juanfe: 0, yukita: 0, total: 0 };
    }
    for (const e of expenses) {
      const amt = convertAmount(e.amount, e.currency, currency);
      if (!totals[e.category]) {
        totals[e.category] = { juanfe: 0, yukita: 0, total: 0 };
      }
      totals[e.category].total += amt;
      if (e.paidBy === "Juanfe") {
        totals[e.category].juanfe += amt;
      } else {
        totals[e.category].yukita += amt;
      }
    }
    return Object.entries(totals)
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => b[1].total - a[1].total);
  }, [expenses, currency]);

  const totalAll = categoryTotals.reduce((acc, [, v]) => acc + v.total, 0);
  const maxCategory = categoryTotals[0]?.[1].total ?? 1;

  const formatAmt = (amt: number) =>
    currency === "COP" ? formatCOP(amt) : formatEUR(amt);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 16,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Juanfe & Yukita
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Summary
          </Text>
        </View>
        <CurrencyToggle value={currency} onChange={setCurrency} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom:
              Platform.OS === "web" ? 100 : insets.bottom + 100,
          },
        ]}
      >
        {/* Balance Card */}
        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor:
                balance.netOwer === null ? colors.card : balance.netOwer === "Juanfe" ? "#EFF6FF" : "#FFF5F0",
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
                  color={
                    balance.netOwer === "Juanfe" ? colors.juanfe : colors.yukita
                  }
                />
              </View>
              <Text style={[styles.balanceTitle, { color: colors.foreground }]}>
                {balance.netOwer} owes
              </Text>
              <Text
                style={[
                  styles.balanceAmount,
                  {
                    color:
                      balance.netOwer === "Juanfe"
                        ? colors.juanfe
                        : colors.yukita,
                  },
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
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Paid by each
          </Text>
          <View style={styles.personRow}>
            <View
              style={[
                styles.personBadge,
                { backgroundColor: colors.juanfe + "18" },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: colors.juanfe }]} />
              <Text style={[styles.personName, { color: colors.juanfe }]}>
                Juanfe
              </Text>
            </View>
            <Text style={[styles.personAmt, { color: colors.foreground }]}>
              {formatAmt(
                expenses
                  .filter((e) => e.paidBy === "Juanfe")
                  .reduce(
                    (acc, e) =>
                      acc + convertAmount(e.amount, e.currency, currency),
                    0
                  )
              )}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.personRow}>
            <View
              style={[
                styles.personBadge,
                { backgroundColor: colors.yukita + "18" },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: colors.yukita }]} />
              <Text style={[styles.personName, { color: colors.yukita }]}>
                Yukita
              </Text>
            </View>
            <Text style={[styles.personAmt, { color: colors.foreground }]}>
              {formatAmt(
                expenses
                  .filter((e) => e.paidBy === "Yukita")
                  .reduce(
                    (acc, e) =>
                      acc + convertAmount(e.amount, e.currency, currency),
                    0
                  )
              )}
            </Text>
          </View>
        </View>

        {/* Category breakdown */}
        {categoryTotals.length > 0 && (
          <View
            style={[
              styles.section,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              By category
            </Text>
            {categoryTotals.map(([cat, vals]) => (
              <View key={cat} style={styles.categoryRow}>
                <View style={styles.categoryMeta}>
                  <Text
                    style={[styles.categoryName, { color: colors.foreground }]}
                  >
                    {cat}
                  </Text>
                  <Text
                    style={[
                      styles.categoryAmt,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {formatAmt(vals.total)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.barBg,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${(vals.total / maxCategory) * 100}%` as any,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <View style={styles.catPersonRow}>
                  <Text
                    style={[styles.catPersonText, { color: colors.juanfe }]}
                  >
                    J: {formatAmt(vals.juanfe)}
                  </Text>
                  <Text
                    style={[styles.catPersonText, { color: colors.yukita }]}
                  >
                    Y: {formatAmt(vals.yukita)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {expenses.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No data yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add expenses to see your summary
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
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
  balanceTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  balanceAmount: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  balanceSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  section: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
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
  categoryRow: { gap: 6 },
  categoryMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  categoryAmt: { fontSize: 13, fontFamily: "Inter_400Regular" },
  barBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  catPersonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  catPersonText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
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
  },
});
