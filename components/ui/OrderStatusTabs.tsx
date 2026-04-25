import { isRTL } from "@/constants/i18n";
import { Colors, Shadow } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import {
  fontSize,
  moderateScale,
  radius,
  scale,
  spacing,
} from "@/utils/responsive";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface OrderStatusTab {
  key: string;
  label: string;
  count: number;
}

interface OrderStatusTabsProps {
  tabs: OrderStatusTab[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function OrderStatusTabs({
  tabs,
  activeKey,
  onChange,
}: OrderStatusTabsProps) {
  const font = useAppFont();
  const { i18n } = useTranslation();
  const rtl = isRTL(i18n.language);

  const [tabWidth, setTabWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const activeIndex = tabs.findIndex((t) => t.key === activeKey);

  // ── Slide pill when active tab or tabWidth changes ────────────────────────
  useEffect(() => {
    if (tabWidth === 0) return;
    const toValue = rtl
      ? (tabs.length - 1 - activeIndex) * tabWidth
      : activeIndex * tabWidth;

    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    }).start();
  }, [activeIndex, rtl, tabWidth]);

  // ── Measure container to get one tab's width ──────────────────────────────
  const onContainerLayout = (e: LayoutChangeEvent) => {
    const totalWidth = e.nativeEvent.layout.width;
    const newTabWidth = totalWidth / tabs.length;
    if (newTabWidth !== tabWidth) {
      setTabWidth(newTabWidth);
      // Snap immediately on first measure — no animation flash
      const toValue = rtl
        ? (tabs.length - 1 - activeIndex) * newTabWidth
        : activeIndex * newTabWidth;
      slideAnim.setValue(toValue);
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[styles.scroll, { flexDirection: rtl ? "row-reverse" : "row" }]}
        onLayout={onContainerLayout}
      >
        {/* Sliding white pill — exactly one tab wide */}
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.slidingPill,
              {
                width: tabWidth,
                transform: [{ translateX: slideAnim }],
              },
            ]}
            pointerEvents="none"
          />
        )}

        {tabs.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <TabItem
              key={tab.key}
              tab={tab}
              active={active}
              rtl={rtl}
              font={font}
              onPress={() => onChange(tab.key)}
            />
          );
        })}
      </View>
    </View>
  );
}

// ── Individual tab with press-scale + badge-pop animation ─────────────────────
function TabItem({
  tab,
  active,
  rtl,
  font,
  onPress,
}: {
  tab: OrderStatusTab;
  active: boolean;
  rtl: boolean;
  font: ReturnType<typeof useAppFont>;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(active ? 1 : 0.8)).current;
  const badgeOpacity = useRef(new Animated.Value(active ? 1 : 0.6)).current;

  // ── Badge pop when tab becomes active ─────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.spring(badgeScale, {
        toValue: active ? 1 : 0.8,
        useNativeDriver: true,
        damping: 12,
        stiffness: 200,
      }),
      Animated.timing(badgeOpacity, {
        toValue: active ? 1 : 0.6,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 200,
    }).start();
  };

  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.tabInner,
          {
            transform: [{ scale: scaleAnim }],
            flexDirection: rtl ? "row-reverse" : "row",
          },
        ]}
      >
        <Text
          style={[
            styles.label,
            {
              fontFamily: active ? font.semibold : font.regular,
              color: active ? Colors.primary : Colors.primaryLight,
            },
          ]}
        >
          {tab.label}
        </Text>

        <Animated.View
          style={[
            styles.badge,
            active ? styles.badgeActive : styles.badgeInactive,
            {
              transform: [{ scale: badgeScale }],
              opacity: badgeOpacity,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                fontFamily: font.semibold,
                color: active ? "#fff" : "#00000067",
              },
            ]}
          >
            {tab.count}
          </Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#EDE9FE",
    borderRadius: radius.full,
    padding: spacing.xs,
  },
  scroll: {
    alignItems: "center",
    // no justifyContent here — pill width drives layout
  },

  // Sliding pill — positioned at left:0, translateX moves it right
  slidingPill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.full,
    backgroundColor: Colors.card,
    ...Shadow.soft,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    zIndex: 1, // sit above the sliding pill
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: scale(4),
  },
  label: {
    fontSize: fontSize.md,
  },
  badge: {
    minWidth: scale(22),
    height: scale(22),
    borderRadius: moderateScale(11),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(6),
  },
  badgeActive: {
    backgroundColor: Colors.primary,
  },
  badgeInactive: {
    backgroundColor: "#ded8fa",
  },
  badgeText: {
    fontSize: fontSize.sm,
  },
});
