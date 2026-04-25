import { isRTL } from "@/constants/i18n";
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
  TouchableOpacity,
  View,
} from "react-native";

const CLOSE_REASONS = [
  "openStatus.reasonBusy",
  "openStatus.reasonIngredients",
  "openStatus.reasonTechnical",
  "openStatus.reasonPersonal",
  "openStatus.reasonOther",
];

interface CloseRestaurantModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ─── Animated Bottom Sheet ────────────────────────────────────────────────────
function AnimatedBottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(600)).current;
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
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
        setModalVisible(false);
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
      {/* Dark background — fades only */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: "rgba(0,0,0,0.45)", opacity: overlayOpacity },
        ]}
      />
      {/* Sheet — slides up only */}
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

// ─── Close Restaurant Modal ───────────────────────────────────────────────────
export function CloseRestaurantModal({
  visible,
  onConfirm,
  onCancel,
}: CloseRestaurantModalProps) {
  const font = useAppFont();
  const { t, i18n } = useTranslation();
  const rtl = isRTL(i18n.language);

  const [selectedReason, setSelectedReason] = useState<string>("");
  const [detailedReason, setDetailedReason] = useState("");

  const handleConfirm = () => {
    onConfirm();
    setSelectedReason("");
    setDetailedReason("");
  };

  const handleCancel = () => {
    onCancel();
    setSelectedReason("");
    setDetailedReason("");
  };

  return (
    <AnimatedBottomSheet visible={visible} onClose={handleCancel}>
      {/* Tap outside to dismiss */}
      <Pressable style={{ flex: 1 }} onPress={handleCancel} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Pressable stops taps from bubbling to backdrop */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Power icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="power" size={moderateScale(26)} color="#E53935" />
          </View>

          {/* Title */}
          <Text
            style={[
              styles.title,
              { fontFamily: font.bold, textAlign: "center" },
            ]}
          >
            {t("openStatus.closeTitle")}
          </Text>

          {/* Subtitle */}
          <Text
            style={[
              styles.subtitle,
              { fontFamily: font.regular, textAlign: "center" },
            ]}
          >
            {t("openStatus.closeSubtitle")}
          </Text>

          {/* Reason chips */}
          <View
            style={[
              styles.chipsWrap,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            {CLOSE_REASONS.map((key) => {
              const active = selectedReason === key;
              const isOther = key === "openStatus.reasonOther";
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setSelectedReason(active ? "" : key)}
                  activeOpacity={0.75}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  {isOther && !active && (
                    <Ionicons
                      name="add"
                      size={moderateScale(13)}
                      color={Colors.textSecondary}
                      style={{ marginRight: scale(3) }}
                    />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      { fontFamily: active ? font.semibold : font.regular },
                      active && styles.chipTextActive,
                    ]}
                  >
                    {t(key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Detailed reason label */}
          <Text
            style={[
              styles.detailLabel,
              {
                fontFamily: font.semibold,
                textAlign: rtl ? "right" : "left",
              },
            ]}
          >
            {t("openStatus.detailedReason")}
          </Text>

          {/* Textarea */}
          <TextInput
            value={detailedReason}
            onChangeText={setDetailedReason}
            placeholder={t("openStatus.detailedPlaceholder")}
            placeholderTextColor={Colors.textMuted}
            multiline
            style={[
              styles.textarea,
              {
                fontFamily: font.regular,
                textAlign: rtl ? "right" : "left",
              },
            ]}
          />

          {/* Confirm button */}
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Ionicons
              name="checkmark-circle"
              size={moderateScale(20)}
              color="#fff"
              style={{ marginRight: scale(6) }}
            />
            <Text style={[styles.confirmText, { fontFamily: font.semibold }]}>
              {t("openStatus.confirmClose")}
            </Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            onPress={handleCancel}
            activeOpacity={0.7}
            style={styles.cancelBtn}
          >
            <Text style={[styles.cancelText, { fontFamily: font.semibold }]}>
              {t("openStatus.cancel")}
            </Text>
          </TouchableOpacity>
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
    backgroundColor: "#FFEBEE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    color: "#1a0a2e",
    marginBottom: spacing.sm,
    lineHeight: verticalScale(30),
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: verticalScale(20),
    paddingHorizontal: spacing.sm,
  },
  chipsWrap: {
    flexWrap: "wrap",
    gap: spacing.sm,
    width: "100%",
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: "#F3F4F6",
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: fontSize.md,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: "#fff",
  },
  detailLabel: {
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
    minHeight: verticalScale(100),
    textAlignVertical: "top",
    marginBottom: spacing.lg,
  },
  confirmBtn: {
    width: "100%",
    height: verticalScale(52),
    backgroundColor: "#111827",
    borderRadius: radius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  confirmText: {
    fontSize: fontSize.md,
    color: "#fff",
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontSize: fontSize.md,
    color: Colors.textSecondary,
  },
});
