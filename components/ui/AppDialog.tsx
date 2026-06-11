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
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────
type DialogTone = "info" | "success" | "error" | "warning";

interface DialogButton {
  label: string;
  onPress?: () => void;
  /** "primary" = filled accent, "secondary" = ghost. Default depends on count. */
  variant?: "primary" | "secondary" | "destructive";
}

export interface DialogOptions {
  title: string;
  message?: string;
  tone?: DialogTone;
  buttons?: DialogButton[];
}

interface DialogContextValue {
  /** Imperative drop-in replacement for Alert.alert. */
  show: (opts: DialogOptions) => void;
  hide: () => void;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

// ─── Tone → icon + color ────────────────────────────────────────────────────
const TONE_MAP: Record<
  DialogTone,
  { icon: keyof typeof Ionicons.glyphMap; tint: string; bg: string }
> = {
  info: { icon: "information-circle", tint: Colors.primary, bg: "#EEE7FB" },
  success: { icon: "checkmark-circle", tint: Colors.success, bg: Colors.successBg },
  error: { icon: "alert-circle", tint: Colors.danger, bg: Colors.dangerBg },
  warning: { icon: "warning", tint: "#F59E0B", bg: "#FEF3C7" },
};

// ─── Presentational dialog ────────────────────────────────────────────────────
function AppDialogView({
  options,
  onRequestClose,
}: {
  options: DialogOptions | null;
  onRequestClose: () => void;
}) {
  const font = useAppFont();
  const { t } = useTranslation();

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const [mounted, setMounted] = useState(false);

  const visible = !!options;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 6,
          speed: 16,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted && !visible) return null;

  const tone = TONE_MAP[options?.tone ?? "info"];
  const buttons: DialogButton[] =
    options?.buttons && options.buttons.length > 0
      ? options.buttons
      : [{ label: t("common.ok", "OK"), variant: "primary" }];

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.overlay,
          { opacity: overlayOpacity },
        ]}
      >
        {/* Backdrop tap dismisses (same as pressing the default button) */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />

        <Animated.View
          style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
        >
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
            <Ionicons name={tone.icon} size={moderateScale(30)} color={tone.tint} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { fontFamily: font.bold }]}>
            {options?.title}
          </Text>

          {/* Message */}
          {!!options?.message && (
            <Text style={[styles.message, { fontFamily: font.regular }]}>
              {options.message}
            </Text>
          )}

          {/* Buttons — native RTL mirrors the row automatically */}
          <View
            style={[
              styles.btnRow,
              { flexDirection: buttons.length > 2 ? "column" : "row" },
            ]}
          >
            {buttons.map((b, i) => {
              const variant =
                b.variant ?? (i === buttons.length - 1 ? "primary" : "secondary");
              const isPrimary = variant === "primary";
              const isDestructive = variant === "destructive";
              return (
                <Pressable
                  key={`${b.label}-${i}`}
                  onPress={() => {
                    onRequestClose();
                    b.onPress?.();
                  }}
                  style={({ pressed }) => [
                    styles.btn,
                    isPrimary && { backgroundColor: Colors.primary },
                    isDestructive && { backgroundColor: Colors.danger },
                    !isPrimary &&
                      !isDestructive && {
                        backgroundColor: "#F3F4F6",
                      },
                    buttons.length > 2 && styles.btnFullWidth,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.btnText,
                      {
                        fontFamily: font.semibold,
                        color:
                          isPrimary || isDestructive
                            ? "#FFFFFF"
                            : Colors.textSecondary,
                      },
                    ]}
                  >
                    {b.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Provider + hook ──────────────────────────────────────────────────────────
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<DialogOptions | null>(null);

  const show = useCallback((opts: DialogOptions) => setOptions(opts), []);
  const hide = useCallback(() => setOptions(null), []);

  return (
    <DialogContext.Provider value={{ show, hide }}>
      {children}
      <AppDialogView options={options} onRequestClose={hide} />
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within a DialogProvider");
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: scale(360),
    backgroundColor: Colors.card,
    borderRadius: scale(28),
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: scale(24),
    elevation: 24,
  },
  iconWrap: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xs,
    lineHeight: verticalScale(28),
  },
  message: {
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: verticalScale(20),
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  btnRow: {
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btn: {
    flex: 1,
    height: verticalScale(50),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  btnFullWidth: {
    flex: 0,
    width: "100%",
  },
  btnText: {
    fontSize: fontSize.md,
  },
});
