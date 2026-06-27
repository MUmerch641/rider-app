import { BellTabIcon, MapIcon, ProfileTabIcon } from "@/components/ui/icons";
import RiderActiveOrderBar from "@/components/navigation/RiderActiveOrderBar";
import { Colors } from "@/constants/theme";
import { useNotifications } from "@/context";
import { useAppFont } from "@/hooks/useAppFont";
import { LinearGradient } from "expo-linear-gradient";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FOOTER_ROUTE_ORDER = ["onmap", "inbox", "profile"] as const;

export default function RiderTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { t } = useTranslation();
  const font = useAppFont();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();

  const activeRoute = state.routes[state.index];
  const hideBar = activeRoute?.name === "onmap";

  const footerRoutes = FOOTER_ROUTE_ORDER.map((name) =>
    state.routes.find((r) => r.name === name),
  ).filter(Boolean);

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      <RiderActiveOrderBar hidden={hideBar} />
      <View style={styles.topShadow} />
      <View style={styles.tabRow}>
        {footerRoutes.map((route) => {
          if (!route) return null;
          const isFocused = state.index === state.routes.indexOf(route);
          const label = descriptors[route.key]?.options?.title ?? route.name;

          const Icon =
            route.name === "onmap"
              ? MapIcon
              : route.name === "inbox"
                ? BellTabIcon
                : ProfileTabIcon;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon
                  variant="outline"
                  color={isFocused ? Colors.primary : "#7C7890"}
                  showDot={route.name === "inbox" && unreadCount > 0}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? Colors.primary : "#7C7890",
                    fontFamily: isFocused ? font.bold : font.regular,
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingTop: 5,
  },
  topShadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#EFE7FF",
    ...Platform.select({
      ios: {
        shadowColor: "#EFE7FF",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.5,
        shadowRadius: 28,
      },
    }),
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 3,
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 11,
    textAlign: "center",
  },
});
