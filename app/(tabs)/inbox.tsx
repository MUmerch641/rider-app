import { Colors } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import InboxScreen from "../inbox";

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    storage.get("user_token").then((token) => {
      setIsLoggedIn(!!token);
    });
  }, []);

  // Still checking
  if (isLoggedIn === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.card,
        }}
      >
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  // Not logged in → go to auth
  if (!isLoggedIn) return <Redirect href="/auth/auth_screen" />;

  // Logged in → show inboxScreen
  return <InboxScreen />;
}
