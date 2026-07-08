import { walletApi, type ApiError, type WalletSummary } from "@/api";
import { PeriodTabs, SalesChart } from "@/components/ui";
import { CartIcon, ChartIcon } from "@/components/ui/icons";
import { RevenueBalanceCard } from "@/components/ui/RevenueBalanceCard";
import StatCircleCard from "@/components/ui/StatCircleCard";
import { Colors, FontSize } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { radius, scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavGuard } from "@/hooks/useNavGuard";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    I18nManager,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RevenueScreen() {
  const router = useNavGuard();
  const { t } = useTranslation();
  const font = useAppFont();
  // Layout mirrors natively; only glyph/gradient mirrors need a condition.
  const rtl = I18nManager.isRTL;

  const [period, setPeriod] = useState("revenue.today");
  const [balance, setBalance] = useState<number>(0);
  const [orders, setOrders] = useState<number>(0);
  const [acceptance, setAcceptance] = useState<number>(0);
  const [rating, setRating] = useState<number>(0);
  const [onTimeRate, setOnTimeRate] = useState<number>(0);

  // Yearly chart series — fetched once and stable across period changes.
  const [chartData, setChartData] = useState<{
    revenue: number[];
    order: number[];
  }>({
    revenue: Array(12).fill(0),
    order: Array(12).fill(0),
  });

  // Map active period tab → ISO date range (YYYY-MM-DD).
  const range = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const startOf = (d: Date) => d.toISOString().slice(0, 10);

    if (period === "revenue.today") {
      return { startDate: todayStr, endDate: todayStr };
    }
    if (period === "revenue.thisWeek") {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { startDate: startOf(d), endDate: todayStr };
    }
    if (period === "revenue.thisMonth") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: startOf(d), endDate: todayStr };
    }
    if (period === "revenue.thisYear") {
      const d = new Date(today.getFullYear(), 0, 1);
      return { startDate: startOf(d), endDate: todayStr };
    }
    return { startDate: todayStr, endDate: todayStr };
  }, [period]);

  const [refreshing, setRefreshing] = useState(false);

  // Year-wide series for the chart. Not tied to the period tabs.
  const fetchYearlyChart = useCallback(async () => {
    try {
      const year = new Date().getFullYear();
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const summary: WalletSummary = await walletApi.summary({
        startDate,
        endDate,
        groupBy: "month",
      });
      const revenueByMonth = Array(12).fill(0);
      const orderByMonth = Array(12).fill(0);
      for (const point of summary?.series ?? []) {
        const monthIndex = new Date(point.date).getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          revenueByMonth[monthIndex] = Math.round(Number(point.earnings) || 0);
          orderByMonth[monthIndex] = Number(point.count) || 0;
        }
      }
      setChartData({
        revenue: revenueByMonth,
        order: orderByMonth,
      });
    } catch (err) {
      console.warn("Yearly chart fetch failed:", (err as ApiError)?.message);
    }
  }, []);

  // Period-scoped summary stats (balance, orders, acceptance, rating, on-time).
  const fetchPeriodSummary = useCallback(async () => {
    try {
      const summary = await walletApi.summary({
        startDate: range.startDate,
        endDate: range.endDate,
        groupBy: "day",
      });
      const totalEarnings = Number(summary?.summary?.totalEarnings ?? 0);
      const deliveryCount = Number(summary?.summary?.deliveryCount ?? 0);
      const acc = Number(summary?.summary?.acceptanceRate ?? 0);
      const rt = Number(summary?.summary?.rating ?? 0);
      const onTime = Number(summary?.summary?.onTimeRate ?? 0);
      setBalance(Number.isFinite(totalEarnings) ? totalEarnings : 0);
      setOrders(Number.isFinite(deliveryCount) ? deliveryCount : 0);
      setAcceptance(Number.isFinite(acc) ? acc : 0);
      setRating(Number.isFinite(rt) ? rt : 0);
      setOnTimeRate(Number.isFinite(onTime) ? onTime : 0);
    } catch (err) {
      console.warn("Wallet summary fetch failed:", (err as ApiError)?.message);
    }
  }, [range.startDate, range.endDate]);

  // Fetched once on mount.
  useEffect(() => {
    fetchYearlyChart();
  }, [fetchYearlyChart]);

  // Re-fetched whenever the active period tab changes.
  useEffect(() => {
    fetchPeriodSummary();
  }, [fetchPeriodSummary]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchYearlyChart(), fetchPeriodSummary()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchYearlyChart, fetchPeriodSummary]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* ── Top Nav ── */}
      <View
        style={[styles.topNav, { backgroundColor: Colors.background, flexDirection: font.rtl ? "row-reverse" : "row" }]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons
            name={rtl ? "arrow-forward" : "arrow-back"}
            size={scale(22)}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.navTitle,
            {
              fontFamily: font.regular,
              textAlign: "center",
              left: font.rtl ? undefined : -scale(25),
              right: font.rtl ? -scale(25) : undefined,
            },
          ]}
        >
          {t("revenue.title")}
        </Text>
      </View>

      {/* ── Period Tabs ── */}
      <PeriodTabs
        activeTab={period}
        onChange={setPeriod}
        style={styles.periodTabs}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/*Delivery Card Balance */}
        <RevenueBalanceCard balance={balance} />

        {/* ── Stats row ── */}
        <LinearGradient
          colors={["#fadecd", "#fadecd56", "#e6dcfa5e", "#e6dcfa"]}
          start={{ x: font.rtl ? 1.2 : 0, y: 0 }}
          end={{ x: font.rtl ? 0 : 1, y: 1 }}
          style={[styles.statsRow, { flexDirection: font.rtl ? "row-reverse" : "row" }]}
        >
          {/* Orders */}
          <TouchableOpacity style={styles.statCard} activeOpacity={0.75}>
            <View style={[styles.statIconWrapper, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
              <CartIcon size={scale(20)} />
              <Text style={[styles.statLabel, { fontFamily: font.medium }]}>
                {t("profile.orders")}
              </Text>
            </View>
            <Text style={[styles.statValue, { fontFamily: font.medium }]}>
              {String(orders)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.75}>
            <View style={[styles.statIconWrapper, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
              <ChartIcon size={scale(20)} />
              <Text style={[styles.statLabel, { fontFamily: font.medium }]}>
                {t("profile.onTime")}
              </Text>
            </View>
            <View style={[styles.profitRow, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
              <Text style={[styles.statValue, { fontFamily: font.medium }]}>
                {Math.round(onTimeRate)}%
              </Text>
              <MaterialIcons
                name="trending-up"
                size={scale(16)}
                color={Colors.textSecondary}
                style={{ marginLeft: -scale(1) }}
              />
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Sales Chart ── */}
        <SalesChart
          onFullReport={() => {}}
          style={styles.section}
          data={chartData}
        />

        {/* ── Reports ── */}
        <Text style={[styles.reportsTitle, { fontFamily: font.regular, textAlign: font.rtl ? "right" : "left" }]}>
          {t("stats.efficiencyStat")}
        </Text>
        <View style={[styles.reportsGrid, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
          <StatCircleCard
            label="stats.acceptance"
            value={Math.round(acceptance)}
            progress={Math.min(100, Math.max(0, acceptance))}
          />
          <StatCircleCard
            label="stats.onTime"
            value={Math.round(onTimeRate)}
            progress={Math.min(100, Math.max(0, onTimeRate))}
          />
          <StatCircleCard
            label="stats.rating"
            value={Number(rating.toFixed(1))}
            progress={Math.min(100, Math.max(0, (rating / 5) * 100))}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: verticalScale(50),
    top: -verticalScale(50),
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: Colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    left: -scale(25),
  },

  // Stats card
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    backgroundColor: "#F2F6FF",
    borderRadius: radius.xl + scale(2),
  },

  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: radius.xl + scale(2),
    padding: spacing.md,
    paddingVertical: spacing.lg,
    marginVertical: spacing.md,
    borderColor: Colors.inputBg,
    borderWidth: scale(0.5),
  },
  statIconWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: spacing.sm,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  profitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
  },
  periodTabs: { marginBottom: -spacing.xxxl },
  scroll: { paddingBottom: spacing.xxl },
  section: { marginHorizontal: spacing.md, marginBottom: spacing.lg },

  reportsTitle: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  reportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: spacing.md,
  },
  reportItem: {
    width: "48%",
    marginBottom: spacing.sm,
  },
});
