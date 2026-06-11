import { Colors, FontSize, Radius } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { radius, scale, spacing, verticalScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import {
  I18nManager,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const PHONE_SVG = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.5417 18.9584C13.6 18.9584 12.6083 18.7334 11.5833 18.3C10.5833 17.875 9.57499 17.2917 8.59166 16.5834C7.61666 15.8667 6.67499 15.0667 5.78332 14.1917C4.89999 13.3 4.09999 12.3584 3.39166 11.3917C2.67499 10.3917 2.09999 9.39169 1.69166 8.42502C1.25832 7.39169 1.04166 6.39169 1.04166 5.45002C1.04166 4.80002 1.15832 4.18335 1.38332 3.60835C1.61666 3.01669 1.99166 2.46669 2.49999 1.99169C3.14166 1.35835 3.87499 1.04169 4.65832 1.04169C4.98332 1.04169 5.31666 1.11669 5.59999 1.25002C5.92499 1.40002 6.19999 1.62502 6.39999 1.92502L8.33332 4.65002C8.50832 4.89169 8.64166 5.12502 8.73332 5.35835C8.84166 5.60835 8.89999 5.85835 8.89999 6.10002C8.89999 6.41669 8.80832 6.72502 8.63332 7.01669C8.50832 7.24169 8.31666 7.48335 8.07499 7.72502L7.50832 8.31669C7.63332 8.55002 7.83332 8.85002 8.21666 9.30002C8.62499 9.76669 9.00832 10.1917 9.39166 10.5834C9.88332 11.0667 10.2917 11.45 10.675 11.7667C11.15 12.1667 11.4583 12.3667 11.6417 12.4584L11.625 12.5L12.2333 11.9C12.4917 11.6417 12.7417 11.45 12.9833 11.325C13.4417 11.0417 14.025 10.9917 14.6083 11.2334C14.825 11.325 15.0583 11.45 15.3083 11.625L18.075 13.5917C18.3833 13.8 18.6083 14.0667 18.7417 14.3834C18.8667 14.7 18.925 14.9917 18.925 15.2834C18.925 15.6834 18.8333 16.0834 18.6583 16.4584C18.4833 16.8334 18.2667 17.1584 17.9917 17.4584C17.5167 17.9834 17 18.3584 16.4 18.6C15.825 18.8334 15.2 18.9584 14.5417 18.9584Z" fill="none" stroke="#000"/>
</svg>`;

const CHECK_CIRCLE_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="12" cy="12" r="10" fill="white" fill-opacity="1"/>
<path d="M8 12.5L10.5 15L16 9" stroke="#9E6CFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const NAVIGATE_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_2039_7008)">
<path d="M0.75 12C0.75 14.9837 1.93526 17.8452 4.04505 19.955C6.15483 22.0647 9.01631 23.25 12 23.25C14.9837 23.25 17.8452 22.0647 19.955 19.955C22.0647 17.8452 23.25 14.9837 23.25 12C23.25 9.01631 22.0647 6.15483 19.955 4.04505C17.8452 1.93526 14.9837 0.75 12 0.75C9.01631 0.75 6.15483 1.93526 4.04505 4.04505C1.93526 6.15483 0.75 9.01631 0.75 12Z" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M17.58 7.51594C17.6318 7.36268 17.6396 7.19802 17.6028 7.04053C17.5659 6.88303 17.4858 6.73897 17.3714 6.62459C17.257 6.51022 17.1129 6.43007 16.9555 6.39321C16.798 6.35634 16.6333 6.36421 16.48 6.41594L8.93604 8.93594L15.064 15.0639L17.58 7.51594Z" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8.93598 8.93604L6.41898 16.484C6.36685 16.6373 6.35867 16.8021 6.39539 16.9598C6.43211 17.1175 6.51225 17.2618 6.62674 17.3763C6.74123 17.4908 6.88549 17.5709 7.04318 17.6076C7.20087 17.6443 7.36569 17.6362 7.51898 17.584L15.067 15.068" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<defs>
<clipPath id="clip0_2039_7008">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
`;

const ORDER_DETAILS_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.73 19.7C7.55 18.82 8.8 18.89 9.52 19.85L10.53 21.2C11.34 22.27 12.65 22.27 13.46 21.2L14.47 19.85C15.19 18.89 16.44 18.82 17.26 19.7C19.04 21.6 20.49 20.97 20.49 18.31V7.04C20.5 3.01 19.56 2 15.78 2H8.22C4.44 2 3.5 3.01 3.5 7.04V18.3C3.5 20.97 4.96 21.59 6.73 19.7Z" stroke="#7C7890" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 7H16" stroke="#7C7890" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9 11H15" stroke="#7C7890" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

const SUPPORT_SVG = `<svg width="28" height="27" viewBox="0 0 28 27" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M25.5361 11.5145C25.4372 8.49664 24.1903 5.63028 22.0499 3.50051C19.7927 1.2429 16.7928 0 13.6034 0C7.16154 0 1.89797 5.12735 1.67108 11.5145C1.17437 11.7345 0.752135 12.0939 0.455533 12.549C0.15893 13.0042 0.00069441 13.5356 0 14.0788V17.2293C0.000803827 17.9732 0.296689 18.6864 0.822735 19.2125C1.34878 19.7385 2.06202 20.0344 2.80596 20.0352C3.2873 20.0346 3.74876 19.8432 4.08911 19.5028C4.42947 19.1625 4.62093 18.701 4.62151 18.2197V13.088C4.62151 12.1479 3.9005 11.3813 2.98383 11.2902C3.32221 5.72559 7.95457 1.30147 13.6034 1.30147C16.4458 1.30147 19.1185 2.40945 21.1302 4.42108C22.9774 6.2683 24.0585 8.67601 24.2212 11.2907C23.3054 11.3826 22.5857 12.1488 22.5857 13.088V18.2192C22.5857 19.1671 23.3179 19.9385 24.2455 20.0187V21.3154C24.2447 22.0176 23.9653 22.6907 23.4688 23.1871C22.9723 23.6836 22.2991 23.9628 21.597 23.9635H19.6357C19.5034 23.578 19.2538 23.2435 18.9218 23.0072C18.5898 22.7708 18.1921 22.6443 17.7845 22.6455H15.7629C15.4727 22.6455 15.1942 22.7071 14.9391 22.826C14.5975 22.9838 14.3082 23.236 14.1053 23.5528C13.9024 23.8697 13.7943 24.238 13.7938 24.6142C13.7938 25.1409 13.999 25.6354 14.3708 26.0055C14.553 26.1892 14.7699 26.3348 15.0089 26.434C15.2479 26.5332 15.5042 26.584 15.7629 26.5833H17.7845C18.6227 26.5833 19.3615 26.0415 19.637 25.2649H21.597C23.7752 25.2649 25.5469 23.4932 25.5469 21.3154V19.7871C26.0407 19.5658 26.46 19.2066 26.7545 18.7527C27.0489 18.2988 27.206 17.7694 27.2067 17.2284V14.078C27.2067 12.9353 26.5187 11.9514 25.5361 11.5145ZM3.31961 13.088V18.2192C3.31961 18.5025 3.08925 18.7333 2.80553 18.7333C2.40665 18.7329 2.02425 18.5742 1.7422 18.2922C1.46015 18.0101 1.30149 17.6277 1.30103 17.2288V14.0784C1.30149 13.6795 1.46015 13.2971 1.7422 13.0151C2.02425 12.733 2.40665 12.5744 2.80553 12.5739C3.08925 12.5739 3.31961 12.8047 3.31961 13.088ZM18.4374 24.7539C18.4051 24.9033 18.3227 25.0372 18.2039 25.1334C18.0851 25.2295 17.937 25.2822 17.7841 25.2827H15.7625C15.5846 25.2827 15.4176 25.2133 15.2901 25.0858C15.228 25.0241 15.1788 24.9508 15.1453 24.87C15.1117 24.7892 15.0946 24.7026 15.0948 24.6151C15.0953 24.4382 15.1658 24.2687 15.2909 24.1436C15.4161 24.0186 15.5856 23.9482 15.7625 23.9479H17.7841C17.962 23.9479 18.129 24.0168 18.2561 24.1444C18.3819 24.2698 18.4513 24.4372 18.4513 24.6151C18.4518 24.6628 18.4466 24.7105 18.4374 24.7539ZM25.9053 17.2288C25.9048 17.6277 25.7461 18.0101 25.4641 18.2922C25.1821 18.5742 24.7996 18.7329 24.4008 18.7333C24.2645 18.7332 24.1338 18.679 24.0374 18.5826C23.941 18.4862 23.8868 18.3555 23.8867 18.2192V13.088C23.8867 12.8047 24.117 12.5739 24.4008 12.5739C24.7996 12.5744 25.1821 12.733 25.4641 13.0151C25.7461 13.2971 25.9048 13.6795 25.9053 14.0784V17.2288Z" fill="#7C7890"/>
<path d="M17.817 17.4532C18.5481 17.4524 19.2489 17.1617 19.7659 16.6447C20.2828 16.1278 20.5736 15.4269 20.5744 14.6959V9.07744C20.5744 8.34255 20.2872 7.65017 19.7657 7.12871C19.2443 6.60726 18.5523 6.32007 17.817 6.32007H9.38958C8.65852 6.32087 7.95764 6.61164 7.44071 7.12857C6.92377 7.64551 6.63301 8.34639 6.6322 9.07744V14.6959C6.63301 15.4269 6.92377 16.1278 7.44071 16.6447C7.95764 17.1617 8.65852 17.4524 9.38958 17.4532H9.4412V18.9092C9.44034 19.0869 9.47464 19.2631 9.54212 19.4276C9.6096 19.5921 9.70893 19.7416 9.83439 19.8675C9.95986 19.9935 10.109 20.0934 10.2732 20.1615C10.4374 20.2296 10.6135 20.2646 10.7913 20.2644C10.9689 20.2648 11.1448 20.2294 11.3085 20.1603C11.4722 20.0912 11.6203 19.9898 11.7439 19.8623L14.166 17.4532H17.817ZM13.4393 16.3409L10.8182 18.9478C10.8064 18.9599 10.7978 18.969 10.773 18.9582C10.7431 18.946 10.7431 18.9265 10.7431 18.9092V16.8025C10.7431 16.6299 10.6745 16.4644 10.5525 16.3424C10.4305 16.2203 10.265 16.1518 10.0924 16.1518H9.39001C9.00402 16.1513 8.63397 15.9978 8.36104 15.7248C8.0881 15.4519 7.93456 15.0819 7.9341 14.6959V9.07744C7.93456 8.69145 8.0881 8.3214 8.36104 8.04847C8.63397 7.77553 9.00402 7.62199 9.39001 7.62154H17.8174C18.2053 7.62154 18.5701 7.77337 18.846 8.04885C19.1219 8.32476 19.2734 8.69004 19.2734 9.07744V14.6959C19.2729 15.0819 19.1194 15.4519 18.8464 15.7248C18.5735 15.9978 18.2034 16.1513 17.8174 16.1518H13.8983C13.7261 16.1518 13.5612 16.2199 13.4393 16.3409Z" fill="#7C7890"/>
<path d="M10.4419 11.0305C9.9126 11.0305 9.48181 11.4617 9.48181 11.9906C9.48181 12.5194 9.91303 12.9506 10.4419 12.9506C10.9716 12.9506 11.4028 12.5194 11.4028 11.9906C11.4028 11.4617 10.972 11.0305 10.4419 11.0305ZM13.6027 11.0305C13.0734 11.0305 12.6426 11.4617 12.6426 11.9906C12.6426 12.5194 13.0739 12.9506 13.6027 12.9506C14.1328 12.9506 14.5636 12.5194 14.5636 11.9906C14.5636 11.4617 14.1328 11.0305 13.6027 11.0305ZM16.7635 11.0305C16.2343 11.0305 15.8035 11.4617 15.8035 11.9906C15.8035 12.5194 16.2347 12.9506 16.7635 12.9506C17.2932 12.9506 17.7244 12.5194 17.7244 11.9906C17.7244 11.4617 17.2932 11.0305 16.7635 11.0305Z" fill="#7C7890"/>
</svg>
  `;

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "navigate" | "orderDetails" | "support";

interface DeliveryBottomSheetProps {
  restaurantName?: string;
  restaurantLocation?: string;
  /** Label for the primary status button. Phase-aware: "Picked Up" while
   *  heading to the store, "Arrived at Customer" while heading to the
   *  customer. Falls back to the "Picked Up" label. */
  primaryActionLabel?: string;
  onCall?: () => void;
  /** Contact phone for the current phase is missing (e.g. legacy order
   *  payloads without the customer block) — dim + disable the button. */
  callDisabled?: boolean;
  onArrived?: () => void;
  onCancelDelivery?: () => void;
  onNavigate?: () => void;
  onOrderDetails?: () => void;
  onSupport?: () => void;
  activeTab?: TabKey;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeliveryBottomSheet({
  restaurantName = "The Grill Restaurant",
  restaurantLocation = "Sulaimany-baxtyari",
  primaryActionLabel,
  onCall,
  callDisabled = false,
  onArrived,
  onCancelDelivery,
  onNavigate,
  onOrderDetails,
  onSupport,
  activeTab = "navigate",
}: DeliveryBottomSheetProps) {
  const { t } = useTranslation();
  const font = useAppFont();
  const insets = useSafeAreaInsets();

  const tabs: { key: TabKey; labelKey: string; icon: string }[] = [
    { key: "navigate", labelKey: "delivery.navigate", icon: NAVIGATE_SVG },
    {
      key: "orderDetails",
      labelKey: "delivery.orderDetails",
      icon: ORDER_DETAILS_SVG,
    },
    { key: "support", labelKey: "delivery.support", icon: SUPPORT_SVG },
  ];

  return (
    <View
      style={[
        styles.sheet,
        { paddingBottom: insets.bottom + verticalScale(8) },
      ]}
    >
      {/* ── Drag handle ── */}
      <View style={styles.dragHandle} />

      {/* ── Restaurant info row — native RTL mirrors the row automatically ── */}
      <View style={styles.infoRow}>
        <View style={{ flex: 1, alignItems: "flex-start" }}>
          <Text style={[styles.restaurantName, { fontFamily: font.bold }]}>
            {restaurantName}
          </Text>
          <Text
            style={[styles.restaurantLocation, { fontFamily: font.regular }]}
          >
            {restaurantLocation}
          </Text>
        </View>

        {/* Phone button */}
        <TouchableOpacity
          style={[styles.phoneBtn, callDisabled && styles.phoneBtnDisabled]}
          onPress={onCall}
          disabled={callDisabled}
          activeOpacity={0.75}
        >
          <SvgXml xml={PHONE_SVG} width={scale(22)} height={scale(22)} />
        </TouchableOpacity>
      </View>

      {/* ── Arrived button ── */}
      <LinearGradient
        colors={["#BA97FF", "#8140FF", "#BC99FF"]}
        // Gradient coords don't auto-mirror under native RTL — flip manually.
        start={{ x: I18nManager.isRTL ? 1 : 0, y: 0 }}
        end={{ x: I18nManager.isRTL ? 0 : 1, y: 0 }}
        style={styles.arrivedBtn}
      >
        <TouchableOpacity
          style={styles.arrivedBtnInner}
          onPress={onArrived}
          activeOpacity={0.85}
        >
          <SvgXml xml={CHECK_CIRCLE_SVG} width={scale(22)} height={scale(22)} />
          <Text style={[styles.arrivedBtnText, { fontFamily: font.semibold }]}>
            {primaryActionLabel ?? t("delivery.pickedUp")}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Request cancellation (driver can't self-cancel; admin reassigns) ── */}
      <TouchableOpacity
        style={styles.cancelRow}
        onPress={onCancelDelivery}
        activeOpacity={0.7}
      >
        <Text style={[styles.cancelText, { fontFamily: font.regular }]}>
          {t("delivery.requestCancellation", "Request Cancellation")}
        </Text>
      </TouchableOpacity>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        {tabs.map(({ key, labelKey, icon }) => {
          const isActive = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={
                key === "navigate"
                  ? onNavigate
                  : key === "orderDetails"
                    ? onOrderDetails
                    : onSupport
              }
              activeOpacity={0.75}
            >
              <SvgXml
                xml={icon.replace(
                  isActive ? "#000" : "#9A9AAF",
                  isActive ? "#000" : "#9A9AAF",
                )}
                width={scale(22)}
                height={scale(22)}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { fontFamily: font.medium },
                  isActive && styles.tabLabelActive,
                ]}
              >
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: scale(36),
    borderTopRightRadius: scale(36),
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(12),
    overflow: "hidden",
  },

  /* Drag handle */
  dragHandle: {
    width: scale(36),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: verticalScale(16),
  },

  /* Info row */
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(16),
  },
  restaurantName: {
    fontSize: FontSize.lg,
    color: "#1A1A2E",
    marginBottom: verticalScale(3),
  },
  restaurantLocation: {
    fontSize: FontSize.sm,
    color: "#9A9AAF",
  },
  phoneBtn: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    borderWidth: 0.8,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
  },
  phoneBtnDisabled: {
    opacity: 0.4,
  },

  /* Arrived button */
  arrivedBtn: {
    borderRadius: Radius.full,
    overflow: "hidden",
    marginBottom: verticalScale(12),
  },
  arrivedBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(10),
    paddingVertical: verticalScale(16),
  },
  arrivedBtnText: {
    fontSize: FontSize.md,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  /* Cancel */
  cancelRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(4),
    marginBottom: verticalScale(16),
  },
  cancelText: {
    fontSize: FontSize.sm,
    color: "#9A9AAF",
  },

  /* Tab bar */
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.inputBg,
    borderRadius: radius.full,
    padding: scale(15),
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: verticalScale(4),
    paddingVertical: verticalScale(15),
    paddingHorizontal: scale(8),
    borderRadius: Radius.full,
  },
  tabItemActive: {
    backgroundColor: Colors.inputBg,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    color: "#000",
  },
  tabLabelActive: {
    color: "#000",
  },
});
