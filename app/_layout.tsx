import { LanguageOnboarding } from "@/components/ui/LanguageOnboarding";
import "@/constants/i18n";
import i18n, { isRTL, LANGUAGE_STORAGE_KEY } from "@/constants/i18n";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/poppins";
import {
  useFonts as useNotoFonts,
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_600SemiBold,
  Vazirmatn_700Bold,
} from "@expo-google-fonts/vazirmatn";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { I18nManager } from "react-native";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });
  const [notoLoaded] = useNotoFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_600SemiBold,
    Vazirmatn_700Bold,
  });

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((saved) => {
      if (saved && saved !== i18n.language) {
        i18n.changeLanguage(saved);
      }
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;

    const applyRTL = async () => {
      const shouldBeRTL = isRTL(i18n.language);
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
        // Just hide splash — user needs to restart app once for RTL to apply
        SplashScreen.hideAsync();
        return;
      }
      SplashScreen.hideAsync();
    };

    applyRTL();
  }, [loaded]);

  if (!loaded || !notoLoaded) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
      </Stack>

      <LanguageOnboarding />
    </>
  );
}
