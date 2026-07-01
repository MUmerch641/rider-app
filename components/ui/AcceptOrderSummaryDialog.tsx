import { SafeImage } from "@/components/SafeImage";
import { Button } from "@/components/ui";
import { Colors, FontSize, Radius } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { formatCurrency } from "@/utils/format";
import {
  itemDisplayName,
  type AcceptSummaryPayload,
} from "@/utils/assignmentSummary";
import { localizeName, type LangKey } from "@/utils/localize";
import { openWhatsAppChat } from "@/utils/whatsapp";
import { scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  I18nManager,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type { AcceptSummaryPayload } from "@/utils/assignmentSummary";

type Props = {
  visible: boolean;
  data: AcceptSummaryPayload | null;
  onClose: () => void;
};

export function AcceptOrderSummaryDialog({
  visible,
  data,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const insets = useSafeAreaInsets();
  const langKey = (i18n.language?.split("-")[0] || "en") as LangKey;

  if (!data) return null;

  const storeName = localizeName(data.store?.name, langKey);
  const storePhone = data.store?.phone?.trim();
  const customerName =
    data.customer?.name?.trim() || t("onmap.customer", "Customer");
  const customerPhone = data.customer?.phone?.trim();
  const totalLabel = formatCurrency(data.total, data.currency ?? "IQD");
  const items = (data.items ?? []).filter(
    (it) => itemDisplayName(it.name, langKey).length > 0,
  );
  const itemCount = items.reduce((sum, it) => sum + (it.quantity ?? 1), 0);

  const dial = (phone: string) => {
    const normalized = phone.replace(/\s+/g, "");
    Linking.openURL(`tel:${normalized}`).catch(() => undefined);
  };

  const whatsappMessage = data.orderNumber
    ? t("onmap.whatsappOrderMessage", {
        orderNumber: data.orderNumber,
        defaultValue: "Hi, this is your OnWay driver — about order #{{orderNumber}}.",
      })
    : undefined;

  const whatsapp = async (phone: string) => {
    const ok = await openWhatsAppChat(phone, whatsappMessage);
    if (!ok) {
      Linking.openURL(`https://wa.me/${phone.replace(/\D/g, "")}`).catch(
        () => undefined,
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={styles.sheet}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheetBody}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="checkmark-circle" size={scale(28)} color="#22C55E" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { fontFamily: font.bold }]}>
                {t("onmap.acceptSummaryTitle", "Order accepted")}
              </Text>
              {data.orderNumber ? (
                <Text style={[styles.subtitle, { fontFamily: font.medium }]}>
                  #{data.orderNumber}
                  {itemCount > 0
                    ? ` · ${t("onmap.itemCount", {
                        count: itemCount,
                        defaultValue: "{{count}} items",
                      })}`
                    : ""}
                </Text>
              ) : null}
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.metaCard}>
              <SummaryRow
                icon="restaurant-outline"
                label={t("onmap.restaurant", "Restaurant")}
                value={storeName}
                font={font}
              />
              <SummaryRow
                icon="person-outline"
                label={t("onmap.customer", "Customer")}
                value={customerName}
                font={font}
              />
              {data.customer?.address ? (
                <SummaryRow
                  icon="location-outline"
                  label={t("orders.dropoff", "Drop-off")}
                  value={data.customer.address}
                  font={font}
                  isLast
                />
              ) : null}
            </View>

            <View style={styles.itemsCard}>
              <View style={styles.itemsHeader}>
                <Ionicons
                  name="receipt-outline"
                  size={scale(18)}
                  color={Colors.primary}
                />
                <Text style={[styles.itemsTitle, { fontFamily: font.semibold }]}>
                  {t("onmap.items", "Items")}
                </Text>
                {items.length > 0 ? (
                  <View style={styles.itemsBadge}>
                    <Text
                      style={[styles.itemsBadgeText, { fontFamily: font.bold }]}
                    >
                      {items.length}
                    </Text>
                  </View>
                ) : null}
              </View>

              {items.length > 0 ? (
                items.map((item, idx) => {
                  const label = itemDisplayName(item.name, langKey);
                  const lineTotal =
                    item.price && item.price > 0
                      ? formatCurrency(
                          item.price * (item.quantity ?? 1),
                          data.currency ?? "IQD",
                        )
                      : null;
                  return (
                    <View
                      key={`${idx}-${label}`}
                      style={[
                        styles.itemRow,
                        idx < items.length - 1 && styles.itemRowBorder,
                      ]}
                    >
                      {item.image ? (
                        <SafeImage
                          uri={item.image}
                          variant="food"
                          style={styles.itemThumb}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.itemThumb, styles.itemThumbPlaceholder]} />
                      )}
                      <View style={styles.qtyPill}>
                        <Text
                          style={[styles.qtyText, { fontFamily: font.bold }]}
                        >
                          {item.quantity ?? 1}×
                        </Text>
                      </View>
                      <View style={styles.itemTextCol}>
                        <Text
                          style={[styles.itemName, { fontFamily: font.regular }]}
                          numberOfLines={3}
                        >
                          {label}
                        </Text>
                        {item.variants ? (
                          <Text
                            style={[styles.itemVariants, { fontFamily: font.regular }]}
                            numberOfLines={2}
                          >
                            {item.variants}
                          </Text>
                        ) : null}
                      </View>
                      {lineTotal ? (
                        <Text
                          style={[styles.itemPrice, { fontFamily: font.medium }]}
                        >
                          {lineTotal}
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <Text
                  style={[styles.itemsEmpty, { fontFamily: font.regular }]}
                >
                  {t("onmap.itemsUnavailable", "Items will appear shortly")}
                </Text>
              )}
            </View>

            <View style={styles.totalCard}>
              <Text style={[styles.totalLabel, { fontFamily: font.medium }]}>
                {t("onmap.total", "Total")}
              </Text>
              <Text style={[styles.totalValue, { fontFamily: font.bold }]}>
                {totalLabel}
              </Text>
            </View>

            <View style={styles.callSection}>
              <View style={styles.contactGroup}>
                <Text style={[styles.contactGroupLabel, { fontFamily: font.medium }]}>
                  {t("onmap.restaurant", "Restaurant")} · {storeName}
                </Text>
                {storePhone ? (
                  <View style={styles.callRow}>
                    <Button
                      label={t("onmap.callMerchant", "Call store")}
                      onPress={() => dial(storePhone)}
                      variant="outline"
                      style={styles.callBtn}
                      size="sm"
                    />
                    <Button
                      label={t("onmap.whatsappMerchant", "WhatsApp store")}
                      onPress={() => void whatsapp(storePhone)}
                      variant="success"
                      style={[styles.callBtn, styles.whatsappBtn]}
                      size="sm"
                    />
                  </View>
                ) : (
                  <Text style={[styles.contactUnavailable, { fontFamily: font.regular }]}>
                    {t("onmap.storePhoneUnavailable", "Store phone unavailable")}
                  </Text>
                )}
              </View>
              <View style={styles.contactGroup}>
                <Text style={[styles.contactGroupLabel, { fontFamily: font.medium }]}>
                  {t("onmap.customer", "Customer")} · {customerName}
                </Text>
                {customerPhone ? (
                  <View style={styles.callRow}>
                    <Button
                      label={t("onmap.callCustomer", "Call")}
                      onPress={() => dial(customerPhone)}
                      variant="outline"
                      style={styles.callBtn}
                      size="sm"
                    />
                    <Button
                      label={t("onmap.whatsappCustomer", "WhatsApp")}
                      onPress={() => void whatsapp(customerPhone)}
                      variant="success"
                      style={[styles.callBtn, styles.whatsappBtn]}
                      size="sm"
                    />
                  </View>
                ) : (
                  <Text style={[styles.contactUnavailable, { fontFamily: font.regular }]}>
                    {t("onmap.customerPhoneUnavailable", "Customer phone unavailable")}
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>

          <View
            style={[
              styles.actions,
              { paddingBottom: Math.max(insets.bottom, verticalScale(12)) },
            ]}
          >
            <Button
              label={t("common.close", "Close")}
              onPress={onClose}
              size="md"
            />
          </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  font,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  font: ReturnType<typeof useAppFont>;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={scale(16)} color={Colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { fontFamily: font.medium }]}>
          {label}
        </Text>
        <Text
          style={[styles.rowValue, { fontFamily: font.regular }]}
          numberOfLines={3}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(13, 11, 18, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: "85%",
    width: "100%",
  },
  sheetBody: {
    flexDirection: "column",
    maxHeight: "100%",
    paddingHorizontal: spacing.lg,
  },
  handle: {
    alignSelf: "center",
    width: scale(40),
    height: verticalScale(4),
    borderRadius: 2,
    backgroundColor: "#E5E5EA",
    marginTop: verticalScale(10),
    marginBottom: verticalScale(14),
    flexShrink: 0,
  },
  header: {
    flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
    alignItems: "center",
    gap: scale(12),
    marginBottom: verticalScale(14),
    flexShrink: 0,
  },
  headerIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: verticalScale(2),
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    gap: verticalScale(12),
    paddingBottom: verticalScale(8),
  },
  metaCard: {
    backgroundColor: "#FAFAFC",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "#EFEFEF",
    overflow: "hidden",
  },
  row: {
    flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
    alignItems: "flex-start",
    gap: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  rowIconWrap: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(8),
    backgroundColor: "#F3EDFF",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  rowValue: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  itemsCard: {
    backgroundColor: "#FAFAFC",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "#EFEFEF",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
  },
  itemsHeader: {
    flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
    alignItems: "center",
    gap: scale(8),
    marginBottom: verticalScale(10),
  },
  itemsTitle: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    flex: 1,
  },
  itemsBadge: {
    minWidth: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(6),
  },
  itemsBadgeText: {
    fontSize: scale(11),
    color: "#FFFFFF",
  },
  itemRow: {
    flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
    alignItems: "center",
    gap: scale(10),
    paddingVertical: verticalScale(8),
  },
  itemThumb: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(8),
  },
  itemThumbPlaceholder: {
    backgroundColor: "#EFEFEF",
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  qtyPill: {
    minWidth: scale(34),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
    backgroundColor: "#F3EDFF",
    alignItems: "center",
  },
  qtyText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  itemTextCol: {
    flex: 1,
    minWidth: 0,
    gap: verticalScale(2),
  },
  itemName: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  itemVariants: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  itemPrice: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    flexShrink: 0,
  },
  itemsEmpty: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  totalCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F3EDFF",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "#E4D6FF",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
  },
  totalLabel: { fontSize: FontSize.md, color: Colors.textPrimary },
  totalValue: { fontSize: FontSize.lg, color: Colors.primary },
  callSection: {
    gap: verticalScale(12),
  },
  contactGroup: {
    gap: verticalScale(8),
  },
  contactGroupLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  contactUnavailable: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  callRow: {
    flexDirection: "row",
    gap: scale(10),
  },
  callBtn: { flex: 1 },
  whatsappBtn: { backgroundColor: "#25D366" },
  actions: {
    flexShrink: 0,
    gap: verticalScale(8),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
    backgroundColor: "#FFFFFF",
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
});
