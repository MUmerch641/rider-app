import type { ApiError } from "@/api";
import { Button, Input, PhoneInput } from "@/components/ui";
import { isRTL } from "@/constants/i18n";
import { Colors, FontSize, Radius } from "@/constants/theme";
import { useAuth } from "@/context";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, spacing, verticalScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";

const { width: SCREEN_W } = Dimensions.get("window");
const CIRCLE_SIZE = SCREEN_W * 0.4;

function RiderCircle() {
  return (
    <View style={styles.circleWrapper}>
      {/* Outer glow ring */}
      <View style={styles.glowRing} />

      {/* Gradient circle via SVG */}
      <Svg
        width={CIRCLE_SIZE}
        height={CIRCLE_SIZE}
        style={StyleSheet.absoluteFillObject}
      >
        <Defs>
          <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E0D0FF" />
            <Stop offset="1" stopColor="#C384FF" />
          </SvgGradient>
        </Defs>
        <Circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={CIRCLE_SIZE / 2}
          fill="url(#grad)"
        />
      </Svg>

      {/* Helmet image — adjust source to your asset path */}
      <Image
        source={require("@/assets/images/auth/rider_hat.png")}
        style={styles.helmetImage}
        resizeMode="contain"
      />
    </View>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const rtl = isRTL(i18n.language);
  const font = useAppFont();
  const { login } = useAuth();

  const [countryCode, setCountryCode] = useState("+964");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async () => {
    let valid = true;
    if (!phone) {
      setPhoneError(t("auth.phoneEmpty"));
      valid = false;
    } else if (phone.replace(/\D/g, "").length < 7) {
      setPhoneError(t("auth.phoneError"));
      valid = false;
    } else setPhoneError("");

    if (!password) {
      setPasswordError(t("auth.passwordEmpty"));
      valid = false;
    } else setPasswordError("");

    if (!valid) return;

    setLoginLoading(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const fullPhone = `${countryCode}${digits}`;
      await login({ phone: fullPhone, password });
      // RouteGuard in app/_layout.tsx will redirect once isAuthenticated flips.
      // Replace is kept as belt-and-suspenders for instant transition.
      router.replace("/(tabs)");
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.fields?.phone?.length) {
        setPhoneError(apiErr.fields.phone[0]);
      } else if (apiErr?.fields?.password?.length) {
        setPasswordError(apiErr.fields.password[0]);
      } else {
        setPasswordError(apiErr?.message || t("auth.passwordError"));
      }
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Top purple gradient hero area */}
      <LinearGradient
        colors={["#EAD9FF", "#F5EEFF", "#FFFFFF"]}
        locations={[0, 0.55, 1]}
        style={styles.hero}
      >
        <RiderCircle />
      </LinearGradient>

      {/* Form section */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
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

          <Input
            label={t("auth.password")}
            placeholder={t("auth.passwordPlace")}
            isPassword
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError("");
            }}
            error={passwordError}
            rtl={rtl}
          />

          {/* Gradient Login button */}
          <View style={styles.btnWrapper}>
            <LinearGradient
              colors={["#A855F7", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              <Button
                label={t("auth.login")}
                onPress={handleLogin}
                loading={loginLoading}
                style={styles.transparentBtn}
              />
            </LinearGradient>
          </View>

          <TouchableOpacity
            style={[styles.forgotRow, rtl && styles.forgotRowRTL]}
            onPress={() => router.push("/auth/forgetPassword_screen")}
          >
            <Text style={[styles.forgotText, { fontFamily: font.medium }]}>
              {t("auth.forgotPassword")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },

  /* ── Hero ── */
  hero: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: verticalScale(40),
    paddingBottom: verticalScale(24),
  },

  /* ── Rider circle ── */
  circleWrapper: {
    marginTop:verticalScale(90),
    marginBottom:verticalScale(30),
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7B4DD4",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 15.65,
    elevation: 6,
  },
  glowRing: {
    position: "absolute",
    width: CIRCLE_SIZE + scale(24),
    height: CIRCLE_SIZE + scale(24),
    borderRadius: (CIRCLE_SIZE + scale(24)) / 2,
    borderWidth: 5 ,
    borderColor: "#D3BCFF",
  },
  helmetImage: {
    marginTop:verticalScale(30),
    width: CIRCLE_SIZE * 1.2,
    height: CIRCLE_SIZE * 1.2,
    zIndex: 1,
  },

  /* ── Form ── */
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: "#fff",
  },
  form: {
    gap: spacing.sm,
  },

  /* ── Gradient button ── */
  btnWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: Radius.md,
    overflow: "hidden",
    // Shadow under button
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientBtn: {
    borderRadius: Radius.md,
  },
  transparentBtn: {
    backgroundColor: "transparent",
    shadowColor: "transparent",
    elevation: 0,
  },

  /* ── Forgot ── */
  forgotRow: {
    alignSelf: "flex-start",
  },
  forgotRowRTL: {
    alignSelf: "flex-end",
  },
  forgotText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});