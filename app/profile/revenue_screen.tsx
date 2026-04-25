import { PeriodTabs, SalesChart } from "@/components/ui";
import { CartIcon, ChartIcon } from "@/components/ui/icons";
import { RevenueBalanceCard } from "@/components/ui/RevenueBalanceCard";
import StatCircleCard from "@/components/ui/StatCircleCard";
import { isRTL } from "@/constants/i18n";
import { Colors, FontSize } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { radius, scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RevenueScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = isRTL(i18n.language);
  const align = rtl ? "right" : "left";

  const [period, setPeriod] = useState("revenue.today");

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* ── Top Nav ── */}
      <View
        style={[
          styles.topNav,
          {
            flexDirection: rtl ? "row-reverse" : "row",
            backgroundColor: Colors.background,
          },
        ]}
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
      >
        {/*Delivery Card Balance */}
        <RevenueBalanceCard balance={120000} />

        {/* ── Stats row ── */}
        <LinearGradient
          colors={["#fadecd", "#fadecd56", "#e6dcfa5e", "#e6dcfa"]}
          start={{ x: rtl ? 1.2 : 0, y: rtl ? 0 : 0 }}
          end={{ x: rtl ? 0 : 1, y: rtl ? 1 : 1 }}
          style={[
            styles.statsRow,
            { flexDirection: rtl ? "row-reverse" : "row" },
          ]}
        >
          {/* Orders */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("./revenue_screen")}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.statIconWrapper,
                { flexDirection: rtl ? "row-reverse" : "row" },
              ]}
            >
              <CartIcon size={scale(20)} />
              <Text style={[styles.statLabel, { fontFamily: font.medium }]}>
                {t("profile.orders")}
              </Text>
            </View>
            <Text
              style={[
                styles.statValue,
                { fontFamily: font.medium, textAlign: align },
              ]}
            >
              456
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("./revenue_screen")}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.statIconWrapper,
                { flexDirection: rtl ? "row-reverse" : "row" },
              ]}
            >
              <ChartIcon size={scale(20)} />
              <Text style={[styles.statLabel, { fontFamily: font.medium }]}>
                {t("profile.profit")}
              </Text>
            </View>
            <View
              style={[
                styles.profitRow,
                { flexDirection: rtl ? "row-reverse" : "row" },
              ]}
            >
              <Text style={[styles.statValue, { fontFamily: font.medium }]}>
                %58
              </Text>
              <MaterialIcons
                name="trending-up"
                size={scale(16)}
                color={Colors.textSecondary}
                style={{
                  marginLeft: rtl ? 0 : -scale(1),
                  marginRight: rtl ? -scale(1) : 0,
                }}
              />
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Sales Chart ── */}
        <SalesChart onFullReport={() => {}} style={styles.section} />

        {/* ── Reports ── */}
        <Text
          style={[
            styles.reportsTitle,
            { fontFamily: font.regular, textAlign: rtl ? "right" : "left" },
          ]}
        >
          {t("stats.efficiencyStat")}
        </Text>
        <View
          style={[
            styles.reportsGrid,
            { flexDirection: rtl ? "row-reverse" : "row" },
          ]}
        >
          <StatCircleCard label="stats.acceptance" value={89} progress={89} />
          <StatCircleCard label="stats.onTime" value={100} progress={100} />
          <StatCircleCard label="stats.rating" value={4.5} progress={90} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  topNav: {
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
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: spacing.md,
  },
  reportItem: {
    width: "48%",
    marginBottom: spacing.sm,
  },
});
