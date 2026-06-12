import { authApi, type ApiError } from "@/api";
import { Button, Input, ScreenHeader } from "@/components/ui";
import { useDialog } from "@/components/ui/AppDialog";
import { Colors, FontSize } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { useNavGuard } from "@/hooks/useNavGuard";
import { spacing, verticalScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/**
 * Authenticated change-password screen (current + new + confirm), reached from
 * the profile menu. Lives under /profile (NOT the auth group — RouteGuard
 * redirects authenticated drivers out of /auth/*, which is why the old menu
 * entry pointing at the forgot-password screen navigated nowhere).
 */
export default function ChangePasswordScreen() {
  const router = useNavGuard();
  const dialog = useDialog();
  const { t } = useTranslation();
  const font = useAppFont();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentError, setCurrentError] = useState("");
  const [newError, setNewError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [loading, setLoading] = useState(false);

  // Guard post-await setState if the screen is popped mid-request.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const validate = () => {
    let valid = true;
    if (!currentPassword) {
      setCurrentError(t("changePassword.currentEmpty"));
      valid = false;
    } else setCurrentError("");
    if (!newPassword) {
      setNewError(t("newPassword.passwordEmpty"));
      valid = false;
    } else if (newPassword.length < 8) {
      setNewError(t("newPassword.passwordWeak"));
      valid = false;
    } else setNewError("");
    if (!confirmPassword) {
      setConfirmError(t("newPassword.confirmEmpty"));
      valid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmError(t("newPassword.passwordNoMatch"));
      valid = false;
    } else setConfirmError("");
    return valid;
  };

  const handleSubmit = async () => {
    if (loading || !validate()) return;
    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      if (!mountedRef.current) return;
      dialog.show({
        title: t("newPassword.successTitle"),
        message: t("newPassword.successSubtitle"),
        tone: "success",
        buttons: [
          {
            label: t("common.ok"),
            variant: "primary",
            onPress: () => router.back(),
          },
        ],
      });
    } catch (err) {
      if (!mountedRef.current) return;
      const apiErr = err as ApiError;
      if (apiErr?.status === 401) {
        // Wrong current password (the /auth/ prefix keeps the global 401
        // handler out of the way — see api/client.ts).
        setCurrentError(t("changePassword.currentWrong"));
      } else {
        dialog.show({
          title: t("changePassword.failedTitle"),
          message: apiErr?.message || t("changePassword.failedBody"),
          tone: "error",
        });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#DFCFFF", "#F5EEFF", "#FFFFFF", "#FFF8F0"]}
        locations={[0, 0.1, 0.6, 1]}
        // Gradient coords don't auto-mirror under native RTL — flip manually.
        start={{ x: I18nManager.isRTL ? 0.9 : 0, y: 0 }}
        end={{ x: I18nManager.isRTL ? 0 : 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScreenHeader
          title={t("changePassword.title")}
          onBack={() => router.back()}
          showLanguage={false}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleBox}>
            <Text style={[styles.title, { fontFamily: font.extrabold }]}>
              {t("changePassword.title")}
            </Text>
            <Text style={[styles.subtitle, { fontFamily: font.regular }]}>
              {t("changePassword.subtitle")}
            </Text>
          </View>

          <Input
            label={t("changePassword.currentPassword")}
            placeholder={t("changePassword.currentPasswordPlace")}
            isPassword
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              if (currentError) setCurrentError("");
            }}
            error={currentError}
          />
          <Input
            label={t("newPassword.newPassword")}
            placeholder={t("newPassword.newPasswordPlace")}
            isPassword
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (newError) setNewError("");
            }}
            error={newError}
          />
          <Input
            label={t("newPassword.confirmPassword")}
            placeholder={t("newPassword.confirmPasswordPlace")}
            isPassword
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (confirmError) setConfirmError("");
            }}
            error={confirmError}
          />
        </ScrollView>

        <View style={styles.bottom}>
          <Button
            label={t("newPassword.changePassword")}
            onPress={handleSubmit}
            variant="primary"
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.card },
  flex: { flex: 1, marginTop: verticalScale(30) },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(24),
    paddingBottom: spacing.xxl,
  },
  titleBox: { alignItems: "center", marginBottom: spacing.xl },
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
  bottom: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
});
