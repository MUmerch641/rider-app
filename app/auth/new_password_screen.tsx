import { Button, Input, ScreenHeader } from "@/components/ui";
import { isRTL } from "@/constants/i18n";
import { Colors, FontSize, Radius, Shadow } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function NewPasswordScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const rtl = isRTL(i18n.language);
  const font = useAppFont();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const validate = () => {
    let valid = true;
    if (!newPassword) {
      setNewPasswordError(t("newPassword.passwordEmpty"));
      valid = false;
    } else if (newPassword.length < 8) {
      setNewPasswordError(t("newPassword.passwordWeak"));
      valid = false;
    } else setNewPasswordError("");
    if (!confirmPassword) {
      setConfirmPasswordError(t("newPassword.confirmEmpty"));
      valid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError(t("newPassword.passwordNoMatch"));
      valid = false;
    } else setConfirmPasswordError("");
    return valid;
  };

  const handleChange = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowSuccess(true);
    }, 1500);
  };

  const handleContinue = () => {
    setShowSuccess(false);
    router.replace("/auth/auth_screen");
  };

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
          title={t("newPassword.title")}
          onBack={() => router.back()}
          showLanguage={false}
        />

        <View style={styles.content}>
          <View style={styles.titleBox}>
            <Text style={[styles.title, { fontFamily: font.extrabold }]}>
              {t("newPassword.title")}
            </Text>
            <Text style={[styles.subtitle, { fontFamily: font.regular }]}>
              {t("newPassword.subtitle")}
            </Text>
          </View>

          <Input
            label={t("newPassword.newPassword")}
            placeholder={t("newPassword.newPasswordPlace")}
            isPassword
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (newPasswordError) setNewPasswordError("");
            }}
            error={newPasswordError}
            rtl={rtl}
          />
          <Input
            label={t("newPassword.confirmPassword")}
            placeholder={t("newPassword.confirmPasswordPlace")}
            isPassword
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (confirmPasswordError) setConfirmPasswordError("");
            }}
            error={confirmPasswordError}
            rtl={rtl}
          />
        </View>

        <View style={styles.bottom}>
          <Button
            label={t("newPassword.changePassword")}
            onPress={handleChange}
            variant="primary"
            loading={loading}
          />
        </View>

        {/* ── Success Modal ── */}
        <Modal
          visible={showSuccess}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.successIconBox}>
                <Ionicons name="checkmark" size={scale(40)} color="#fff" />
              </View>
              <Text
                style={[styles.successTitle, { fontFamily: font.semibold }]}
              >
                {t("newPassword.successTitle")}
              </Text>
              <Text
                style={[styles.successSubtitle, { fontFamily: font.regular }]}
              >
                {t("newPassword.successSubtitle")}
              </Text>
              <TouchableOpacity
                style={styles.continueBtn}
                onPress={handleContinue}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.continueBtnText, { fontFamily: font.bold }]}
                >
                  {t("newPassword.continue")}
                </Text>
                <Ionicons
                  name={rtl ? "chevron-back" : "chevron-forward"}
                  size={scale(18)}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    width: "100%",
    ...Shadow.card,
  },
  successIconBox: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    borderWidth: scale(8),
    borderColor: "#99dfb3",
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    ...Shadow.soft,
  },
  successTitle: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: verticalScale(22),
    marginBottom: spacing.xl,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.success,
    borderRadius: Radius.full,
    height: verticalScale(52),
    width: "100%",
    gap: spacing.xs,
    ...Shadow.soft,
  },
  continueBtnText: { fontSize: FontSize.md, color: Colors.textInverse },
});
