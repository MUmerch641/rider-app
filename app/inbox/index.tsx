import { isRTL } from "@/constants/i18n";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import {
    fontSize,
    radius,
    scale,
    spacing,
    verticalScale,
} from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type InboxTab = "notification" | "support";

const AVATAR = "https://i.pravatar.cc/150?img=12";

const NOTIFICATIONS = [
  {
    id: "1",
    group: "inbox.today",
    items: [
      {
        id: "n1",
        title: "Onway Team Support",
        body: "A new version of the app is available please update",
        time: "26 min ago",
        unread: true,
      },
      {
        id: "n2",
        title: "Onway Team Support",
        body: "A new version of the app is available please update",
        time: "26 min ago",
        unread: true,
      },
      {
        id: "n3",
        title: "Onway Team Support",
        body: "A new version of the app is available please update",
        time: "26 min ago",
        unread: false,
      },
    ],
  },
  {
    id: "2",
    group: "inbox.yesterday",
    items: [
      {
        id: "n4",
        title: "Onway Team Support",
        body: "A new version of the app is available please update",
        time: "26 min ago",
        unread: true,
      },
      {
        id: "n5",
        title: "Onway Team Support",
        body: "A new version of the app is available please update",
        time: "26 min ago",
        unread: true,
      },
      {
        id: "n6",
        title: "Onway Team Support",
        body: "A new version of the app is available please update",
        time: "26 min ago",
        unread: false,
      },
      {
        id: "n7",
        title: "Onway Team Support",
        body: "A new version of the app is available please update",
        time: "26 min ago",
        unread: false,
      },
    ],
  },
];

const CHATS = [
  {
    id: "c1",
    title: "Onway Support",
    body: "Your food delivery problem has been resolved",
    date: "13 - 5 - 2026",
    active: false,
  },
  {
    id: "c2",
    title: "Onway Support",
    body: "Your food delivery problem has been resolved",
    date: "13 - 5 - 2026",
    active: true,
  },
  {
    id: "c3",
    title: "Onway Support",
    body: "Your food delivery problem has been resolved",
    date: "13 - 5 - 2026",
    active: false,
  },
  {
    id: "c4",
    title: "Onway Support",
    body: "Your food delivery problem has been resolved",
    date: "13 - 5 - 2026",
    active: false,
  },
  {
    id: "c5",
    title: "Onway Support",
    body: "Your food delivery problem has been resolved",
    date: "13 - 5 - 2026",
    active: false,
  },
];

const CHAT_GROUPS = [
  { id: "g1", group: "inbox.today", items: CHATS.slice(0, 2) },
  { id: "g2", group: "inbox.yesterday", items: CHATS.slice(2) },
];

export default function InboxScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = isRTL(i18n.language);
  const [activeTab, setActiveTab] = useState<InboxTab>("notification");

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* ── Tab Switcher ── */}
      <View
        style={[styles.tabRow, { flexDirection: rtl ? "row-reverse" : "row" }]}
      >
        <TabBtn
          label={t("inbox.notification")}
          active={activeTab === "notification"}
          onPress={() => setActiveTab("notification")}
          font={font}
        />
        <TabBtn
          label={t("inbox.supportChat")}
          active={activeTab === "support"}
          onPress={() => setActiveTab("support")}
          font={font}
        />
      </View>

      {/* ── Notification Tab ── */}
      {activeTab === "notification" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {NOTIFICATIONS.map((group) => (
            <View key={group.id}>
              <Text
                style={[
                  styles.groupLabel,
                  {
                    fontFamily: font.medium,
                    textAlign: rtl ? "right" : "left",
                  },
                ]}
              >
                {t(group.group)}
              </Text>
              <View style={styles.group}>
                {group.items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.card,
                      { flexDirection: rtl ? "row-reverse" : "row" },
                    ]}
                    activeOpacity={0.75}
                  >
                    <Image source={{ uri: AVATAR }} style={styles.avatar} />
                    <View
                      style={[
                        styles.cardContent,
                        { alignItems: rtl ? "flex-end" : "flex-start" },
                      ]}
                    >
                      <View
                        style={[
                          styles.cardTopRow,
                          { flexDirection: rtl ? "row-reverse" : "row" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cardTitle,
                            {
                              fontFamily: font.semibold,
                              textAlign: rtl ? "right" : "left",
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[
                            styles.cardTime,
                            {
                              fontFamily: font.regular,
                              marginLeft: rtl ? 0 : spacing.sm,
                              marginRight: rtl ? spacing.sm : 0,
                            },
                          ]}
                        >
                          {item.time}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.cardBottomRow,
                          { flexDirection: rtl ? "row-reverse" : "row" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cardBody,

                            {
                              fontFamily: font.regular,
                              textAlign: rtl ? "right" : "left",
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {item.body}
                        </Text>
                        {item.unread && (
                          <View
                            style={[
                              styles.unreadDot,
                              {
                                marginLeft: rtl ? 0 : spacing.sm,
                                marginRight: rtl ? spacing.sm : 0,
                              },
                            ]}
                          />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Support Chat Tab ── */}
      {activeTab === "support" && (
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {CHAT_GROUPS.map((group) => (
              <View key={group.id}>
                <Text
                  style={[
                    styles.groupLabel,
                    {
                      fontFamily: font.medium,
                      textAlign: rtl ? "right" : "left",
                    },
                  ]}
                >
                  {t(group.group)}
                </Text>
                <View style={styles.group}>
                  {group.items.map((chat) => (
                    <TouchableOpacity
                      key={chat.id}
                      style={[
                        styles.card,
                        chat.active && styles.cardActive,
                        { flexDirection: rtl ? "row-reverse" : "row" },
                      ]}
                      activeOpacity={0.75}
                      onPress={() => router.push("/inbox/support_chat")}
                    >
                      <View style={styles.avatarWrapper}>
                        <Image source={{ uri: AVATAR }} style={styles.avatar} />
                        {chat.active && (
                          <View
                            style={[
                              styles.onlineDot,
                              rtl ? styles.onlineDotRTL : styles.onlineDotLTR,
                            ]}
                          />
                        )}
                      </View>
                      <View
                        style={[
                          styles.cardContent,
                          { alignItems: rtl ? "flex-end" : "flex-start" },
                        ]}
                      >
                        <View
                          style={[
                            styles.cardTopRow,
                            { flexDirection: rtl ? "row-reverse" : "row" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.cardTitle,

                              {
                                fontFamily: font.semibold,
                                textAlign: rtl ? "right" : "left",
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {chat.title}
                          </Text>
                          <Text
                            style={[
                              styles.cardTime,
                              {
                                fontFamily: font.regular,
                                marginLeft: rtl ? 0 : spacing.sm,
                                marginRight: rtl ? spacing.sm : 0,
                              },
                            ]}
                          >
                            {chat.date}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.cardBody,
                            {
                              fontFamily: font.regular,
                              textAlign: rtl ? "right" : "left",
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {chat.body}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            <View style={{ height: verticalScale(100) }} />
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabBtn({
  label,
  active,
  onPress,
  font,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  font: ReturnType<typeof useAppFont>;
}) {
  if (active) {
    return (
      <LinearGradient
        colors={["#BC99FF", "#8140FF", "#BA97FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.tabActive}
      >
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.85}
          style={styles.tabInner}
        >
          <Text style={[styles.tabLabelActive, { fontFamily: font.semibold }]}>
            {label}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.tabInactive}
    >
      <Text style={[styles.tabLabelInactive, { fontFamily: font.medium }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Tabs
  tabRow: {
    marginTop: verticalScale(30),

    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: "#f5f4f87e",
    borderRadius: radius.full,
    marginHorizontal: spacing.md,
  },
  tabActive: {
    flex: 1,
    borderRadius: Radius.full,
    height: verticalScale(46),
    overflow: "hidden",
  },
  tabInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabInactive: {
    flex: 1,
    height: verticalScale(46),
    borderRadius: Radius.full,
    backgroundColor: Colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabelActive: { fontSize: fontSize.md, color: Colors.textInverse },
  tabLabelInactive: { fontSize: fontSize.md, color: Colors.textSecondary },

  // Shared scroll
  scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },

  // Group
  groupLabel: {
    fontSize: fontSize.md,
    color: Colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  group: { gap: spacing.sm },

  // Shared card
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: "flex-start",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: Colors.inputBg,
  },
  cardActive: {
    backgroundColor: "#F2E9FF",
  },
  cardContent: { flex: 1, gap: scale(4) },
  cardTopRow: {
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  cardTitle: { fontSize: fontSize.md, color: Colors.textPrimary, flex: 1 },
  cardTime: {
    fontSize: fontSize.xs,
    color: Colors.textMuted,
  },
  cardBottomRow: {
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
  },
  cardBody: {
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: verticalScale(18),
  },

  // Avatar
  avatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: Colors.inputBg,
  },
  avatarWrapper: { position: "relative" },
  onlineDot: {
    position: "absolute",
    bottom: scale(1),
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  onlineDotLTR: { right: scale(1) },
  onlineDotRTL: { left: scale(1) },

  unreadDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: "#2563EB",
    flexShrink: 0,
  },

  // Create button
  createBtnWrapper: {
    position: "absolute",
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  createBtn: { borderRadius: Radius.full, overflow: "hidden", ...Shadow.soft },
  createBtnInner: {
    paddingHorizontal: spacing.xl + spacing.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: { fontSize: fontSize.md, color: Colors.textPrimary },
});
