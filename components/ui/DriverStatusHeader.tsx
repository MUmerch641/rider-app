import { isRTL } from "@/constants/i18n";
import { useAppFont } from "@/hooks/useAppFont";
import { fontSize, scale, verticalScale } from "@/utils/responsive";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, View } from "react-native";
import { OpenStatusToggle } from "./OpenStatusToggle";

type DriverStatusHeaderProps = {
  name: string;
  avatar: string;
  earnings: string;
  isOnline?: boolean;
  onToggleStatus?: () => void;
};

export default function DriverStatusHeader({
  name,
  avatar,
  earnings,
  isOnline = true,
  onToggleStatus,
}: DriverStatusHeaderProps) {
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = isRTL(i18n.language);
  const [isOpen, setIsOpen] = useState(true);

  const handleToggle = (value: boolean) => {
    setIsOpen(value);
  };
  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          { flexDirection: rtl ? "row-reverse" : "row" },
        ]}
      >
        <View
          style={[
            styles.leftSection,
            { flexDirection: rtl ? "row-reverse" : "row" },
          ]}
        >
          <View style={styles.avatarWrap}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
            <View style={styles.onlineDot} />
          </View>

          <View
            style={[
              styles.infoBox,
              { alignItems: rtl ? "flex-end" : "flex-start" },
            ]}
          >
            <Text style={[styles.name, { fontFamily: font.regular }]}>
              {name}
            </Text>
            <Text style={[styles.status, { fontFamily: font.bold }]}>
              {isOnline ? t("driver.online") : t("driver.offline")}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.rightSection,
            { alignItems: rtl ? "flex-start" : "flex-end" },
          ]}
        >
          <Text
            style={[
              styles.earningsLabel,
              {
                fontFamily: font.bold,
                letterSpacing: rtl ? 0 : 1.5,
                textAlign: rtl ? "right" : "left",
              },
            ]}
          >
            {t("driver.earningsToday")}
          </Text>
          <Text style={[styles.earnings, { fontFamily: font.bold }]}>
            {earnings}
            {t("common.iqd")}
          </Text>
        </View>

        <OpenStatusToggle isOpen={isOpen} onToggle={handleToggle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    paddingHorizontal: scale(14),
  },
  container: {
    width: "100%",
    minHeight: verticalScale(85),
    backgroundColor: "#ffffffec",
    borderColor: "#fff",
    borderWidth: 1,
    borderRadius: scale(60),
    alignItems: "center",
    paddingLeft: scale(14),
    paddingRight: scale(14),
    marginTop: scale(20),
  },
  leftSection: {
    alignItems: "center",
    flex: 1.1,
  },
  avatarWrap: {
    width: scale(47),
    height: scale(47),
    borderRadius: scale(24),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
  },
  onlineDot: {
    position: "absolute",
    right: scale(-2),
    bottom: scale(1),
    width: scale(13),
    height: scale(13),
    borderRadius: scale(7),
    backgroundColor: "#00C853",
    borderWidth: scale(1),
    borderColor: "#FFFFFF",
  },
  infoBox: {
    marginHorizontal: scale(14),
    justifyContent: "center",
  },
  name: {
    fontSize: fontSize.sm,
    color: "#6E4E82",
    marginBottom: verticalScale(4),
  },
  status: {
    fontSize: scale(14),
    color: "#241933",
  },
  rightSection: {
    flex: 1,
    justifyContent: "center",
  },
  earningsLabel: {
    fontSize: scale(10),
    color: "#6E4E82",
    textTransform: "uppercase",
    marginHorizontal: scale(14),
    marginBottom: scale(6),
  },
  earnings: {
    fontSize: scale(16),
    color: "#00C853",
    marginHorizontal: scale(14),
  },
});
