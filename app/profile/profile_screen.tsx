import { walletApi, type ApiError } from "@/api";
import { DriverBalanceCard } from "@/components/ui/DriverBalanceCard";
import { CartIcon, ChartIcon, StarIcon } from "@/components/ui/icons";
import LanguageSelector from "@/components/ui/LanguageButton";
import { OpenStatusToggle } from "@/components/ui";
import { Colors, FontSize, Radius } from "@/constants/theme";
import { useAuth } from "@/context";
import { useDialog } from "@/components/ui/AppDialog";
import { useAppFont } from "@/hooks/useAppFont";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import {
    fontSize,
    radius,
    scale,
    spacing,
    verticalScale,
} from "@/utils/responsive";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavGuard } from "@/hooks/useNavGuard";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    I18nManager,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

//SVG icons
const PROFILE_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9615 11.8921H11.9925C14.8245 11.8921 17.1285 9.58814 17.1285 6.75614C17.1285 3.92414 14.8245 1.61914 11.9925 1.61914C9.15959 1.61914 6.8556 3.92414 6.8556 6.75314C6.8506 8.12214 7.3796 9.41014 8.3436 10.3811C9.30659 11.3511 10.5915 11.8881 11.9615 11.8921ZM8.3556 6.75614C8.3556 4.75114 9.98759 3.11914 11.9925 3.11914C13.9975 3.11914 15.6285 4.75114 15.6285 6.75614C15.6285 8.76114 13.9975 10.3921 11.9925 10.3921H11.9645C10.9965 10.3901 10.0895 10.0101 9.40759 9.32314C8.7256 8.63714 8.3526 7.72614 8.3556 6.75614Z" fill="#7C7890"/><path fill-rule="evenodd" clip-rule="evenodd" d="M4.40549 18.7558C4.40549 22.3808 10.1215 22.3808 11.9995 22.3808C13.8775 22.3808 19.5945 22.3808 19.5945 18.7338C19.5945 15.9408 16.1165 13.5808 11.9995 13.5808C7.88349 13.5808 4.40549 15.9508 4.40549 18.7558ZM5.90549 18.7558C5.90549 17.0208 8.51149 15.0808 11.9995 15.0808C15.4885 15.0808 18.0945 17.0098 18.0945 18.7338C18.0945 20.1578 16.0435 20.8808 11.9995 20.8808C7.95649 20.8808 5.90549 20.1658 5.90549 18.7558Z" fill="#7C7890"/></svg>`;

const SUPPORT_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M21.8752 10.5305C21.7934 8.03293 20.7615 5.66076 18.9901 3.8982C17.1221 2.02983 14.6394 1.00122 11.9999 1.00122C6.6687 1.00122 2.31265 5.24454 2.12488 10.5305C1.71381 10.7126 1.36437 11.01 1.11891 11.3866C0.873441 11.7633 0.742488 12.2031 0.741913 12.6527V15.2599C0.742578 15.8756 0.987449 16.4659 1.4228 16.9012C1.85815 17.3366 2.44841 17.5814 3.06409 17.5821C3.46244 17.5816 3.84433 17.4232 4.12601 17.1415C4.40768 16.8598 4.56613 16.4779 4.56661 16.0796V11.8327C4.56661 11.0546 3.96991 10.4202 3.21129 10.3449C3.49133 5.73964 7.325 2.0783 11.9999 2.0783C14.3522 2.0783 16.5642 2.99525 18.229 4.66005C19.7577 6.18878 20.6524 8.18137 20.787 10.3452C20.0291 10.4213 19.4335 11.0554 19.4335 11.8327V16.0792C19.4335 16.8637 20.0395 17.502 20.8071 17.5684V18.6416C20.8065 19.2226 20.5753 19.7797 20.1644 20.1906C19.7535 20.6014 19.1963 20.8325 18.6153 20.8331H16.9921C16.8827 20.514 16.6761 20.2373 16.4013 20.0416C16.1266 19.846 15.7974 19.7414 15.4602 19.7423H13.7871C13.5469 19.7423 13.3164 19.7933 13.1053 19.8917C12.8226 20.0223 12.5832 20.231 12.4153 20.4932C12.2473 20.7554 12.1579 21.0602 12.1575 21.3716C12.1575 21.8075 12.3273 22.2167 12.635 22.523C12.7858 22.675 12.9653 22.7956 13.1631 22.8777C13.3608 22.9598 13.573 23.0018 13.7871 23.0012H15.4602C16.1538 23.0012 16.7652 22.5528 16.9932 21.9101H18.6153C20.4179 21.9101 21.8842 20.4439 21.8842 18.6416V17.3767C22.2928 17.1936 22.6398 16.8964 22.8835 16.5207C23.1272 16.145 23.2572 15.707 23.2578 15.2592V12.652C23.2578 11.7063 22.6884 10.892 21.8752 10.5305ZM3.48917 11.8327V16.0792C3.48917 16.3137 3.29853 16.5047 3.06373 16.5047C2.73363 16.5043 2.41715 16.373 2.18373 16.1396C1.95031 15.9061 1.81901 15.5897 1.81863 15.2596V12.6523C1.81901 12.3222 1.95031 12.0057 2.18373 11.7723C2.41715 11.5389 2.73363 11.4076 3.06373 11.4072C3.29853 11.4072 3.48917 11.5982 3.48917 11.8327ZM16.0005 21.4872C15.9737 21.6109 15.9055 21.7216 15.8072 21.8012C15.7089 21.8808 15.5863 21.9244 15.4598 21.9249H13.7867C13.6395 21.9249 13.5013 21.8674 13.3958 21.7619C13.3444 21.7109 13.3036 21.6502 13.2759 21.5833C13.2482 21.5164 13.234 21.4447 13.2342 21.3723C13.2346 21.2259 13.2929 21.0856 13.3965 20.9822C13.5 20.8787 13.6403 20.8204 13.7867 20.8201H15.4598C15.607 20.8201 15.7452 20.8772 15.8504 20.9828C15.9545 21.0865 16.012 21.2251 16.012 21.3723C16.0123 21.4118 16.008 21.4513 16.0005 21.4872ZM22.1807 15.2596C22.1804 15.5897 22.0491 15.9061 21.8156 16.1396C21.5822 16.373 21.2658 16.5043 20.9357 16.5047C20.8228 16.5046 20.7147 16.4597 20.6349 16.3799C20.5552 16.3002 20.5103 16.192 20.5102 16.0792V11.8327C20.5102 11.5982 20.7008 11.4072 20.9357 11.4072C21.2658 11.4076 21.5822 11.5389 21.8156 11.7723C22.0491 12.0057 22.1804 12.3222 22.1807 12.6523V15.2596Z" fill="#7C7890"/>
<path d="M15.4871 15.4454C16.0921 15.4447 16.6721 15.2041 17.0999 14.7762C17.5277 14.3484 17.7684 13.7684 17.769 13.1634V8.51365C17.769 7.90547 17.5314 7.33246 17.0998 6.90091C16.6683 6.46936 16.0956 6.23169 15.4871 6.23169H8.51265C7.90764 6.23235 7.3276 6.47299 6.89979 6.9008C6.47198 7.3286 6.23135 7.90864 6.23068 8.51365V13.1634C6.23135 13.7684 6.47198 14.3484 6.89979 14.7762C7.3276 15.2041 7.90764 15.4447 8.51265 15.4454H8.55537V16.6502C8.55466 16.7974 8.58305 16.9432 8.63889 17.0793C8.69473 17.2154 8.77694 17.3392 8.88077 17.4434C8.98461 17.5476 9.10802 17.6303 9.24392 17.6867C9.37983 17.743 9.52553 17.772 9.67266 17.7718C9.81969 17.7721 9.96527 17.7428 10.1007 17.6856C10.2362 17.6285 10.3587 17.5446 10.4611 17.439L12.4655 15.4454H15.4871ZM11.8641 14.5248L9.69492 16.6822C9.68522 16.6923 9.67804 16.6998 9.65758 16.6908C9.63281 16.6808 9.63281 16.6646 9.63281 16.6502V14.9068C9.63281 14.764 9.57607 14.627 9.47507 14.526C9.37408 14.425 9.2371 14.3683 9.09427 14.3683H8.51301C8.19357 14.3679 7.88732 14.2408 7.66144 14.015C7.43556 13.7891 7.3085 13.4828 7.30812 13.1634V8.51365C7.3085 8.19421 7.43556 7.88797 7.66144 7.66209C7.88732 7.43621 8.19357 7.30915 8.51301 7.30877H15.4874C15.8084 7.30877 16.1103 7.43442 16.3387 7.66241C16.567 7.89075 16.6923 8.19305 16.6923 8.51365V13.1634C16.6919 13.4828 16.5649 13.7891 16.339 14.015C16.1131 14.2408 15.8069 14.3679 15.4874 14.3683H12.244C12.1015 14.3683 11.965 14.4246 11.8641 14.5248Z" fill="#7C7890"/>
<path d="M9.38348 10.1301C8.94547 10.1301 8.58896 10.487 8.58896 10.9246C8.58896 11.3623 8.94583 11.7192 9.38348 11.7192C9.82185 11.7192 10.1787 11.3623 10.1787 10.9246C10.1787 10.487 9.82221 10.1301 9.38348 10.1301ZM11.9993 10.1301C11.5613 10.1301 11.2048 10.487 11.2048 10.9246C11.2048 11.3623 11.5617 11.7192 11.9993 11.7192C12.4381 11.7192 12.7946 11.3623 12.7946 10.9246C12.7946 10.487 12.4381 10.1301 11.9993 10.1301ZM14.6152 10.1301C14.1772 10.1301 13.8207 10.487 13.8207 10.9246C13.8207 11.3623 14.1775 11.7192 14.6152 11.7192C15.0536 11.7192 15.4104 11.3623 15.4104 10.9246C15.4104 10.487 15.0536 10.1301 14.6152 10.1301Z" fill="#7C7890"/>
</svg>
`;
const ORDER_RADIUS_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_2033_4628)"><mask id="mask0_2033_4628" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><path d="M24 0H0V24H24V0Z" fill="white"/></mask><g mask="url(#mask0_2033_4628)"><path d="M12 22.7502C6.07 22.7502 1.25 17.9302 1.25 12.0002C1.25 10.1202 1.73999 8.27026 2.67999 6.64026C2.88999 6.28026 3.34001 6.16023 3.70001 6.36023L12.37 11.3402C12.73 11.5502 12.85 12.0002 12.65 12.3602C12.44 12.7202 11.99 12.8403 11.63 12.6403L3.63 8.05023C3.05 9.28023 2.75 10.6202 2.75 11.9902C2.75 17.0902 6.9 21.2402 12 21.2402C17.1 21.2402 21.25 17.0902 21.25 11.9902C21.25 6.89023 17.1 2.74023 12 2.74023C9.98 2.74023 8.06001 3.38024 6.45001 4.59024C6.12001 4.84024 5.64999 4.77025 5.39999 4.44025C5.14999 4.11025 5.21999 3.64026 5.54999 3.39026C7.41999 1.99026 9.65 1.24023 12 1.24023C17.93 1.24023 22.75 6.06024 22.75 11.9902C22.75 17.9202 17.93 22.7502 12 22.7502Z" fill="#7C7890"/></g></g><defs><clipPath id="clip0_2033_4628"><rect width="24" height="24" fill="white"/></clipPath></defs></svg>`;

const REVIEWS_SVG = `<svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.1975 9.58174C14.1975 9.40272 14.1264 9.23103 13.9998 9.10444C13.8732 8.97785 13.7015 8.90674 13.5225 8.90674H6.09749C5.91847 8.90674 5.74678 8.97785 5.62019 9.10444C5.49361 9.23103 5.42249 9.40272 5.42249 9.58174C5.42249 9.76076 5.49361 9.93245 5.62019 10.059C5.74678 10.1856 5.91847 10.2567 6.09749 10.2567H13.5225C13.6111 10.2567 13.6989 10.2393 13.7808 10.2054C13.8627 10.1714 13.9371 10.1217 13.9998 10.059C14.0625 9.99636 14.1122 9.92194 14.1461 9.84005C14.18 9.75815 14.1975 9.67038 14.1975 9.58174ZM6.09599 12.3155C5.91697 12.3155 5.74528 12.3866 5.61869 12.5132C5.49211 12.6398 5.42099 12.8115 5.42099 12.9905C5.42099 13.1695 5.49211 13.3412 5.61869 13.4678C5.74528 13.5944 5.91697 13.6655 6.09599 13.6655H10.0327C10.2118 13.6655 10.3834 13.5944 10.51 13.4678C10.6366 13.3412 10.7077 13.1695 10.7077 12.9905C10.7077 12.8115 10.6366 12.6398 10.51 12.5132C10.3834 12.3866 10.2118 12.3155 10.0327 12.3155H6.09599Z" fill="#7C7890"/>
<path d="M18.645 9.61937C18.466 9.61937 18.2943 9.69048 18.1677 9.81707C18.0411 9.94366 17.97 10.1153 17.97 10.2944V15.7536C17.9694 16.2447 17.774 16.7156 17.4268 17.0629C17.0795 17.4102 16.6086 17.6055 16.1175 17.6061H11.6025C11.4561 17.606 11.3136 17.6536 11.1967 17.7419L7.29825 20.6736C7.26496 20.7003 7.22436 20.7164 7.18179 20.7196C7.13922 20.7228 7.09668 20.713 7.05975 20.6916C7.02158 20.6734 6.98963 20.6443 6.96789 20.608C6.94615 20.5718 6.93558 20.5299 6.9375 20.4876L7.0125 18.3051C7.01541 18.2147 7.00014 18.1245 6.96759 18.0401C6.93504 17.9556 6.88587 17.8786 6.823 17.8134C6.76013 17.7483 6.68483 17.6965 6.60156 17.661C6.5183 17.6255 6.42876 17.6071 6.33825 17.6069H3.2025C2.71131 17.6065 2.24035 17.4112 1.89302 17.0638C1.5457 16.7165 1.3504 16.2456 1.35 15.7544V6.82937C1.3496 6.33731 1.54443 5.86519 1.89174 5.51662C2.23904 5.16805 2.71044 4.97151 3.2025 4.97012H11.52C11.699 4.97012 11.8707 4.899 11.9973 4.77241C12.1239 4.64583 12.195 4.47414 12.195 4.29512C12.195 4.1161 12.1239 3.94441 11.9973 3.81782C11.8707 3.69123 11.699 3.62012 11.52 3.62012H3.2025C2.35246 3.6221 1.5379 3.96118 0.937534 4.56295C0.337163 5.16473 -2.32019e-06 5.98007 0 6.83012V15.7544C0.000992056 16.6035 0.338692 17.4176 0.939041 18.018C1.53939 18.6185 2.35338 18.9564 3.2025 18.9576H5.63925L5.58825 20.4441C5.57791 20.741 5.65225 21.0346 5.80258 21.2908C5.95292 21.547 6.17304 21.7551 6.43725 21.8909C6.66218 22.0088 6.91229 22.0705 7.16625 22.0709C7.4985 22.0709 7.82775 21.9636 8.10825 21.7544L11.8275 18.9576H16.1168C16.9659 18.9564 17.7799 18.6185 18.3802 18.018C18.9806 17.4176 19.3183 16.6035 19.3192 15.7544V10.2951C19.3194 10.2064 19.3022 10.1186 19.2684 10.0366C19.2346 9.95466 19.1849 9.88015 19.1223 9.81738C19.0597 9.75461 18.9853 9.70481 18.9034 9.67083C18.8215 9.63686 18.7337 9.61937 18.645 9.61937Z" fill="#7C7890"/>
<path d="M22.2937 3.18956C22.2348 3.00622 22.1299 2.84103 21.9891 2.70973C21.8482 2.57844 21.676 2.48543 21.489 2.43956L19.764 2.00981L18.822 0.502313C18.4042 -0.168187 17.3137 -0.166687 16.8967 0.502313L15.9547 2.00981L14.2297 2.43956C13.848 2.53406 13.5465 2.81456 13.425 3.18956C13.3035 3.56456 13.3815 3.96881 13.635 4.27106L14.778 5.63156L14.6535 7.40456C14.6394 7.5967 14.6747 7.78925 14.7561 7.96387C14.8375 8.13849 14.9623 8.28934 15.1185 8.40206C15.2741 8.51573 15.4562 8.58774 15.6474 8.61123C15.8387 8.63473 16.0328 8.60894 16.2112 8.53631L17.8597 7.87031L19.5075 8.53631C19.8727 8.68481 20.2807 8.63381 20.6002 8.40281C20.919 8.17106 21.093 7.79831 21.066 7.40456L20.9415 5.63156L22.0845 4.27031C22.3372 3.96881 22.416 3.56456 22.2937 3.18956ZM19.7317 4.97231C19.619 5.10666 19.563 5.27964 19.5757 5.45456L19.6957 7.15706L18.1132 6.51731C17.9512 6.45144 17.7698 6.45144 17.6077 6.51731L16.026 7.15706L16.1452 5.45456C16.1571 5.27975 16.1012 5.10708 15.9892 4.97231L14.892 3.66581L16.548 3.25256C16.7176 3.21021 16.8641 3.10375 16.9567 2.95556L17.8612 1.50881L18.7657 2.95556C18.8587 3.10406 19.005 3.21056 19.1745 3.25256L20.8305 3.66581L19.7317 4.97231Z" fill="#7C7890"/>
</svg>
`;
const CHANGE_PASSWORD_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 10V8C6 4.69 7 2 12 2C17 2 18 4.69 18 8V10" stroke="#7C7890" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 18.5C13.3807 18.5 14.5 17.3807 14.5 16C14.5 14.6193 13.3807 13.5 12 13.5C10.6193 13.5 9.5 14.6193 9.5 16C9.5 17.3807 10.6193 18.5 12 18.5Z" stroke="#7C7890" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 22H7C3 22 2 21 2 17V15C2 11 3 10 7 10H17C21 10 22 11 22 15V17C22 21 21 22 17 22Z" stroke="#7C7890" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const SIGN_OUT_SVG = `<svg width="24" height="23" viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.23017 3.22937C6.8401 -0.379342 12.3261 -0.962618 16.5426 1.47464C16.8135 1.64225 17.0085 1.9088 17.0862 2.21776C17.1639 2.52672 17.1183 2.85381 16.9589 3.12967C16.7995 3.40553 16.539 3.60848 16.2325 3.69549C15.9261 3.7825 15.5977 3.74672 15.3172 3.59575C14.0131 2.84426 12.5343 2.44912 11.0292 2.45003C9.52412 2.45094 8.04576 2.84787 6.74262 3.60094C5.43947 4.35401 4.35742 5.43672 3.60514 6.74032C2.85286 8.04392 2.45683 9.52251 2.45683 11.0276C2.45683 12.5327 2.85286 14.0113 3.60514 15.3149C4.35742 16.6185 5.43947 17.7012 6.74262 18.4543C8.04576 19.2073 9.52412 19.6043 11.0292 19.6052C12.5343 19.6061 14.0131 19.211 15.3172 18.4595C15.5977 18.3085 15.9261 18.2727 16.2325 18.3597C16.539 18.4467 16.7995 18.6497 16.9589 18.9255C17.1183 19.2014 17.1639 19.5285 17.0862 19.8375C17.0085 20.1464 16.8135 20.413 16.5426 20.5806C12.3261 23.0191 6.8401 22.4358 3.23017 18.8258C2.20608 17.8018 1.39373 16.586 0.839493 15.248C0.28526 13.91 0 12.4759 0 11.0276C0 9.57934 0.28526 8.14525 0.839493 6.80722C1.39373 5.4692 2.20608 4.25344 3.23017 3.22937ZM18.7396 6.48517C18.9694 6.25545 19.2811 6.1264 19.606 6.1264C19.9309 6.1264 20.2425 6.25545 20.4723 6.48517L22.7895 8.80234C23.0088 9.02168 23.222 9.23367 23.3875 9.42973C23.5688 9.64417 23.7649 9.91497 23.8801 10.2703C24.04 10.7625 24.04 11.2927 23.8801 11.7849C23.7733 12.0954 23.6059 12.3816 23.3875 12.6267C23.1963 12.843 22.9968 13.0519 22.7895 13.2529L20.4735 15.57C20.2438 15.8 19.9321 15.9292 19.607 15.9293C19.282 15.9294 18.9702 15.8004 18.7403 15.5707C18.5103 15.3409 18.3811 15.0292 18.381 14.7041C18.3809 14.3791 18.5099 14.0673 18.7396 13.8374L20.3241 12.253H11.0284C10.7034 12.253 10.3917 12.1239 10.1619 11.8941C9.93214 11.6643 9.80304 11.3526 9.80304 11.0276C9.80304 10.7026 9.93214 10.3909 10.1619 10.1611C10.3917 9.93134 10.7034 9.80224 11.0284 9.80224H20.3241L18.7396 8.21784C18.5099 7.98805 18.3809 7.67643 18.3809 7.3515C18.3809 7.02658 18.5099 6.71496 18.7396 6.48517Z" fill="#DC2626"/></svg>`;

// ─── Menu items ───────────────────────────────────────────────────────────────
const MENU_ITEMS = [
  {
    key: "personalInfo",
    labelKey: "profile.personalInfo",
    labelFallback: "Personal Information",
    svg: PROFILE_SVG,
    onPress: (router: any) => router.push("/profile/personal_information"),
  },
  {
    key: "liveSupport",
    labelKey: "profile.liveSupport",
    labelFallback: "Live Support",
    svg: SUPPORT_SVG,
    onPress: (router: any) => router.push("/inbox/support_chat"),
  },
  // "Order Radius" menu item temporarily hidden — the screen still ships
  // (app/profile/order_radius.tsx) so we can flip it back on with a single
  // line later. Don't delete the route or its translations.
  // {
  //   key: "orderRadius",
  //   labelKey: "profile.orderRadius",
  //   labelFallback: "Order Radius",
  //   svg: ORDER_RADIUS_SVG,
  //   onPress: (router: any) => router.push("/profile/order_radius"),
  // },
  {
    key: "reviews",
    labelKey: "profile.reviews",
    labelFallback: "Reviews",
    svg: REVIEWS_SVG,
    onPress: (router: any) => router.push("/profile/reviews_screen"),
  },
  {
    key: "changePassword",
    labelKey: "profile.changePassword",
    labelFallback: "Change Password",
    svg: CHANGE_PASSWORD_SVG,
    // NOT /auth/forgetPassword_screen — RouteGuard bounces authenticated
    // drivers straight out of the auth group, so that push went nowhere.
    onPress: (router: any) => router.push("/profile/change_password"),
  },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const router = useNavGuard();
  // Layout mirrors natively; only glyph/gradient mirrors need a condition.
  const rtl = I18nManager.isRTL;

  const { driver, logout, updateStatus } = useAuth();
  const dialog = useDialog();
  const { pickAndUploadAvatar, uploading: avatarUploading } = useAvatarUpload();
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [onTimeRate, setOnTimeRate] = useState<number | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Online/offline availability toggle, moved here from the (removed) Orders
  // tab header (R8). Same updateStatus(...) call it always made.
  const [statusBusy, setStatusBusy] = useState(false);

  const handleStatusToggle = useCallback(async () => {
    if (statusBusy || !driver) return;
    setStatusBusy(true);
    try {
      await updateStatus(!driver.isOnline);
    } catch (err) {
      console.warn("Status toggle failed:", (err as ApiError)?.message);
    } finally {
      setStatusBusy(false);
    }
  }, [statusBusy, driver, updateStatus]);

  // Available balance comes from /wallet/balance (delivered-but-not-paid-out
  // earnings — what the rider can actually withdraw). On-time rate comes
  // from /wallet/summary's lifetime aggregate. The label used to show
  // *lifetime* earnings from /wallet/summary which the BALANCE card label
  // ("Available Balance") explicitly contradicts.
  const fetchWallet = useCallback(async () => {
    if (!driver?.id) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [balance, summary] = await Promise.all([
        walletApi.balance().catch(() => null),
        walletApi
          .summary({ startDate: "2020-01-01", endDate: today })
          .catch(() => null),
      ]);
      if (balance) {
        const avail = Number(balance.available ?? 0);
        setAvailableBalance(Number.isFinite(avail) ? avail : 0);
      }
      const rate = summary?.summary?.onTimeRate;
      setOnTimeRate(
        typeof rate === "number" && Number.isFinite(rate) ? rate : null,
      );
    } catch (err) {
      console.warn("Wallet fetch failed:", (err as ApiError)?.message);
    }
  }, [driver?.id]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchWallet();
    } finally {
      setRefreshing(false);
    }
  }, [fetchWallet]);

  const driverDisplayName = useMemo(() => {
    if (!driver) return "";
    const first = driver.firstName?.trim();
    const last = driver.lastName?.trim();
    if (first || last) return [first, last].filter(Boolean).join(" ");
    return driver.username ?? "";
  }, [driver]);

  const ratingDisplay = useMemo(() => {
    const r = driver?.rating;
    if (r == null) return "—";
    const n = typeof r === "number" ? r : Number(r);
    return Number.isFinite(n) ? n.toFixed(1) : String(r);
  }, [driver?.rating]);

  const ordersDisplay = String(driver?.totalDeliveries ?? 0);

  const performSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } catch {
      // Local logout still happens inside auth.logout().
    } finally {
      setSigningOut(false);
      // RouteGuard redirects on the isAuthenticated flip — navigating here too
      // remounted the login screen a second time (visible double-render).
    }
  };

  // Destructive-confirm gate: only the dialog's confirm button logs out.
  const handleSignOut = () => {
    if (signingOut) return;
    dialog.show({
      title: t("profile.signOutConfirmTitle", "Log out?"),
      message: t(
        "profile.signOutConfirmMessage",
        "You will stop receiving new orders until you log in again.",
      ),
      tone: "warning",
      buttons: [
        { label: t("common.cancel", "Cancel"), variant: "secondary" },
        {
          label: t("profile.signOut", "Sign out"),
          variant: "destructive",
          onPress: () => void performSignOut(),
        },
      ],
    });
  };

  const handleLanguageToggle = () => {
    const langs = ["en", "ar", "ku"];
    const currentIndex = langs.indexOf(i18n.language);
    const nextLang = langs[(currentIndex + 1) % langs.length];
    i18n.changeLanguage(nextLang);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* ── Header ── */}
      <View style={[styles.header, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Ionicons
            name={rtl ? "arrow-forward" : "arrow-back"}
            size={scale(20)}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>

        {/* Title */}
        <Text
          style={[
            styles.headerTitle,
            { fontFamily: font.semibold, textAlign: "center" },
          ]}
        >
          {t("profile.title", "Profile")}
        </Text>

        {/* Language toggle */}
        <LanguageSelector />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ── Availability toggle ── moved here from the removed Orders tab
            (R8). This is now THE place riders go online/offline; it calls the
            same AuthContext.updateStatus the Orders header used. */}
        <View style={[styles.availabilityRow, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
          <View style={[styles.availabilityLeft, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
            <View
              style={[
                styles.availabilityDot,
                { backgroundColor: driver?.isOnline ? "#22c55e" : "#9ca3af" },
              ]}
            />
            <View style={{ alignItems: font.rtl ? "flex-end" : "flex-start" }}>
              <Text
                style={[styles.availabilityLabel, { fontFamily: font.medium, textAlign: font.rtl ? "right" : "left" }]}
              >
                {t("profile.availability", "Availability")}
              </Text>
              <Text
                style={[styles.availabilityState, { fontFamily: font.semibold, textAlign: font.rtl ? "right" : "left" }]}
              >
                {driver?.isOnline
                  ? t("profile.online", "Online")
                  : t("profile.offline", "Offline")}
              </Text>
            </View>
          </View>
          <OpenStatusToggle
            isOpen={driver?.isOnline ?? false}
            onToggle={() => void handleStatusToggle()}
          />
        </View>

        {/* ── Driver Balance Card ── */}
        <DriverBalanceCard
          name={driverDisplayName}
          phone={driver?.phone ?? ""}
          balance={availableBalance}
          avatar={driver?.avatar ? { uri: driver.avatar } : undefined}
          onAvatarPress={() => void pickAndUploadAvatar()}
          avatarUploading={avatarUploading}
          style={styles.balanceCard}
        />

        {/* ── Stats row ── */}
        <LinearGradient
          colors={["#fadecd", "#fadecd56", "#e6dcfa5e", "#e6dcfa"]}
          start={{ x: rtl ? 1.2 : 0, y: 0 }}
          end={{ x: rtl ? 0 : 1, y: 1 }}
          style={styles.statsRow}
        >
          {/* Orders */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/profile/revenue_screen")}
            activeOpacity={0.75}
          >
            <View style={[styles.statIconWrapper, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
              <CartIcon size={scale(20)} />
              <Text style={[styles.statLabel, { fontFamily: font.medium }]}>
                {t("profile.orders")}
              </Text>
            </View>
            <Text style={[styles.statValue, { fontFamily: font.medium }]}>
              {ordersDisplay}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/profile/revenue_screen")}
            activeOpacity={0.75}
          >
            <View style={[styles.statIconWrapper, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
              <ChartIcon size={scale(20)} />
              <Text style={[styles.statLabel, { fontFamily: font.medium }]}>
                {t("profile.onTime", "On-Time")}
              </Text>
            </View>
            <View style={[styles.profitRow, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
              <Text style={[styles.statValue, { fontFamily: font.medium }]}>
                {onTimeRate == null ? "—" : `${Math.round(onTimeRate)}%`}
              </Text>
              {onTimeRate != null && (
                <MaterialIcons
                  name="trending-up"
                  size={scale(16)}
                  color={Colors.textSecondary}
                  style={{ marginLeft: -scale(1) }}
                />
              )}
            </View>
          </TouchableOpacity>

          {/* Rating */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/profile/reviews_screen")}
            activeOpacity={0.75}
          >
            <View style={[styles.statIconWrapper, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
              <StarIcon size={scale(20)} />
              <Text style={[styles.statLabel, { fontFamily: font.medium }]}>
                {t("profile.rating")}
              </Text>
            </View>
            <Text style={[styles.statValue, { fontFamily: font.medium }]}>
              {ratingDisplay}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
        {/* ── Menu items ── */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, { flexDirection: font.rtl ? "row-reverse" : "row" }]}
              onPress={() => item.onPress(router)}
              activeOpacity={0.7}
            >
              {/* Icon */}
              <View style={styles.menuIconWrap}>
                <SvgXml xml={item.svg} width={scale(22)} height={scale(22)} />
              </View>

              {/* Label */}
              <Text style={[styles.menuLabel, { fontFamily: font.regular, textAlign: font.rtl ? "right" : "left" }]}>
                {t(item.labelKey, item.labelFallback)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity
          style={[styles.signOutCard, { flexDirection: font.rtl ? "row-reverse" : "row" }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <SvgXml xml={SIGN_OUT_SVG} width={scale(22)} height={scale(22)} />
          <Text style={[styles.signOutText, { fontFamily: font.semibold }]}>
            {t("profile.signOut", "Sign out")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    marginHorizontal: verticalScale(8),
  },
  headerBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#EFEFEF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: scale(18),
    color: Colors.textPrimary,
    flex: 1,
    textAlign: "center",
  },

  // Availability toggle row
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderColor: Colors.inputBg,
    borderWidth: scale(0.5),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  availabilityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  availabilityDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
  },
  availabilityLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  availabilityState: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginTop: scale(1),
  },

  // Balance card
  balanceCard: {
    marginTop: spacing.xs,
  },

  // Stats card
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
    backgroundColor: "#F2F6FF",
    borderRadius: Radius.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: spacing.md,
    paddingVertical: spacing.lg,
    marginVertical: spacing.md,
    borderColor: Colors.inputBg,
    borderWidth: scale(0.5),
  },
  statIconWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: spacing.sm,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  profitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
  },

  // Menu section
  menuSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  menuIconWrap: {
    width: scale(32),
    alignItems: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: fontSize.lg,
    color: Colors.textSecondary,
  },

  // Sign out
  signOutCard: {
    flexDirection: "row",
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingVertical: verticalScale(18),
    alignItems: "center",
    gap: spacing.sm,
    borderColor: Colors.inputBg,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: scale(15),
    color: Colors.danger,
  },
});
