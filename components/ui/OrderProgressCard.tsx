import { Colors, FontSize, Radius } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, spacing, verticalScale } from "@/utils/responsive";
import { StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

// ─── SVG strings ─────────────────────────────────────────────────────────────

const shopIconXml = `<svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0)">
<mask id="mask0" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="23" height="23">
<path d="M22.8571 0H0V22.8571H22.8571V0Z" fill="white"/>
</mask>
<g mask="url(#mask0)">
<path d="M21.2951 7.8762L21.019 5.23811C20.619 2.36192 19.3142 1.19049 16.5237 1.19049H14.2761H12.8666H9.97133H8.5618H6.27609C3.47609 1.19049 2.18085 2.36192 1.77133 5.26668L1.51418 7.88573C1.41894 8.90478 1.69513 9.89525 2.29513 10.6667C3.01894 11.6095 4.13323 12.1429 5.37133 12.1429C6.57133 12.1429 7.72371 11.5429 8.44752 10.581C9.09513 11.5429 10.1999 12.1429 11.4285 12.1429C12.657 12.1429 13.7332 11.5714 14.3904 10.6191C15.1237 11.5619 16.257 12.1429 17.438 12.1429C18.7047 12.1429 19.8475 11.581 20.5618 10.5905C21.1332 9.82859 21.3904 8.86668 21.2951 7.8762Z" fill="white"/>
<path d="M10.8096 15.8669C9.60011 15.9907 8.68584 17.0193 8.68584 18.2383V20.8478C8.68584 21.105 8.89537 21.3145 9.15251 21.3145H13.6953C13.9525 21.3145 14.162 21.105 14.162 20.8478V18.5716C14.1715 16.5812 13.0001 15.6383 10.8096 15.8669Z" fill="white"/>
<path d="M20.3523 13.7144V16.5525C20.3523 19.1811 18.219 21.3144 15.5904 21.3144C15.3333 21.3144 15.1237 21.1049 15.1237 20.8477V18.5716C15.1237 17.3525 14.7523 16.4001 14.0285 15.7525C13.3904 15.1716 12.5237 14.8858 11.4475 14.8858C11.2095 14.8858 10.9714 14.8954 10.7142 14.9239C9.01895 15.0954 7.73324 16.5239 7.73324 18.2382V20.8477C7.73324 21.1049 7.52372 21.3144 7.26657 21.3144C4.638 21.3144 2.50467 19.1811 2.50467 16.5525V13.7335C2.50467 13.0668 3.16181 12.6192 3.78086 12.8382C4.038 12.9239 4.29515 12.9906 4.56181 13.0287C4.6761 13.0477 4.79991 13.0668 4.91419 13.0668C5.06657 13.0858 5.21896 13.0954 5.37134 13.0954C6.4761 13.0954 7.56181 12.6858 8.41895 11.9811C9.238 12.6858 10.3047 13.0954 11.4285 13.0954C12.5618 13.0954 13.6095 12.7049 14.4285 12.0001C15.2856 12.6954 16.3523 13.0954 17.438 13.0954C17.6095 13.0954 17.7809 13.0858 17.9428 13.0668C18.0571 13.0573 18.1618 13.0477 18.2666 13.0287C18.5618 12.9906 18.8285 12.9049 19.0952 12.8192C19.7142 12.6097 20.3523 13.0668 20.3523 13.7144Z" fill="white"/>
</g>
</g>
<defs>
<clipPath id="clip0">
<rect width="22.8571" height="22.8571" fill="white"/>
</clipPath>
</defs>
</svg>`;

const pickupIconXml = `<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0)">
<mask id="mask0" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="21" height="21">
<path d="M20.5714 0H0V20.5714H20.5714V0Z" fill="white"/>
</mask>
<g mask="url(#mask0)">
<path d="M10.2855 11.4007C10.1741 11.4007 10.0627 11.375 9.95983 11.315L2.3913 6.93501C2.08273 6.75501 1.97986 6.3607 2.15986 6.05213C2.33986 5.74356 2.72557 5.64068 3.04271 5.82068L10.2855 10.0121L17.4855 5.84642C17.7941 5.66642 18.1884 5.77787 18.3684 6.07787C18.5484 6.38644 18.437 6.7807 18.137 6.9607L10.6199 11.315C10.5085 11.3665 10.397 11.4007 10.2855 11.4007Z" fill="#7C7890"/>
<path d="M10.2857 19.1649C9.93427 19.1649 9.64284 18.8735 9.64284 18.5221V10.7478C9.64284 10.3963 9.93427 10.1049 10.2857 10.1049C10.6371 10.1049 10.9286 10.3963 10.9286 10.7478V18.5221C10.9286 18.8735 10.6371 19.1649 10.2857 19.1649Z" fill="#7C7890"/>
<path d="M10.2858 19.5C9.53152 19.5 8.7858 19.3371 8.19439 19.0114L3.61725 16.4657C2.37439 15.78 1.40584 14.1257 1.40584 12.7028V7.85997C1.40584 6.43711 2.37439 4.79143 3.61725 4.09714L8.19439 1.55998C9.36866 0.908554 11.2029 0.908554 12.3772 1.55998L16.9544 4.10567C18.1972 4.79139 19.1658 6.44569 19.1658 7.86855V12.7114C19.1658 14.1343 18.1972 15.78 16.9544 16.4743L12.3772 19.0114C11.7858 19.3371 11.0401 19.5 10.2858 19.5ZM10.2858 2.35712C9.7458 2.35712 9.21438 2.46855 8.82009 2.68284L4.24297 5.22853C3.42012 5.69139 2.69155 6.91712 2.69155 7.86855V12.7114C2.69155 13.6543 3.42012 14.8886 4.24297 15.3514L8.82009 17.8971C9.60009 18.3343 10.9715 18.3343 11.7515 17.8971L16.3287 15.3514C17.1515 14.8886 17.8801 13.6628 17.8801 12.7114V7.86855C17.8801 6.92569 17.1515 5.69139 16.3287 5.22853L11.7515 2.68284C11.3572 2.46855 10.8258 2.35712 10.2858 2.35712Z" fill="#7C7890"/>
<path d="M14.5716 11.9919C14.2202 11.9919 13.9288 11.7004 13.9288 11.349V8.58909L6.11159 4.08048C5.80302 3.90048 5.70015 3.50618 5.88015 3.20618C6.06015 2.89761 6.44588 2.79474 6.75445 2.97474L14.8888 7.67191C15.0859 7.78334 15.2145 7.99759 15.2145 8.22902V11.3662C15.2145 11.7005 14.923 11.9919 14.5716 11.9919Z" fill="#7C7890"/>
</g>
</g>
<defs>
<clipPath id="clip0">
<rect width="20.5714" height="20.5714" fill="white"/>
</clipPath>
</defs>
</svg>`;

const deliverIconXml = `<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0)">
<mask id="mask0" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="21" height="21">
<path d="M20.5714 0H0V20.5714H20.5714V0Z" fill="white"/>
</mask>
<g mask="url(#mask0)">
<path d="M3.10282 7.27715C4.79139 -0.145703 15.7886 -0.137131 17.4686 7.28572C18.4543 11.64 15.7457 15.3257 13.3714 17.6057C11.6486 19.2686 8.92286 19.2686 7.19139 17.6057C4.82568 15.3257 2.11711 11.6314 3.10282 7.27715Z" stroke="#7C7890" stroke-width="1.28571"/>
<path d="M7.92856 9.85715L9.21427 11.1429L12.6428 7.71429" stroke="#7C7890" stroke-width="1.28571" stroke-linecap="round" stroke-linejoin="round"/>
</g>
</g>
<defs>
<clipPath id="clip0">
<rect width="20.5714" height="20.5714" fill="white"/>
</clipPath>
</defs>
</svg>`;

const distanceIconXml = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M12.0833 8.75044C12.0833 7.59938 11.1506 6.66669 10.0004 6.66669C8.84936 6.66669 7.91666 7.59938 7.91666 8.75044C7.91666 9.90066 8.84936 10.8334 10.0004 10.8334C11.1506 10.8334 12.0833 9.90066 12.0833 8.75044Z" stroke="#7C7890" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M9.99959 17.5C9.00086 17.5 3.75 13.2486 3.75 8.80274C3.75 5.3222 6.54758 2.5 9.99959 2.5C13.4516 2.5 16.25 5.3222 16.25 8.80274C16.25 13.2486 10.9983 17.5 9.99959 17.5Z" stroke="#7C7890" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const timeIconXml = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M17.9167 10C17.9167 14.2575 14.4658 17.7084 10.2083 17.7084C5.95083 17.7084 2.5 14.2575 2.5 10C2.5 5.74252 5.95083 2.29169 10.2083 2.29169C14.4658 2.29169 17.9167 5.74252 17.9167 10Z" stroke="#7C7890" stroke-width="1.25" stroke-linecap="square"/>
<path d="M13.0684 12.4519L9.92676 10.5777V6.53851" stroke="#7C7890" stroke-width="1.25" stroke-linecap="square"/>
</svg>
`;

const cashIconXml = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0)">
<mask id="mask0" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
<path d="M20 0H0V20H20V0Z" fill="white"/>
</mask>
<g mask="url(#mask0)">
<path d="M16.0833 6.59956V10.8912C16.0833 13.4579 14.6167 14.5579 12.4167 14.5579H5.09163C4.71663 14.5579 4.35831 14.5246 4.02497 14.4496C3.81664 14.4162 3.61664 14.3579 3.43331 14.2912C2.18331 13.8246 1.42497 12.7412 1.42497 10.8912V6.59956C1.42497 4.03289 2.89163 2.93292 5.09163 2.93292H12.4167C14.2833 2.93292 15.625 3.72459 15.9833 5.53292C16.0417 5.86626 16.0833 6.20789 16.0833 6.59956Z" stroke="#7C7890" stroke-width="1.25" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M18.5843 9.09964V13.3913C18.5843 15.958 17.1176 17.058 14.9176 17.058H7.59256C6.97589 17.058 6.41757 16.9747 5.93424 16.7914C4.94257 16.4247 4.26756 15.6664 4.02589 14.4497C4.35923 14.5247 4.71756 14.558 5.09256 14.558H12.4176C14.6176 14.558 16.0843 13.458 16.0843 10.8913V6.59966C16.0843 6.208 16.0509 5.85802 15.9843 5.53302C17.5676 5.86635 18.5843 6.98299 18.5843 9.09964Z" stroke="#7C7890" stroke-width="1.25" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8.74868 10.9495C9.96368 10.9495 10.9487 9.96446 10.9487 8.74946C10.9487 7.53442 9.96368 6.54944 8.74868 6.54944C7.53366 6.54944 6.54868 7.53442 6.54868 8.74946C6.54868 9.96446 7.53366 10.9495 8.74868 10.9495Z" stroke="#7C7890" stroke-width="1.25" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M3.98337 6.9165V10.5832" stroke="#7C7890" stroke-width="1.25" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13.5181 6.9165V10.5832" stroke="#7C7890" stroke-width="1.25" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
</g>
</g>
<defs>
<clipPath id="clip0">
<rect width="20" height="20" fill="white"/>
</clipPath>
</defs>
</svg>`;

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = "active" | "inactive";
type PaymentMethod = "CASH" | "CARD" | "ONLINE";

interface OrderProgressProps {
  // Step status
  shopStatus?: StepStatus;
  pickupStatus?: StepStatus;
  deliverStatus?: StepStatus;
  // Labels
  shopLabel?: string;
  pickupLabel?: string;
  deliverLabel?: string;
  // Info row
  distance?: string;
  duration?: string;
  paymentMethod?: PaymentMethod;
  // Colors
  activeColor?: string;
}

// ─── Step Circle ─────────────────────────────────────────────────────────────

function StepCircle({
  iconXml,
  status,
  activeColor,
}: {
  iconXml: string;
  status: StepStatus;
  activeColor: string;
}) {
  const isActive = status === "active";
  return (
    <View
      style={[
        styles.stepCircle,
        isActive
          ? { backgroundColor: activeColor, borderColor: activeColor }
          : styles.stepCircleInactive,
      ]}
    >
      <SvgXml xml={iconXml} width={scale(22)} height={scale(22)} />
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrderProgressCard({
  shopStatus = "active",
  pickupStatus = "inactive",
  deliverStatus = "inactive",
  shopLabel = "Go to Shop",
  pickupLabel = "Pick Up",
  deliverLabel = "Deliver",
  distance = "3.2 km",
  duration = "18 min",
  paymentMethod = "CASH",
  activeColor = "#6B21E8",
}: OrderProgressProps) {
  const font = useAppFont();
  return (
    <View style={styles.card}>
      {/* ── Steps Row ── */}
      <View style={[styles.stepsRow, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
        {/* Step 1 — Shop */}
        <View style={styles.stepItem}>
          <StepCircle
            iconXml={shopIconXml}
            status={shopStatus}
            activeColor={activeColor}
          />
          <Text
            style={[
              styles.stepLabel,
              { fontFamily: font.semibold },
              shopStatus === "active"
                ? { color: activeColor }
                : styles.stepLabelInactive,
            ]}
          >
            {shopLabel}
          </Text>
        </View>

        {/* Connector 1 */}
        <View
          style={[
            styles.connector,
            shopStatus === "active"
              ? { backgroundColor: activeColor }
              : styles.connectorInactive,
          ]}
        />

        {/* Step 2 — Pickup */}
        <View style={styles.stepItem}>
          <StepCircle
            iconXml={pickupIconXml}
            status={pickupStatus}
            activeColor={activeColor}
          />
          <Text
            style={[
              styles.stepLabel,
              { fontFamily: font.regular },
              pickupStatus === "active"
                ? { color: activeColor }
                : styles.stepLabelInactive,
            ]}
          >
            {pickupLabel}
          </Text>
        </View>

        {/* Connector 2 */}
        <View
          style={[
            styles.connector,
            pickupStatus === "active"
              ? { backgroundColor: activeColor }
              : styles.connectorInactive,
          ]}
        />

        {/* Step 3 — Deliver */}
        <View style={styles.stepItem}>
          <StepCircle
            iconXml={deliverIconXml}
            status={deliverStatus}
            activeColor={activeColor}
          />
          <Text
            style={[
              styles.stepLabel,
              { fontFamily: font.regular },
              deliverStatus === "active"
                ? { color: activeColor }
                : styles.stepLabelInactive,
            ]}
          >
            {deliverLabel}
          </Text>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Info Row ── */}
      <View style={[styles.infoRow, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
        {/* Distance */}
        <View style={[styles.infoItem, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
          <SvgXml xml={distanceIconXml} width={scale(18)} height={scale(18)} />
          <Text style={[styles.infoText, { fontFamily: font.medium }]}>
            {distance}
          </Text>
        </View>

        <View style={styles.infoDot} />

        {/* Duration */}
        <View style={[styles.infoItem, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
          <SvgXml xml={timeIconXml} width={scale(18)} height={scale(18)} />
          <Text style={[styles.infoText, { fontFamily: font.medium }]}>
            {duration}
          </Text>
        </View>

        <View style={styles.infoDot} />

        {/* Payment */}
        <View style={[styles.infoItem, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
          <SvgXml xml={cashIconXml} width={scale(18)} height={scale(18)} />
          <Text style={[styles.infoText, { fontFamily: font.medium }]}>
            {paymentMethod}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: Radius.xl,
    borderColor: Colors.inputBg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  /* Steps */
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  stepItem: {
    alignItems: "center",
    gap: scale(6),
    marginHorizontal: -scale(20),
  },
  stepCircle: {
    zIndex: 1,
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  stepCircleInactive: {
    backgroundColor: Colors.inputBg,
    borderColor: "#7c78901c",
  },
  stepLabel: {
    fontSize: FontSize.xs,
    textAlign: "center",
  },
  stepLabelInactive: {
    color: Colors.textSecondary,
  },

  /* Connector line between steps */
  connector: {
    flex: 1,
    height: 2,
    marginBottom: verticalScale(18),
    left: -8,
  },
  connectorInactive: {
    backgroundColor: "#E5E7EB",
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: spacing.md,
  },

  /* Info row */
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  infoDot: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: "#D1D5DB",
  },
});
