import {
    notificationsApi,
    supportApi,
    type ApiError,
    type DriverNotification,
    type SupportThread,
} from "@/api";
import { isRTL } from "@/constants/i18n";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { useNotifications, useSocket } from "@/context";
import { useAppFont } from "@/hooks/useAppFont";
import {
    fontSize,
    radius,
    scale,
    spacing,
    verticalScale,
} from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { useNavGuard } from "@/hooks/useNavGuard";
import { useDialog } from "@/components/ui/AppDialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AVATAR_PLACEHOLDER } from "@/utils/placeholders";

type InboxTab = "notification" | "support";

type InboxNotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

type InboxNotificationGroup = {
  id: string;
  group: string;
  items: InboxNotificationItem[];
};

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function groupNotifications(
  list: DriverNotification[],
): InboxNotificationGroup[] {
  const today = dayKey(new Date().toISOString());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = dayKey(y.toISOString());

  const buckets: Record<string, InboxNotificationItem[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  for (const n of list) {
    const k = dayKey(n.createdAt);
    const item: InboxNotificationItem = {
      id: n.id,
      title: n.title,
      body: n.body,
      time: formatRelativeTime(n.createdAt),
      unread: !n.isRead,
    };
    if (k === today) buckets.today.push(item);
    else if (k === yesterday) buckets.yesterday.push(item);
    else buckets.earlier.push(item);
  }

  const groups: InboxNotificationGroup[] = [];
  if (buckets.today.length)
    groups.push({ id: "today", group: "inbox.today", items: buckets.today });
  if (buckets.yesterday.length)
    groups.push({
      id: "yesterday",
      group: "inbox.yesterday",
      items: buckets.yesterday,
    });
  if (buckets.earlier.length)
    groups.push({ id: "earlier", group: "inbox.earlier", items: buckets.earlier });
  return groups;
}

type ChatRow = {
  id: string;
  title: string;
  body: string;
  date: string;
  active: boolean;
  threadId: string;
};

type ChatGroup = { id: string; group: string; items: ChatRow[] };

function formatChatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? `${d.getDate()} - ${d.getMonth() + 1} - ${d.getFullYear()}`
    : "";
}

function groupChatThreads(threads: SupportThread[]): ChatGroup[] {
  const today = new Date().toISOString().slice(0, 10);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = y.toISOString().slice(0, 10);

  const buckets: Record<string, ChatRow[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  for (const t of threads) {
    const dayIso = (t.lastMessageAt ?? "").slice(0, 10);
    const row: ChatRow = {
      id: t.id,
      title: t.title ?? "Onway Support",
      body: t.lastMessageBody ?? "",
      date: formatChatDate(t.lastMessageAt ?? null),
      active: t.status === "open" && (t.unreadCount ?? 0) > 0,
      threadId: t.id,
    };
    if (dayIso === today) buckets.today.push(row);
    else if (dayIso === yesterday) buckets.yesterday.push(row);
    else buckets.earlier.push(row);
  }

  const groups: ChatGroup[] = [];
  if (buckets.today.length)
    groups.push({ id: "today", group: "inbox.today", items: buckets.today });
  if (buckets.yesterday.length)
    groups.push({
      id: "yesterday",
      group: "inbox.yesterday",
      items: buckets.yesterday,
    });
  if (buckets.earlier.length)
    groups.push({ id: "earlier", group: "inbox.earlier", items: buckets.earlier });
  return groups;
}

export default function InboxScreen() {
  const router = useNavGuard();
  const dialog = useDialog();
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = isRTL(i18n.language);
  const [activeTab, setActiveTab] = useState<InboxTab>("notification");

  const { pushedNotification } = useSocket();
  const {
    setNotifications,
    markAsRead,
    clearAll: clearAllNotifications,
  } = useNotifications();
  const [notificationList, setNotificationList] = useState<DriverNotification[]>([]);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [list, threadsList] = await Promise.all([
        notificationsApi.list({ page: 1, limit: 50 }),
        supportApi.listThreads(),
      ]);
      setNotificationList(list);
      setThreads(threadsList);
      // Keep the tab-bar dot in sync with server truth.
      setNotifications(list);
    } catch (err) {
      console.warn("Inbox refresh failed:", (err as ApiError)?.message);
    }
  }, [setNotifications]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh whenever a socket-pushed notification lands.
  useEffect(() => {
    if (pushedNotification) refresh();
  }, [pushedNotification, refresh]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const groups = useMemo(
    () => groupNotifications(notificationList),
    [notificationList],
  );
  const chatGroups = useMemo(() => groupChatThreads(threads), [threads]);

  const handleNotificationPress = async (id: string) => {
    // Optimistic local update
    setNotificationList((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
      ),
    );
    // Decrement the tab-bar dot for this item.
    markAsRead(id);
    try {
      await notificationsApi.markRead(id);
    } catch (err) {
      console.warn("Mark-read failed:", (err as ApiError)?.message);
    }
  };

  const handleClearAll = () => {
    if (notificationList.length === 0) return;
    dialog.show({
      title: t("inbox.clearAllTitle"),
      message: t("inbox.clearAllBody"),
      tone: "warning",
      buttons: [
        { label: t("common.cancel"), variant: "secondary" },
        {
          label: t("inbox.clearAll"),
          variant: "destructive",
          onPress: async () => {
            const prev = notificationList;
            setNotificationList([]);
            // Clear the context so the tab-bar dot turns off immediately.
            clearAllNotifications();
            try {
              await notificationsApi.clearAll();
            } catch (err) {
              console.warn("Clear-all failed:", (err as ApiError)?.message);
              setNotificationList(prev); // restore on failure
              refresh(); // refresh() re-syncs the context from the server
            }
          },
        },
      ],
    });
  };

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {notificationList.length > 0 && (
            <TouchableOpacity
              onPress={handleClearAll}
              activeOpacity={0.75}
              accessibilityLabel={t("inbox.clearAll")}
              style={{
                flexDirection: rtl ? "row-reverse" : "row",
                alignItems: "center",
                alignSelf: rtl ? "flex-start" : "flex-end",
                gap: scale(6),
                paddingVertical: verticalScale(6),
              }}
            >
              <Ionicons
                name="trash-outline"
                size={scale(16)}
                color={Colors.primary}
              />
              <Text
                style={{ fontFamily: font.medium, color: Colors.primary }}
              >
                {t("inbox.clearAll")}
              </Text>
            </TouchableOpacity>
          )}
          {groups.map((group) => (
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
                {t(group.group, {
                  defaultValue:
                    group.id === "today"
                      ? "Today"
                      : group.id === "yesterday"
                      ? "Yesterday"
                      : "Earlier",
                })}
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
                    onPress={() => handleNotificationPress(item.id)}
                  >
                    <Image source={AVATAR_PLACEHOLDER} style={styles.avatar} />
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
            {chatGroups.map((group) => (
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
                  {t(group.group, {
                    defaultValue:
                      group.id === "today"
                        ? "Today"
                        : group.id === "yesterday"
                          ? "Yesterday"
                          : "Earlier",
                  })}
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
                      onPress={() =>
                        router.push({
                          pathname: "/inbox/support_chat",
                          params: { threadId: chat.threadId },
                        })
                      }
                    >
                      <View style={styles.avatarWrapper}>
                        <Image source={AVATAR_PLACEHOLDER} style={styles.avatar} />
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
