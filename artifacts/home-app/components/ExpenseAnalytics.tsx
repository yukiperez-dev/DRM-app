import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import {
  Currency,
  Expense,
  convertAmount,
  formatCOP,
  formatEUR,
} from "@/context/ExpensesContext";
import { useColors } from "@/hooks/useColors";

type Range = "3M" | "6M" | "12M" | "ALL";

const RANGES: { id: Range; label: string; months: number | null }[] = [
  { id: "3M", label: "3M", months: 3 },
  { id: "6M", label: "6M", months: 6 },
  { id: "12M", label: "12M", months: 12 },
  { id: "ALL", label: "All", months: null },
];

const CATEGORY_PALETTE: Record<string, string> = {
  Groceries: "#7C9A6F",
  "Rent & Utilities": "#5B7B9B",
  "Dining Out": "#D88C3F",
  Transport: "#9B7BB8",
  Health: "#C76B6B",
  Entertainment: "#E0A458",
  Travel: "#5DADC7",
  Shopping: "#C18BC9",
  Home: "#8B9D6B",
  Other: "#A89F8C",
};

function categoryColor(cat: string): string {
  if (CATEGORY_PALETTE[cat]) return CATEGORY_PALETTE[cat];
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 42%, 55%)`;
}

interface MonthBucket {
  key: string;
  label: string;
  shortLabel: string;
  total: number;
  byCategory: Record<string, number>;
}

function monthKey(year: number, month0: number) {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}

function shiftMonth(year: number, month0: number, delta: number) {
  const d = new Date(Date.UTC(year, month0 + delta, 1));
  return { year: d.getUTCFullYear(), month0: d.getUTCMonth() };
}

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const factor = Math.pow(10, exp);
  const norm = value / factor;
  let nice;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 2.5) nice = 2.5;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * factor;
}

function compactAmount(value: number, currency: Currency): string {
  const abs = Math.abs(value);
  const sym = currency === "COP" ? "$" : "€";
  if (abs >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sym}${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  if (currency === "EUR") return `${sym}${value.toFixed(0)}`;
  return `${sym}${Math.round(value)}`;
}

function buildBuckets(
  expenses: Expense[],
  currency: Currency,
  range: Range
): MonthBucket[] {
  if (expenses.length === 0) return [];

  const now = new Date();
  let endYear = now.getUTCFullYear();
  let endMonth0 = now.getUTCMonth();
  let startYear: number;
  let startMonth0: number;

  if (range === "ALL") {
    let earliest = expenses[0].date;
    for (const e of expenses) {
      if (e.date < earliest) earliest = e.date;
    }
    const d = new Date(earliest);
    startYear = d.getUTCFullYear();
    startMonth0 = d.getUTCMonth();
  } else {
    const cfg = RANGES.find((r) => r.id === range);
    const months = cfg?.months ?? 6;
    const start = shiftMonth(endYear, endMonth0, -(months - 1));
    startYear = start.year;
    startMonth0 = start.month0;
  }

  const buckets: MonthBucket[] = [];
  let y = startYear;
  let m = startMonth0;
  let safety = 0;
  while ((y < endYear || (y === endYear && m <= endMonth0)) && safety < 240) {
    const labelDate = new Date(Date.UTC(y, m, 1));
    buckets.push({
      key: monthKey(y, m),
      label: labelDate.toLocaleDateString("en-GB", {
        month: "short",
        year: "2-digit",
      }),
      shortLabel: labelDate.toLocaleDateString("en-GB", { month: "short" }),
      total: 0,
      byCategory: {},
    });
    const next = shiftMonth(y, m, 1);
    y = next.year;
    m = next.month0;
    safety++;
  }

  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = monthKey(d.getUTCFullYear(), d.getUTCMonth());
    const i = idx.get(key);
    if (i === undefined) continue;
    const amt = convertAmount(e.amount, e.currency, currency);
    buckets[i].total += amt;
    buckets[i].byCategory[e.category] =
      (buckets[i].byCategory[e.category] ?? 0) + amt;
  }

  return buckets;
}

interface AnalyticsProps {
  expenses: Expense[];
  currency: Currency;
}

export function ExpenseAnalytics({ expenses, currency }: AnalyticsProps) {
  const colors = useColors();
  const [range, setRange] = useState<Range>("6M");
  const [containerWidth, setContainerWidth] = useState(320);

  const buckets = useMemo(
    () => buildBuckets(expenses, currency, range),
    [expenses, currency, range]
  );

  const orderedCategories = useMemo(() => {
    const totals = new Map<string, number>();
    for (const b of buckets) {
      for (const [cat, val] of Object.entries(b.byCategory)) {
        totals.set(cat, (totals.get(cat) ?? 0) + val);
      }
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);
  }, [buckets]);

  const totalsInRange = buckets.reduce((sum, b) => sum + b.total, 0);
  const monthsWithSpend = buckets.filter((b) => b.total > 0).length;
  const avgMonthly =
    monthsWithSpend === 0 ? 0 : totalsInRange / monthsWithSpend;

  const lastBucket = buckets[buckets.length - 1];
  const prevBucket = buckets[buckets.length - 2];
  const lastMoMDelta =
    lastBucket && prevBucket && prevBucket.total > 0
      ? ((lastBucket.total - prevBucket.total) / prevBucket.total) * 100
      : null;

  const topCategoryEntry = orderedCategories[0]
    ? {
        cat: orderedCategories[0],
        amount: buckets.reduce(
          (sum, b) => sum + (b.byCategory[orderedCategories[0]] ?? 0),
          0
        ),
      }
    : null;

  const formatAmt = (n: number) =>
    currency === "COP" ? formatCOP(n) : formatEUR(n);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 1) setContainerWidth(w);
  };

  const hasData = totalsInRange > 0 && buckets.length > 0;

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        { borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Trends
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Stacked spend by category and month-over-month change
          </Text>
        </View>
      </View>

      <View style={styles.rangeRow}>
        {RANGES.map((r) => {
          const isActive = range === r.id;
          return (
            <TouchableOpacity
              key={r.id}
              onPress={() => setRange(r.id)}
              activeOpacity={0.8}
              style={[
                styles.rangeChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.secondary,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.rangeChipText,
                  {
                    color: isActive
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                  },
                ]}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!hasData ? (
        <View style={styles.emptyBlock}>
          <Feather
            name="bar-chart-2"
            size={28}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No expenses in this range yet.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.insightsRow}>
            <InsightCard
              label="Avg / month"
              value={formatAmt(avgMonthly)}
              icon="activity"
              colors={colors}
            />
            <InsightCard
              label="Top category"
              value={topCategoryEntry ? topCategoryEntry.cat : "—"}
              meta={
                topCategoryEntry ? formatAmt(topCategoryEntry.amount) : undefined
              }
              icon="award"
              accent={
                topCategoryEntry ? categoryColor(topCategoryEntry.cat) : undefined
              }
              colors={colors}
            />
            <InsightCard
              label="vs last month"
              value={
                lastMoMDelta === null
                  ? "—"
                  : `${lastMoMDelta >= 0 ? "+" : ""}${lastMoMDelta.toFixed(0)}%`
              }
              icon={
                lastMoMDelta === null
                  ? "minus"
                  : lastMoMDelta >= 0
                  ? "trending-up"
                  : "trending-down"
              }
              accent={
                lastMoMDelta === null
                  ? colors.mutedForeground
                  : lastMoMDelta >= 0
                  ? colors.destructive
                  : colors.success
              }
              colors={colors}
            />
          </View>

          <StackedBars
            buckets={buckets}
            orderedCategories={orderedCategories}
            width={containerWidth}
            colors={colors}
            currency={currency}
          />

          <View style={styles.legendRow}>
            {orderedCategories.slice(0, 8).map((cat) => (
              <View key={cat} style={styles.legendChip}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: categoryColor(cat) },
                  ]}
                />
                <Text
                  style={[
                    styles.legendText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {cat}
                </Text>
              </View>
            ))}
          </View>

          {buckets.length >= 2 && (
            <View style={styles.trendBlock}>
              <Text
                style={[styles.trendTitle, { color: colors.foreground }]}
              >
                Monthly trend
              </Text>
              <Text
                style={[styles.trendSub, { color: colors.mutedForeground }]}
              >
                Line shows total spend; markers show MoM change.
              </Text>
              <TrendChart
                buckets={buckets}
                width={containerWidth}
                colors={colors}
                currency={currency}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

function InsightCard({
  label,
  value,
  meta,
  icon,
  accent,
  colors,
}: {
  label: string;
  value: string;
  meta?: string;
  icon: keyof typeof Feather.glyphMap;
  accent?: string;
  colors: ReturnType<typeof useColors>;
}) {
  const tint = accent ?? colors.primary;
  return (
    <View
      style={[
        styles.insightCard,
        {
          borderColor: colors.border,
          backgroundColor: colors.secondary,
        },
      ]}
    >
      <View style={styles.insightHeader}>
        <View
          style={[styles.insightIcon, { backgroundColor: tint + "22" }]}
        >
          <Feather name={icon} size={11} color={tint} />
        </View>
        <Text
          style={[styles.insightLabel, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[styles.insightValue, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {meta && (
        <Text
          style={[styles.insightMeta, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {meta}
        </Text>
      )}
    </View>
  );
}

function StackedBars({
  buckets,
  orderedCategories,
  width,
  colors,
  currency,
}: {
  buckets: MonthBucket[];
  orderedCategories: string[];
  width: number;
  colors: ReturnType<typeof useColors>;
  currency: Currency;
}) {
  const chartHeight = 160;
  const labelHeight = 22;
  const yAxisWidth = 42;
  const innerWidth = Math.max(width - yAxisWidth - 8, 200);
  const minBarSlot = 28;
  const desiredSlot = Math.max(minBarSlot, innerWidth / buckets.length);
  const useScroll = desiredSlot * buckets.length > innerWidth + 1;
  const slot = useScroll ? Math.max(36, minBarSlot) : innerWidth / buckets.length;
  const barWidth = Math.min(28, slot * 0.65);
  const drawableWidth = useScroll ? slot * buckets.length : innerWidth;
  const totalSvgWidth = drawableWidth + yAxisWidth + 8;
  const maxValue = Math.max(...buckets.map((b) => b.total), 1);
  const niceMax = niceCeil(maxValue);

  const gridFracs = [0, 0.25, 0.5, 0.75, 1];

  const body = (
    <Svg width={totalSvgWidth} height={chartHeight + labelHeight}>
      {gridFracs.map((frac) => {
        const y = chartHeight - chartHeight * frac;
        return (
          <G key={frac}>
            <Line
              x1={yAxisWidth}
              x2={totalSvgWidth}
              y1={y}
              y2={y}
              stroke={colors.border}
              strokeDasharray={frac === 0 ? undefined : "3,4"}
              strokeWidth={1}
            />
            <SvgText
              x={yAxisWidth - 6}
              y={y + 3}
              fontSize={9}
              fill={colors.mutedForeground}
              textAnchor="end"
            >
              {compactAmount(niceMax * frac, currency)}
            </SvgText>
          </G>
        );
      })}

      {buckets.map((b, i) => {
        const slotX = yAxisWidth + i * slot;
        const x = slotX + (slot - barWidth) / 2;
        let yCursor = chartHeight;
        return (
          <G key={b.key}>
            {orderedCategories.map((cat) => {
              const v = b.byCategory[cat] ?? 0;
              if (v <= 0) return null;
              const h = (v / niceMax) * chartHeight;
              yCursor -= h;
              return (
                <Rect
                  key={cat}
                  x={x}
                  y={yCursor}
                  width={barWidth}
                  height={Math.max(h, 0.5)}
                  fill={categoryColor(cat)}
                />
              );
            })}
            <SvgText
              x={slotX + slot / 2}
              y={chartHeight + labelHeight - 6}
              fontSize={9}
              fill={colors.mutedForeground}
              textAnchor="middle"
            >
              {b.shortLabel}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );

  if (useScroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {body}
      </ScrollView>
    );
  }
  return <View>{body}</View>;
}

function TrendChart({
  buckets,
  width,
  colors,
  currency,
}: {
  buckets: MonthBucket[];
  width: number;
  colors: ReturnType<typeof useColors>;
  currency: Currency;
}) {
  const padding = { top: 22, right: 12, bottom: 28, left: 42 };
  const chartHeight = 150;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const minSlot = 44;
  const desiredInner = Math.max(width - padding.left - padding.right, 180);
  const slot = Math.max(minSlot, desiredInner / Math.max(buckets.length, 1));
  const useScroll = slot * (buckets.length - 1) > desiredInner + 1;
  const innerWidth = useScroll
    ? slot * (buckets.length - 1)
    : desiredInner;
  const totalWidth = innerWidth + padding.left + padding.right;
  const maxValue = Math.max(...buckets.map((b) => b.total), 1);
  const niceMax = niceCeil(maxValue);

  const points = buckets.map((b, i) => {
    const x =
      padding.left +
      (buckets.length === 1
        ? innerWidth / 2
        : (i / (buckets.length - 1)) * innerWidth);
    const y =
      padding.top + innerHeight - (b.total / niceMax) * innerHeight;
    return { x, y, b, i };
  });

  let linePath = "";
  points.forEach((p, i) => {
    linePath += i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
  });

  let areaPath = "";
  if (points.length > 0) {
    areaPath = `M ${points[0].x} ${padding.top + innerHeight}`;
    for (const p of points) areaPath += ` L ${p.x} ${p.y}`;
    areaPath += ` L ${points[points.length - 1].x} ${
      padding.top + innerHeight
    } Z`;
  }

  const gridFracs = [0, 0.5, 1];

  const body = (
    <Svg width={totalWidth} height={chartHeight}>
      {gridFracs.map((frac) => {
        const y = padding.top + innerHeight - innerHeight * frac;
        return (
          <G key={frac}>
            <Line
              x1={padding.left}
              x2={totalWidth - padding.right}
              y1={y}
              y2={y}
              stroke={colors.border}
              strokeDasharray={frac === 0 ? undefined : "3,4"}
              strokeWidth={1}
            />
            <SvgText
              x={padding.left - 6}
              y={y + 3}
              fontSize={9}
              fill={colors.mutedForeground}
              textAnchor="end"
            >
              {compactAmount(niceMax * frac, currency)}
            </SvgText>
          </G>
        );
      })}

      <Path d={areaPath} fill={colors.primary + "22"} />
      <Path
        d={linePath}
        stroke={colors.primary}
        strokeWidth={2}
        fill="none"
      />

      {points.map((p, i) => {
        const prev = i > 0 ? points[i - 1].b.total : null;
        const delta =
          prev !== null && prev > 0
            ? ((p.b.total - prev) / prev) * 100
            : null;
        const positive = delta !== null && delta >= 0;
        const labelColor = positive ? colors.destructive : colors.success;
        return (
          <G key={p.b.key}>
            <Circle
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill={colors.card}
              stroke={colors.primary}
              strokeWidth={2}
            />
            {delta !== null && Math.abs(delta) >= 1 && (
              <SvgText
                x={p.x}
                y={Math.max(p.y - 9, padding.top - 6)}
                fontSize={9}
                fill={labelColor}
                textAnchor="middle"
                fontWeight="600"
              >
                {`${positive ? "+" : ""}${delta.toFixed(0)}%`}
              </SvgText>
            )}
            <SvgText
              x={p.x}
              y={chartHeight - 6}
              fontSize={9}
              fill={colors.mutedForeground}
              textAnchor="middle"
            >
              {p.b.shortLabel}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );

  if (useScroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {body}
      </ScrollView>
    );
  }
  return <View>{body}</View>;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    maxWidth: 260,
  },
  rangeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  rangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  rangeChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  insightsRow: {
    flexDirection: "row",
    gap: 8,
  },
  insightCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 4,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  insightIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  insightLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    flex: 1,
    minWidth: 0,
  },
  insightValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  insightMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  trendBlock: {
    gap: 6,
    marginTop: 4,
  },
  trendTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  trendSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  emptyBlock: {
    paddingVertical: 18,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
