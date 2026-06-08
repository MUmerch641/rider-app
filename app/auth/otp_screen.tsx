import { authApi, type ApiError } from "@/api";
import { Button, ScreenHeader } from "@/components/ui";
import { isRTL } from "@/constants/i18n";
import { Colors, FontSize, Radius } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, spacing, verticalScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useNavGuard } from "@/hooks/useNavGuard";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpScreen() {
  const router = useNavGuard();
  const { t, i18n } = useTranslation();
  const rtl = isRTL(i18n.language);
  const font = useAppFont();

  const params = useLocalSearchParams<{ contact?: string; channel?: string }>();
  const contact = typeof params.contact === "string" ? params.contact : "";
  const channel: "phone" | "email" =
    params.channel === "email" ? "email" : "phone";

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (seconds <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleChange = (text: string, index: number) => {
    const val = text.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    setError("");
    if (val && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (!code) {
      setError(t("otp.codeEmpty"));
      return;
    }
    if (code.length < OTP_LENGTH) {
      setError(t("otp.codeIncomplete"));
      return;
    }
    if (!contact) {
      setError(t("otp.codeInvalid"));
      return;
    }

    setLoading(true);
    try {
      const { resetToken } = await authApi.verifyOtp({ contact, code });
      router.push({
        pathname: "/auth/new_password_screen",
        params: { resetToken },
      });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || t("otp.codeInvalid"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !contact) return;
    try {
      await authApi.resendOtp(contact);
      setOtp(Array(OTP_LENGTH).fill(""));
      setError("");
      setSeconds(RESEND_SECONDS);
      setCanResend(false);
      inputs.current[0]?.focus();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || "");
    }
  };

  const phoneDisplay = (() => {
    if (!contact) return "";
    if (channel === "email") return contact;
    // Insert a single space after a 4-character country code (e.g. "+964 7001234567")
    if (contact.startsWith("+") && contact.length > 4) {
      return `${contact.slice(0, 4)} ${contact.slice(4)}`;
    }
    return contact;
  })();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#DFCFFF", "#F5EEFF", "#FFFFFF", "#FFF8F0"]}
        locations={[0, 0.1, 0.6, 1]}
        start={{ x: rtl ? 0.9 : 0, y: 0 }}
        end={{ x: rtl ? 0 : 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScreenHeader
          title={t("otp.title")}
          onBack={() => router.back()}
          showLanguage={false}
        />

        <View style={styles.content}>
          <View style={styles.titleBox}>
            <Text style={[styles.title, { fontFamily: font.extrabold }]}>
              {t("otp.title")}
            </Text>
            <Text style={[styles.subtitle, { fontFamily: font.regular }]}>
              {t("otp.subtitle")}
            </Text>
            <Text style={[styles.phone, { fontFamily: font.semibold }]}>
              {phoneDisplay}
            </Text>
          </View>

          <View style={styles.otpRow}>
            {Array(OTP_LENGTH)
              .fill(0)
              .map((_, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => {
                    inputs.current[i] = ref;
                  }}
                  style={[
                    styles.otpBox,
                    { fontFamily: font.bold },
                    otp[i] ? styles.otpBoxFilled : null,
                    error ? styles.otpBoxError : null,
                  ]}
                  value={otp[i]}
                  onChangeText={(text) => handleChange(text, i)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, i)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
          </View>

          {!!error && (
            <Text style={[styles.errorText, { fontFamily: font.regular }]}>
              {error}
            </Text>
          )}
        </View>

        <View style={styles.bottom}>
          <Button
            label={t("otp.verify")}
            onPress={handleVerify}
            variant="primary"
            loading={loading}
          />
          <TouchableOpacity
            onPress={handleResend}
            disabled={!canResend}
            style={styles.resendRow}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.resendText,
                { fontFamily: font.medium },
                !canResend && styles.resendDisabled,
              ]}
            >
              {t("otp.resend")}{" "}
            </Text>
            {!canResend && (
              <Text style={[styles.timer, { fontFamily: font.semibold }]}>
                ({formatTime(seconds)})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.card },
  flex: { flex: 1, marginTop: verticalScale(30) },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    paddingBottom: spacing.xxl,
  },
  titleBox: { alignItems: "center", marginBottom: spacing.xl + spacing.md },
  title: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  phone: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  otpRow: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  otpBox: {
    width: scale(48),
    height: verticalScale(52),
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.inputBg,
    backgroundColor: Colors.background,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  otpBoxFilled: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.card,
  },
  otpBoxError: { borderColor: Colors.danger, backgroundColor: Colors.dangerBg },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    textAlign: "center",
    marginTop: spacing.md,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resendText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  resendDisabled: { color: Colors.textMuted },
  timer: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
