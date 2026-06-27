import RiderTabBar from "@/components/navigation/RiderTabBar";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

const TAB_SCREENS = [
  { name: "onmap", labelKey: "tabs.onmap" },
  { name: "inbox", labelKey: "tabs.inbox" },
  { name: "profile", labelKey: "tabs.profile" },
] as const;

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      initialRouteName="onmap"
      tabBar={(props) => <RiderTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      {TAB_SCREENS.map(({ name, labelKey }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ title: t(labelKey) }}
        />
      ))}
    </Tabs>
  );
}
