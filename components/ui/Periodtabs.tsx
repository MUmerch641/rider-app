import { isRTL } from "@/constants/i18n";
import { Colors } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import {
  fontSize,
  radius,
  scale,
  spacing,
  verticalScale,
} from "@/utils/responsive";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

const GRADIENT_COLORS = ["#000", "#000"] as const;
const GRADIENT_START = { x: 0, y: 1 };
const GRADIENT_END = { x: 1, y: 0 };

const TABS = [
  "revenue.today",
  "revenue.thisWeek",
  "revenue.thisMonth",
  "revenue.thisYear",
];

interface PeriodTabsProps {
  activeTab: string;
  onChange: (tab: string) => void;
  style?: ViewStyle;
}

export function PeriodTabs({ activeTab, onChange, style }: PeriodTabsProps) {
  const font = useAppFont();
  const { t, i18n } = useTranslation();
  const rtl = isRTL(i18n.language);

  return (
    <View
      style={[styles.wrapper, style, { backgroundColor: Colors.background }]}
    >
      <View
        style={[
          styles.container,
          { gap: rtl ? spacing.xxl : spacing.lg },
          { transform: rtl ? [{ scaleX: -1 }] : [] },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => onChange(tab)}
              activeOpacity={0.75}
              style={[styles.tab, { transform: rtl ? [{ scaleX: -1 }] : [] }]}
            >
              {isActive ? (
                <MaskedView
                  maskElement={
                    <Text style={[styles.label, { fontFamily: font.semibold }]}>
                      {t(tab)}
                    </Text>
                  }
                >
                  <LinearGradient
                    colors={GRADIENT_COLORS}
                    start={GRADIENT_START}
                    end={GRADIENT_END}
                  >
                    <Text
                      style={[
                        styles.label,
                        { opacity: 0, fontFamily: font.semibold },
                      ]}
                    >
                      {t(tab)}
                    </Text>
                  </LinearGradient>
                </MaskedView>
              ) : (
                <Text style={[styles.label, { fontFamily: font.regular }]}>
                  {t(tab)}
                </Text>
              )}

              {isActive && <View style={styles.underline} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.divider,
    borderBottomStartRadius: scale(30),
    borderBottomEndRadius: scale(30),
    top: -verticalScale(50),
    paddingBottom: spacing.md,
  },
  container: {
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    paddingBottom: spacing.sm,
    alignItems: "center",
  },
  label: {
    paddingTop: verticalScale(20),
    fontSize: fontSize.md,
    color: Colors.textSecondary,
  },
  underline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: scale(1),
    borderRadius: radius.full,
    backgroundColor: Colors.dark,
  },
});
