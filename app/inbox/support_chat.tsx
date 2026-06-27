import { supportApi, type ApiError, type SupportMessage } from "@/api";
import { Button } from "@/components/ui";
import { SendIcon, SupportIcon } from "@/components/ui/icons";
import { Colors, FontSize, Radius } from "@/constants/theme";
import { useSocket } from "@/context";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useNavGuard } from "@/hooks/useNavGuard";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FlatList,
    I18nManager,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// ─── Seen Icon ────────────────────────────────────────────────────────────────
function SeenIcon({ seen }: { seen: boolean }) {
  const color = seen ? "#2DD670" : Colors.textMuted;
  return (
    <Svg width={scale(16)} height={scale(9)} viewBox="0 0 16 9" fill="none">
      <Path
        d="M0.800049 4.46631L3.54681 7.18364C3.62262 7.25855 3.72539 7.30062 3.83254 7.30062C3.93969 7.30062 4.04246 7.25855 4.11827 7.18364L5.8542 5.46631"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M10.5714 0.799805L7.87585 3.46647"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M4.50647 4.13314L7.59018 7.1838C7.66599 7.25871 7.76876 7.30079 7.8759 7.30079C7.98305 7.30079 8.08582 7.25871 8.16163 7.1838L14.6148 0.799805"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

type Message = {
  id: string;
  text: string;
  time: string;
  fromSupport: boolean;
  seen: boolean;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toUiMessage(m: SupportMessage): Message {
  return {
    id: m.id,
    text: m.body,
    time: formatTime(m.createdAt),
    fromSupport: m.senderType === "support",
    seen: !!m.seen,
  };
}

export default function SupportChatScreen() {
  const router = useNavGuard();
  const { t } = useTranslation();
  const font = useAppFont();
  const listRef = useRef<FlatList>(null);

  const params = useLocalSearchParams<{
    threadId?: string;
    orderId?: string;
  }>();
  const initialThreadId =
    typeof params.threadId === "string" ? params.threadId : "";
  const orderIdParam =
    typeof params.orderId === "string" ? params.orderId : undefined;

  const [threadId, setThreadId] = useState<string>(initialThreadId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Unmount guard + tracked scroll timer so a send that resolves (or its
  // deferred scrollToEnd) after the screen pops can't setState/throw.
  const mountedRef = useRef(true);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, []);

  const { socket, joinSupportTicket, leaveSupportTicket } = useSocket();

  // Resolve a thread id: use param if present, else create a new one.
  useEffect(() => {
    if (threadId) return;
    let cancelled = false;
    (async () => {
      try {
        const created = await supportApi.createThread({
          orderId: orderIdParam,
        });
        if (!cancelled) setThreadId(created.id);
      } catch (err) {
        console.warn("Create thread failed:", (err as ApiError)?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, orderIdParam]);

  // Fetch messages whenever threadId is set.
  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await supportApi.listMessages(threadId, 1, 100);
        if (!cancelled) setMessages(list.map(toUiMessage));
      } catch (err) {
        console.warn("List messages failed:", (err as ApiError)?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  // Socket: append new messages addressed to this thread.
  useEffect(() => {
    if (!socket || !threadId) return;
    joinSupportTicket(threadId);
    const handler = (msg: SupportMessage) => {
      if (msg.threadId !== threadId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, toUiMessage(msg)];
      });
    };
    socket.on("support:message:new", handler);
    return () => {
      socket.off("support:message:new", handler);
      leaveSupportTicket(threadId);
    };
  }, [socket, threadId, joinSupportTicket, leaveSupportTicket]);

  // Native RTL swaps left/right border radii automatically.
  const getBubbleRadius = (fromSupport: boolean) =>
    fromSupport
      ? { borderTopRightRadius: scale(4), borderTopLeftRadius: Radius.lg }
      : { borderTopLeftRadius: scale(4), borderTopRightRadius: Radius.lg };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || !threadId || sending) return;
    setSending(true);
    // Optimistic message with a temp id.
    const tempId = `local-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      text: trimmed,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      fromSupport: false,
      seen: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(
      () => listRef.current?.scrollToEnd({ animated: true }),
      100,
    );

    try {
      const real = await supportApi.sendMessage(threadId, { body: trimmed });
      if (!mountedRef.current) return;
      // Replace the temp message with the server-issued one.
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? toUiMessage(real) : m)),
      );
    } catch (err) {
      console.warn("Send message failed:", (err as ApiError)?.message);
      if (!mountedRef.current) return;
      // Roll back the optimistic message on failure.
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons
            name={I18nManager.isRTL ? "arrow-forward" : "arrow-back"}
            size={scale(22)}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.supportAvatar}>
            <SupportIcon size={scale(28)} color={Colors.dark} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { fontFamily: font.semibold }]}>
              {t("support.title")}
            </Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={[styles.onlineText, { fontFamily: font.regular }]}>
                {t("support.online")}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={[styles.inboxChat, { flex: 1 }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ── Messages ── */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Date pill */}
              <View style={styles.datePill}>
                <Text style={[styles.dateText, { fontFamily: font.regular }]}>
                  December 12, 2026
                </Text>
              </View>
            </>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageBubbleWrapper,
                { alignItems: item.fromSupport ? "flex-end" : "flex-start" },
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  item.fromSupport ? styles.bubbleSupport : styles.bubbleUser,
                  getBubbleRadius(item.fromSupport),
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    { fontFamily: font.regular },
                    item.fromSupport
                      ? styles.bubbleTextSupport
                      : styles.bubbleTextUser,
                  ]}
                >
                  {item.text}
                </Text>
              </View>

              {/* Seen + time */}
              <View
                style={[
                  styles.metaRow,
                  { flexDirection: item.fromSupport ? "row-reverse" : "row" },
                ]}
              >
                <SeenIcon seen={item.seen} />
                <Text style={[styles.timeText, { fontFamily: font.regular }]}>
                  {item.time}
                </Text>
              </View>
            </View>
          )}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* ── Input Bar ── */}
        <View style={styles.inputBarWrapper}>
          <View style={styles.inputBar}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t("support.saySomething", "Say Something")}
              placeholderTextColor={Colors.textMuted}
              style={[styles.input, { fontFamily: font.regular }]}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              multiline={false}
            />
            <Button
              label=""
              onPress={sendMessage}
              loading={sending}
              variant="primary"
              size="md"
              fullWidth={false}
              iconRight={<SendIcon size={scale(20)} color="#fff" />}
              style={[
                styles.sendBtn,
                // Icon glyphs never auto-flip — mirror manually in RTL.
                { transform: I18nManager.isRTL ? [{ scaleX: -1 }] : [] },
              ]}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: verticalScale(100),
    marginTop: -verticalScale(100),
    backgroundColor: Colors.card,
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: Colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    justifyContent: "center",
    right: scale(70),
  },
  supportAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: Colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerInfo: { gap: verticalScale(2), alignItems: "flex-start" },
  headerName: { fontSize: FontSize.md, color: Colors.textPrimary },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: scale(4) },
  onlineDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: Colors.success,
  },
  onlineText: { fontSize: FontSize.xs, color: Colors.success },
  placeholder: { width: scale(40) },

  inboxChat: {
    backgroundColor: "#F5F4F8",
    marginHorizontal: scale(10),
    borderRadius: scale(50),
  },

  // Messages list
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },

  // Date pill
  datePill: {
    backgroundColor: Colors.inputBg,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + verticalScale(2),
    borderRadius: Radius.full,
    marginBottom: spacing.md,
  },
  dateText: {
    fontSize: FontSize.sm,
    color: "#3D3859",
    backgroundColor: "#e0e0e6ee",
    padding: scale(3),
    paddingHorizontal: scale(10),
    borderRadius: scale(20),
  },

  // Order card
  orderCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  orderTitle: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    marginBottom: spacing.md,
  },
  orderItems: { gap: 0 },
  itemRow: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  itemImage: { width: scale(56), height: scale(56), borderRadius: Radius.md },
  itemInfo: { flex: 1, gap: verticalScale(2) },
  itemName: { fontSize: FontSize.md, color: Colors.textPrimary },
  itemDesc: { fontSize: FontSize.xs, color: Colors.textSecondary },
  itemPrice: { fontSize: FontSize.sm, color: Colors.textPrimary },
  itemDivider: { height: 1, backgroundColor: Colors.divider },
  qtyCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    borderWidth: 3,
    borderColor: Colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
  },
  qtyText: { fontSize: FontSize.md, color: Colors.textPrimary },

  // Bubbles
  messageBubbleWrapper: {
    marginBottom: spacing.xs,
    width: "100%",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: Radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + verticalScale(2),
  },
  bubbleSupport: { backgroundColor: Colors.card },
  bubbleUser: { backgroundColor: Colors.card },
  bubbleText: { fontSize: FontSize.md, lineHeight: verticalScale(22) },
  bubbleTextSupport: { color: Colors.textSecondary },
  bubbleTextUser: { color: Colors.textSecondary },

  // Meta row (seen + time)
  metaRow: {
    alignItems: "center",
    gap: spacing.xs,
    marginTop: verticalScale(4),
    paddingHorizontal: scale(4),
  },
  timeText: { fontSize: FontSize.xs, color: Colors.textMuted },

  inputBarWrapper: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomEndRadius: spacing.lg,
    borderBottomStartRadius: spacing.lg,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginHorizontal: scale(10),
    height: verticalScale(50),
  },
  sendBtn: {
    width: scale(55),
    height: scale(55),
    borderRadius: scale(30),
    alignItems: "center",
    justifyContent: "center",
  },
});
