import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Country Data ─────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "+93", flag: "🇦🇫", name: "Afghanistan" },
  { code: "+355", flag: "🇦🇱", name: "Albania" },
  { code: "+213", flag: "🇩🇿", name: "Algeria" },
  { code: "+376", flag: "🇦🇩", name: "Andorra" },
  { code: "+244", flag: "🇦🇴", name: "Angola" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "+374", flag: "🇦🇲", name: "Armenia" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+43", flag: "🇦🇹", name: "Austria" },
  { code: "+994", flag: "🇦🇿", name: "Azerbaijan" },
  { code: "+973", flag: "🇧🇭", name: "Bahrain" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+375", flag: "🇧🇾", name: "Belarus" },
  { code: "+32", flag: "🇧🇪", name: "Belgium" },
  { code: "+501", flag: "🇧🇿", name: "Belize" },
  { code: "+229", flag: "🇧🇯", name: "Benin" },
  { code: "+975", flag: "🇧🇹", name: "Bhutan" },
  { code: "+591", flag: "🇧🇴", name: "Bolivia" },
  { code: "+387", flag: "🇧🇦", name: "Bosnia" },
  { code: "+55", flag: "🇧🇷", name: "Brazil" },
  { code: "+673", flag: "🇧🇳", name: "Brunei" },
  { code: "+359", flag: "🇧🇬", name: "Bulgaria" },
  { code: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "+257", flag: "🇧🇮", name: "Burundi" },
  { code: "+855", flag: "🇰🇭", name: "Cambodia" },
  { code: "+237", flag: "🇨🇲", name: "Cameroon" },
  { code: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "+236", flag: "🇨🇫", name: "Central African Republic" },
  { code: "+235", flag: "🇹🇩", name: "Chad" },
  { code: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "+242", flag: "🇨🇬", name: "Congo" },
  { code: "+506", flag: "🇨🇷", name: "Costa Rica" },
  { code: "+385", flag: "🇭🇷", name: "Croatia" },
  { code: "+53", flag: "🇨🇺", name: "Cuba" },
  { code: "+357", flag: "🇨🇾", name: "Cyprus" },
  { code: "+420", flag: "🇨🇿", name: "Czech Republic" },
  { code: "+45", flag: "🇩🇰", name: "Denmark" },
  { code: "+253", flag: "🇩🇯", name: "Djibouti" },
  { code: "+1", flag: "🇩🇴", name: "Dominican Republic" },
  { code: "+593", flag: "🇪🇨", name: "Ecuador" },
  { code: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "+503", flag: "🇸🇻", name: "El Salvador" },
  { code: "+251", flag: "🇪🇹", name: "Ethiopia" },
  { code: "+679", flag: "🇫🇯", name: "Fiji" },
  { code: "+358", flag: "🇫🇮", name: "Finland" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+241", flag: "🇬🇦", name: "Gabon" },
  { code: "+220", flag: "🇬🇲", name: "Gambia" },
  { code: "+995", flag: "🇬🇪", name: "Georgia" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "+30", flag: "🇬🇷", name: "Greece" },
  { code: "+502", flag: "🇬🇹", name: "Guatemala" },
  { code: "+224", flag: "🇬🇳", name: "Guinea" },
  { code: "+592", flag: "🇬🇾", name: "Guyana" },
  { code: "+509", flag: "🇭🇹", name: "Haiti" },
  { code: "+504", flag: "🇭🇳", name: "Honduras" },
  { code: "+852", flag: "🇭🇰", name: "Hong Kong" },
  { code: "+36", flag: "🇭🇺", name: "Hungary" },
  { code: "+354", flag: "🇮🇸", name: "Iceland" },
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "+98", flag: "🇮🇷", name: "Iran" },
  { code: "+964", flag: "🇮🇶", name: "Iraq" },
  { code: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "+972", flag: "🇮🇱", name: "Israel" },
  { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+225", flag: "🇨🇮", name: "Ivory Coast" },
  { code: "+1876", flag: "🇯🇲", name: "Jamaica" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+962", flag: "🇯🇴", name: "Jordan" },
  { code: "+7", flag: "🇰🇿", name: "Kazakhstan" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "+996", flag: "🇰🇬", name: "Kyrgyzstan" },
  { code: "+856", flag: "🇱🇦", name: "Laos" },
  { code: "+371", flag: "🇱🇻", name: "Latvia" },
  { code: "+961", flag: "🇱🇧", name: "Lebanon" },
  { code: "+266", flag: "🇱🇸", name: "Lesotho" },
  { code: "+231", flag: "🇱🇷", name: "Liberia" },
  { code: "+218", flag: "🇱🇾", name: "Libya" },
  { code: "+423", flag: "🇱🇮", name: "Liechtenstein" },
  { code: "+370", flag: "🇱🇹", name: "Lithuania" },
  { code: "+352", flag: "🇱🇺", name: "Luxembourg" },
  { code: "+853", flag: "🇲🇴", name: "Macau" },
  { code: "+261", flag: "🇲🇬", name: "Madagascar" },
  { code: "+265", flag: "🇲🇼", name: "Malawi" },
  { code: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "+960", flag: "🇲🇻", name: "Maldives" },
  { code: "+223", flag: "🇲🇱", name: "Mali" },
  { code: "+356", flag: "🇲🇹", name: "Malta" },
  { code: "+222", flag: "🇲🇷", name: "Mauritania" },
  { code: "+230", flag: "🇲🇺", name: "Mauritius" },
  { code: "+52", flag: "🇲🇽", name: "Mexico" },
  { code: "+373", flag: "🇲🇩", name: "Moldova" },
  { code: "+976", flag: "🇲🇳", name: "Mongolia" },
  { code: "+382", flag: "🇲🇪", name: "Montenegro" },
  { code: "+212", flag: "🇲🇦", name: "Morocco" },
  { code: "+258", flag: "🇲🇿", name: "Mozambique" },
  { code: "+95", flag: "🇲🇲", name: "Myanmar" },
  { code: "+264", flag: "🇳🇦", name: "Namibia" },
  { code: "+977", flag: "🇳🇵", name: "Nepal" },
  { code: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "+64", flag: "🇳🇿", name: "New Zealand" },
  { code: "+505", flag: "🇳🇮", name: "Nicaragua" },
  { code: "+227", flag: "🇳🇪", name: "Niger" },
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+389", flag: "🇲🇰", name: "North Macedonia" },
  { code: "+47", flag: "🇳🇴", name: "Norway" },
  { code: "+968", flag: "🇴🇲", name: "Oman" },
  { code: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "+507", flag: "🇵🇦", name: "Panama" },
  { code: "+675", flag: "🇵🇬", name: "Papua New Guinea" },
  { code: "+595", flag: "🇵🇾", name: "Paraguay" },
  { code: "+51", flag: "🇵🇪", name: "Peru" },
  { code: "+63", flag: "🇵🇭", name: "Philippines" },
  { code: "+48", flag: "🇵🇱", name: "Poland" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "+40", flag: "🇷🇴", name: "Romania" },
  { code: "+7", flag: "🇷🇺", name: "Russia" },
  { code: "+250", flag: "🇷🇼", name: "Rwanda" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+221", flag: "🇸🇳", name: "Senegal" },
  { code: "+381", flag: "🇷🇸", name: "Serbia" },
  { code: "+232", flag: "🇸🇱", name: "Sierra Leone" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+421", flag: "🇸🇰", name: "Slovakia" },
  { code: "+386", flag: "🇸🇮", name: "Slovenia" },
  { code: "+252", flag: "🇸🇴", name: "Somalia" },
  { code: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "+211", flag: "🇸🇸", name: "South Sudan" },
  { code: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "+94", flag: "🇱🇰", name: "Sri Lanka" },
  { code: "+249", flag: "🇸🇩", name: "Sudan" },
  { code: "+597", flag: "🇸🇷", name: "Suriname" },
  { code: "+268", flag: "🇸🇿", name: "Swaziland" },
  { code: "+46", flag: "🇸🇪", name: "Sweden" },
  { code: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "+963", flag: "🇸🇾", name: "Syria" },
  { code: "+886", flag: "🇹🇼", name: "Taiwan" },
  { code: "+992", flag: "🇹🇯", name: "Tajikistan" },
  { code: "+255", flag: "🇹🇿", name: "Tanzania" },
  { code: "+66", flag: "🇹🇭", name: "Thailand" },
  { code: "+228", flag: "🇹🇬", name: "Togo" },
  { code: "+216", flag: "🇹🇳", name: "Tunisia" },
  { code: "+90", flag: "🇹🇷", name: "Turkey" },
  { code: "+993", flag: "🇹🇲", name: "Turkmenistan" },
  { code: "+256", flag: "🇺🇬", name: "Uganda" },
  { code: "+380", flag: "🇺🇦", name: "Ukraine" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+598", flag: "🇺🇾", name: "Uruguay" },
  { code: "+998", flag: "🇺🇿", name: "Uzbekistan" },
  { code: "+58", flag: "🇻🇪", name: "Venezuela" },
  { code: "+84", flag: "🇻🇳", name: "Vietnam" },
  { code: "+967", flag: "🇾🇪", name: "Yemen" },
  { code: "+260", flag: "🇿🇲", name: "Zambia" },
  { code: "+263", flag: "🇿🇼", name: "Zimbabwe" },
];

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  prefix?: string;
  borderColor?: string;
  rtl?: boolean;
}

export function Input({
  label,
  error,
  iconLeft,
  iconRight,
  isPassword = false,
  containerStyle,
  prefix,
  borderColor,
  rtl = false,
  ...props
}: InputProps) {
  const font = useAppFont();
  const [visible, setVisible] = useState(false);
  const hasError = !!error;
  const align = rtl ? "right" : "left";
  const row = rtl ? "row-reverse" : "row";

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text
          style={[styles.label, { textAlign: align, fontFamily: font.medium }]}
        >
          {label}
        </Text>
      )}
      <View
        style={[
          styles.container,
          { flexDirection: row },
          hasError && styles.containerError,
          borderColor ? { borderColor, borderWidth: 1.5 } : null,
          props.editable === false && styles.containerDisabled,
        ]}
      >
        {prefix && (
          <View style={styles.prefixBox}>
            <Text style={[styles.prefixText, { fontFamily: font.medium }]}>
              {prefix}
            </Text>
          </View>
        )}
        {iconLeft && <View style={styles.iconLeft}>{iconLeft}</View>}
        <TextInput
          {...props}
          secureTextEntry={isPassword && !visible}
          style={[
            styles.input,
            { textAlign: align, fontFamily: font.regular },
            props.style,
          ]}
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
        />
        {isPassword ? (
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            style={styles.iconRight}
          >
            <Ionicons
              name={visible ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        ) : iconRight ? (
          <View style={styles.iconRight}>{iconRight}</View>
        ) : null}
      </View>
      {hasError && (
        <Text
          style={[
            styles.errorText,
            { textAlign: align, fontFamily: font.regular },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

// ─── Country Picker Modal ─────────────────────────────────────────────────────
interface CountryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
}

function CountryPicker({ visible, onClose, onSelect }: CountryPickerProps) {
  const font = useAppFont();
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search),
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={pickerStyles.overlay}>
        <SafeAreaView style={pickerStyles.sheet}>
          <View style={pickerStyles.header}>
            <Text style={[pickerStyles.title, { fontFamily: font.semibold }]}>
              {t("auth.selectCountry")}
            </Text>
            <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={pickerStyles.searchBox}>
            <Ionicons
              name="search-outline"
              size={18}
              color={Colors.textMuted}
              style={{ marginRight: Spacing.sm }}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("auth.searchCountry")}
              placeholderTextColor={Colors.textMuted}
              style={[pickerStyles.searchInput, { fontFamily: font.regular }]}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item, i) => `${item.code}-${item.name}-${i}`}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={pickerStyles.item}
                onPress={() => {
                  onSelect(item.code);
                  onClose();
                  setSearch("");
                }}
                activeOpacity={0.7}
              >
                <Text style={pickerStyles.flag}>{item.flag}</Text>
                <Text
                  style={[
                    pickerStyles.countryName,
                    { fontFamily: font.regular },
                  ]}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    pickerStyles.countryCode,
                    { fontFamily: font.medium },
                  ]}
                >
                  {item.code}
                </Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => (
              <View style={pickerStyles.separator} />
            )}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Phone Input ──────────────────────────────────────────────────────────────
interface PhoneInputProps {
  countryCode: string;
  phone: string;
  onChangeCode: (v: string) => void;
  onChangePhone: (v: string) => void;
  error?: string;
  label?: string;
  rtl?: boolean;
}

export function PhoneInput({
  countryCode,
  phone,
  onChangeCode,
  onChangePhone,
  error,
  label,
  rtl = false,
}: PhoneInputProps) {
  const font = useAppFont();
  const [pickerVisible, setPickerVisible] = useState(false);
  const align = rtl ? "right" : "left";
  const row = rtl ? "row-reverse" : "row";
  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode);
  const { t } = useTranslation();

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text
          style={[styles.label, { textAlign: align, fontFamily: font.medium }]}
        >
          {label}
        </Text>
      )}
      <View style={[styles.phoneRow, { flexDirection: row }]}>
        <TouchableOpacity
          style={[
            styles.container,
            styles.codeBox,
            !!error && styles.containerError,
          ]}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.flagText}>{selectedCountry?.flag ?? "🌐"}</Text>
          <Text style={[styles.codeText, { fontFamily: font.medium }]}>
            {countryCode}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
        </TouchableOpacity>
        <View
          style={[
            styles.container,
            styles.phoneBox,
            !!error && styles.containerError,
          ]}
        >
          <TextInput
            value={phone}
            onChangeText={onChangePhone}
            style={[
              styles.input,
              { textAlign: align, fontFamily: font.regular },
            ]}
            keyboardType="phone-pad"
            placeholderTextColor={Colors.textMuted}
            placeholder={t("auth.phone")}
          />
        </View>
      </View>
      {!!error && (
        <Text
          style={[
            styles.errorText,
            { textAlign: align, fontFamily: font.regular },
          ]}
        >
          {error}
        </Text>
      )}
      <CountryPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={onChangeCode}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.inputBg,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  containerError: { borderColor: Colors.danger, backgroundColor: "#FFF5F5" },
  containerDisabled: { opacity: 0.6 },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    height: "100%",
  },
  prefixBox: {
    paddingRight: Spacing.sm,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    marginRight: Spacing.sm,
  },
  prefixText: { fontSize: FontSize.md, color: Colors.textSecondary },
  iconLeft: { marginRight: Spacing.sm },
  iconRight: { marginLeft: Spacing.sm },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
  phoneRow: { flexDirection: "row", gap: Spacing.sm },
  codeBox: { flex: 0, paddingHorizontal: Spacing.sm, gap: 4, minWidth: 90 },
  phoneBox: { flex: 1 },
  flagText: { fontSize: 18 },
  codeText: { fontSize: FontSize.sm, color: Colors.textPrimary },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: "80%",
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  title: { fontSize: FontSize.lg, color: Colors.textPrimary },
  closeBtn: { padding: Spacing.xs },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.md,
  },
  flag: { fontSize: 22 },
  countryName: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  countryCode: { fontSize: FontSize.sm, color: Colors.textMuted },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.lg,
  },
});
