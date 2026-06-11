import { BellTabIcon, MapIcon, ProfileTabIcon, RideIcon } from "@/components/ui/icons";
import { Colors } from "@/constants/theme";
import { useNotifications } from "@/context";
import { useAppFont } from "@/hooks/useAppFont";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

const TAB_SCREENS = [
  {
    name: "index",
    labelKey: "tabs.orders",
    Icon: RideIcon,
  },
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
