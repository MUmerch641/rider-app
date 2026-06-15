import { BellTabIcon, MapIcon, ProfileTabIcon } from "@/components/ui/icons";
import { Colors } from "@/constants/theme";
import { useNotifications } from "@/context";
import { useAppFont } from "@/hooks/useAppFont";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

// On Map is the landing tab; the old Orders tab was removed from the bar
// (R7) — its "Active / New Orders Nearby" content now lives in the map's
// bottom sheet. The (tabs)/index route file is kept but hidden from the bar
// (href: null below) so router.replace("/(tabs)") still resolves cleanly and
// /orders detail routes stay reachable for navigation.
const TAB_SCREENS = [
  {
    name: "onmap",
    labelKey: "tabs.onmap",
    Icon: MapIcon,
  },
  {
    name: "inbox",
    labelKey: "tabs.inbox",
    Icon: BellTabIcon,
  },
  {
    name: "profile",
    labelKey: "tabs.profile",
    Icon: ProfileTabIcon,
  },
];

export default function TabLayout() {
  const { t } = useTranslation();
  const font = useAppFont();
  const { unreadCount } = useNotifications();

  // Native RTL mirrors the tab bar row automatically — no manual reversal.
  const screens = TAB_SCREENS;

  return (
    <Tabs
      // On Map is the cold-start landing tab (R7). Navigating to /(tabs)
      // (e.g. RouteGuard's post-login replace) lands here, not on index.
      initialRouteName="onmap"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "#7C7890",
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: "#FFFFFFE5",
          height: 100,
          paddingTop: 20,
          padding: 5,
        },
        tabBarLabelStyle: {
          fontFamily: font.semibold,
          fontSize: 11,
        },
        tabBarBackground: () => (
          <>
            <LinearGradient
              colors={["rgba(0, 0, 0, 0.03)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 10,
                zIndex: 1,
              }}
            />
            <View style={{ flex: 1, backgroundColor: Colors.card }} />
          </>
        ),
      }}
    >
      {/* The old Orders/Summary page is RETIRED (B3). The index route now
          REDIRECTS to /(tabs)/onmap (see (tabs)/index.tsx), so any navigation
          that resolves to /(tabs) lands on the map, never the summary.
          href:null keeps it off the tab bar. */}
      <Tabs.Screen name="index" options={{ href: null }} />
      {screens.map(({ name, labelKey, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(labelKey),
            tabBarIcon: ({ color, focused }) => (
              <Icon
                variant={"outline"}
                color={color}
                showDot={name === "inbox" && unreadCount > 0}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
