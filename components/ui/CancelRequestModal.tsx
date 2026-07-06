import { Colors } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import {
  fontSize,
  moderateScale,
  radius,
  scale,
  spacing,
  verticalScale,
} from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { CancelRequestReason } from "@/api/types";

// Preset reasons — keys map 1:1 to the backend DRIVER_CANCEL_REQUEST_REASONS.
const REASONS: { key: CancelRequestReason; i18nKey: string; fallback: string }[] =
  [
    { key: "too_far", i18nKey: "cancelRequest.tooFar", fallback: "Too far" },
    {
      key: "vehicle_issue",
      i18nKey: "cancelRequest.vehicleIssue",
      fallback: "Vehicle issue",
    },
    {
      key: "customer_unreachable",
      i18nKey: "cancelRequest.customerUnreachable",
      fallback: "Customer unreachable",
    },
    {
      key: "store_closed",
      i18nKey: "cancelRequest.storeClosed",
      fallback: "Restaurant closed",
    },
    { key: "other", i18nKey: "cancelRequest.other", fallback: "Other" },
  ];

interface CancelRequestModalProps {
  visible: boolean;
  submitting?: boolean;
  onSubmit: (reason: CancelRequestReason, note: string) => void;
  onClose: () => void;
  // Fires once the sheet's native <Modal> has FULLY unmounted (after the close
  // animation). The caller uses this to present a follow-up dialog without ever
  // having two RN <Modal>s on screen at once — presenting one while another is
  // still dismissing deadlocks UIKit on iOS and freezes the whole app.
  onClosed?: () => void;
}

// ─── Animated Bottom Sheet (mirrors CloseRestaurantModal) ─────────────────────
function AnimatedBottomSheet({
  visible,
  onClose,
  onClosed,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  onClosed?: () => void;
  children: React.ReactNode;
}) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(600)).current;
  const [modalVisible, setModalVisible] = useState(false);
  // Tracks whether we actually opened, so onClosed only fires after a real
  // open→close cycle (not on the initial mount where visible starts false).
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (visible) {
      wasVisibleRef.current = true;
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 600,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Unmount the native <Modal> FIRST, then signal "fully closed" so the
        // caller can safely present a follow-up modal/dialog with no overlap.
        setModalVisible(false);
        if (wasVisibleRef.current) {
          wasVisibleRef.current = false;
          onClosed?.();
        }
      });
    }
  }, [visible]);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: "rgba(0,0,0,0.45)", opacity: overlayOpacity },
        ]}
      />
      <Animated.View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          transform: [{ translateY }],
        }}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}

export function CancelRequestModal({
  visible,
  submitting,
  onSubmit,
  onClose,
  onClosed,
}: CancelRequestModalProps) {
  const font = useAppFont();
  const { t } = useTranslation();

  const [selected, setSelected] = useState<CancelRequestReason | null>(null);
  const [note, setNote] = useState("");

  // Reset when the sheet closes so a re-open starts fresh.
  useEffect(() => {
    if (!visible) {
      setSelected(null);
      setNote("");
    }
  }, [visible]);

  const canSubmit = !!selected && !submitting;

  return (
    <AnimatedBottomSheet visible={visible} onClose={onClose} onClosed={onClosed}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons
              name="alert-circle"
              size={moderateScale(26)}
              color="#F59E0B"
            />
          </View>

          {/* Title + subtitle */}
          <Text style={[styles.title, { fontFamily: font.bold }]}>
            {t("cancelRequest.title", "Request Cancellation")}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: font.regular }]}>
            {t(
              "cancelRequest.subtitle",
              "Support will be notified and reassign this order. Pick a reason:",
            )}
          </Text>

          {/* Reason chips — native RTL mirrors the row automatically */}
          <View style={[styles.chipsWrap, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
            {REASONS.map(({ key, i18nKey, fallback }) => {
              const active = selected === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setSelected(active ? null : key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { fontFamily: active ? font.semibold : font.regular },
                      active && styles.chipTextActive,
                    ]}
                  >
                    {t(i18nKey, fallback)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Optional note */}
          <Text style={[styles.noteLabel, { fontFamily: font.semibold, textAlign: font.rtl ? "right" : "left" }]}>
            {t("cancelRequest.noteLabel", "DETAILS (OPTIONAL)")}
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t("cancelRequest.notePlaceholder", "Add any details…")}
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
            style={[styles.textarea, { fontFamily: font.regular, textAlign: font.rtl ? "right" : "left" }]}
          />

          {/* Submit */}
          <Pressable
            disabled={!canSubmit}
            onPress={() => selected && onSubmit(selected, note.trim())}
            style={[styles.submitBtn, { flexDirection: font.rtl ? "row-reverse" : "row" }, !canSubmit && { opacity: 0.5 }]}
          >
            <Ionicons
              name="paper-plane"
              size={moderateScale(18)}
              color="#fff"
              style={{ marginRight: font.rtl ? 0 : scale(6), marginLeft: font.rtl ? scale(6) : 0 }}
            />
            <Text style={[styles.submitText, { fontFamily: font.semibold }]}>
              {submitting
                ? t("cancelRequest.sending", "Sending…")
                : t("cancelRequest.send", "Send Request")}
            </Text>
          </Pressable>

          {/* Cancel */}
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { fontFamily: font.semibold }]}>
              {t("common.cancel", "Cancel")}
            </Text>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </AnimatedBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: verticalScale(36),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: scale(12),
    elevation: 20,
  },
  handle: {
    width: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: "#E0E0E0",
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  iconWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    color: "#1a0a2e",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: "center",
    lineHeight: verticalScale(20),
    paddingHorizontal: spacing.sm,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    width: "100%",
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: "#F3F4F6",
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: fontSize.md, color: Colors.textSecondary },
  chipTextActive: { color: "#fff" },
  noteLabel: {
    width: "100%",
    fontSize: fontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  textarea: {
    width: "100%",
    backgroundColor: "#F3F4F6",
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: Colors.textPrimary,
    minHeight: verticalScale(80),
    textAlignVertical: "top",
    marginBottom: spacing.lg,
  },
  submitBtn: {
    width: "100%",
    height: verticalScale(52),
    backgroundColor: Colors.primary,
    borderRadius: radius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  submitText: { fontSize: fontSize.md, color: "#fff" },
  cancelBtn: { paddingVertical: spacing.sm },
  cancelText: { fontSize: fontSize.md, color: Colors.textSecondary },
});
