import { Button } from "@/components/ui";
import { SendIcon, SupportIcon } from "@/components/ui/icons";
import { isRTL } from "@/constants/i18n";
import { Colors, FontSize, Radius } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
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

// ─── Mock Messages ────────────────────────────────────────────────────────────
const INITIAL_MESSAGES = [
  {
    id: "1",
    text: "Clint asked for long rice which not available right now , call him and tell him",
    time: "10.45",
    fromSupport: true,
    seen: true,
  },
  {
    id: "2",
    text: "Hi there , OK got it!",
    time: "10.45",
    fromSupport: false,
    seen: true,
  },
];

type Message = (typeof INITIAL_MESSAGES)[0];

export default function SupportChatScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = isRTL(i18n.language);
  const listRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");

  const getBubbleRadius = (fromSupport: boolean) => {
    if (fromSupport) {
      return rtl
        ? { borderTopLeftRadius: scale(4), borderTopRightRadius: Radius.lg }
        : { borderTopRightRadius: scale(4), borderTopLeftRadius: Radius.lg };
    }
    return rtl
      ? { borderTopRightRadius: scale(4), borderTopLeftRadius: Radius.lg }
      : { borderTopLeftRadius: scale(4), borderTopRightRadius: Radius.lg };
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      fromSupport: false,
      seen: false,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* ── Header ── */}
      <View
        style={[styles.header, { flexDirection: rtl ? "row-reverse" : "row" }]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons
            name={rtl ? "arrow-forward" : "arrow-back"}
            size={scale(22)}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
        <View
          style={[
            styles.headerCenter,
            { flexDirection: rtl ? "row-reverse" : "row" },
          ]}
        >
          <View style={styles.supportAvatar}>
            <SupportIcon size={scale(28)} color={Colors.dark} />
          </View>
          <View
            style={[
              styles.headerInfo,
              { alignItems: rtl ? "flex-end" : "flex-start" },
            ]}
          >
            <Text style={[styles.headerName, { fontFamily: font.semibold }]}>
              {t("support.title")}
            </Text>
            <View
              style={[
                styles.onlineRow,
                { flexDirection: rtl ? "row-reverse" : "row" },
              ]}
            >
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
                {
                  alignItems: item.fromSupport
                    ? rtl
                      ? "flex-start"
                      : "flex-end"
                    : rtl
                      ? "flex-end"
                      : "flex-start",
                },
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
                    {
                      fontFamily: font.regular,
                      textAlign: rtl ? "right" : "left",
                    },
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
                  {
                    flexDirection: item.fromSupport
                      ? rtl
                        ? "row"
                        : "row-reverse"
                      : rtl
                        ? "row-reverse"
                        : "row",
                  },
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
          <View
            style={[
              styles.inputBar,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t("support.saySomething", "Say Something")}
              placeholderTextColor={Colors.textMuted}
              style={[
                styles.input,
                { fontFamily: font.regular, textAlign: rtl ? "right" : "left" },
              ]}
              returnKeyType="send"
              onSubmitEditing={() => {}}
              multiline={false}
            />
            <Button
              label=""
              onPress={() => {}}
              variant="primary"
              size="md"
              fullWidth={false}
              iconRight={<SendIcon size={scale(20)} color="#fff" />}
              style={[
                styles.sendBtn,
                { transform: rtl ? [{ scaleX: -1 }] : [] },
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
  headerInfo: { gap: verticalScale(2) },
  headerName: { fontSize: FontSize.md, color: Colors.textPrimary },
  onlineRow: { alignItems: "center", gap: scale(4) },
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
