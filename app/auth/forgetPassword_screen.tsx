import { Button, Input, PhoneInput, ScreenHeader } from "@/components/ui";
import { isRTL } from "@/constants/i18n";
import { Colors, FontSize } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { spacing, verticalScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Mode = "email" | "phone";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const rtl = isRTL(i18n.language);
  const font = useAppFont();
  const row = rtl ? "row-reverse" : "row";

  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [countryCode, setCountryCode] = useState("+964");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = () => {
    let valid = true;
    if (mode === "email") {
      if (!email) {
        setEmailError(t("auth.emailEmpty"));
        valid = false;
      } else if (!validateEmail(email)) {
        setEmailError(t("auth.emailError"));
        valid = false;
      } else setEmailError("");
    } else {
      if (!phone) {
        setPhoneError(t("auth.phoneEmpty"));
        valid = false;
      } else if (phone.replace(/\D/g, "").length < 7) {
        setPhoneError(t("auth.phoneError"));
        valid = false;
      } else setPhoneError("");
    }
    if (!valid) return;
    setLoading(true);
    router.push("/auth/otp_screen");
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <LinearGradient
      colors={["#DFCFFF", "#F5EEFF", "#FFFFFF", "#FFF8F0"]}
      locations={[0, 0.1, 0.6, 1]}
      start={{ x: rtl ? 0.9 : 0, y: 0 }}
      end={{ x: rtl ? 0 : 0.9, y: 1 }}
      style={styles.root}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScreenHeader
          title={t("forgot.title")}
          onBack={() => router.back()}
          showLanguage={false}
        />

        <View style={styles.content}>
          <View style={styles.titleBox}>
            <Text style={[styles.title, { fontFamily: font.semibold }]}>
              {t("forgot.title")}
            </Text>
            <Text style={[styles.subtitle, { fontFamily: font.regular }]}>
              {mode === "email"
                ? t("forgot.subtitleEmail")
                : t("forgot.subtitlePhone")}
            </Text>
          </View>

          {mode === "email" ? (
            <Input
              label={t("forgot.emailLabel")}
              placeholder={t("auth.emailPlace")}
              keyboardType="email-address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError("");
              }}
              error={emailError}
              rtl={rtl}
            />
          ) : (
            <PhoneInput
              label={t("auth.phone")}
              countryCode={countryCode}
              phone={phone}
              onChangeCode={setCountryCode}
              onChangePhone={(text) => {
                setPhone(text.replace(/\D/g, ""));
                if (phoneError) setPhoneError("");
              }}
              error={phoneError}
              rtl={rtl}
            />
          )}
        </View>

        <View style={styles.bottom}>
          <Button
            label={t("forgot.sendOtp")}
            onPress={handleSend}
            variant="primary"
            loading={loading}
          />
          <TouchableOpacity
            style={[styles.switchRow, { flexDirection: row }]}
            onPress={() => {
              setMode(mode === "email" ? "phone" : "email");
              setEmailError("");
              setPhoneError("");
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.switchText,
                { fontFamily: font.regular, textAlign: "center" },
              ]}
            >
              {mode === "email"
                ? t("forgot.switchToPhone")
                : t("forgot.switchToEmail")}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, // ← removed backgroundColor
  flex: { flex: 1, marginTop: verticalScale(30) }, // ← new, wraps KeyboardAvoidingView
  // everything else stays exactly the same
  content: {
    flex: 1,

    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    paddingBottom: spacing.sm,
  },
  titleBox: { alignItems: "center", marginBottom: spacing.xl },
  title: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: verticalScale(22),
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  switchRow: { alignItems: "center", paddingVertical: spacing.xs },
  switchText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
