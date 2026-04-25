import { OrderHeader } from "@/components/ui/OrderHeader";
import { OrderProgressCard } from "@/components/ui/OrderProgressCard";
import { isRTL } from "@/constants/i18n";
import { Colors } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { radius, scale, spacing, verticalScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { router, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const NAV_SVG = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.0325 3.95211L13.5225 1.12211C17.3325 -0.147888 19.4025 1.93211 18.1425 5.74211L15.3125 14.2322C13.4125 19.9422 10.2926 19.9422 8.39255 14.2322L7.5525 11.7122L5.0325 10.8722C-0.6775 8.97216 -0.6775 5.86211 5.0325 3.95211Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7.74245 11.2825L11.3224 7.6925" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const CHAT_SVG = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_2039_6608)">
<mask id="mask0_2039_6608" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
<path d="M20 0H0V20H20V0Z" fill="white"/>
</mask>
<g mask="url(#mask0_2039_6608)">
<path d="M7.08331 8.75H12.9166" stroke="black" stroke-width="1.25" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M5.83332 15.3581H9.16666L12.875 17.8247C13.425 18.1914 14.1667 17.7997 14.1667 17.1331V15.3581C16.6667 15.3581 18.3333 13.6914 18.3333 11.1914V6.19139C18.3333 3.69139 16.6667 2.02472 14.1667 2.02472H5.83332C3.33332 2.02472 1.66666 3.69139 1.66666 6.19139V11.1914C1.66666 13.6914 3.33332 15.3581 5.83332 15.3581Z" stroke="black" stroke-width="1.25" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
</g>
</g>
<defs>
<clipPath id="clip0_2039_6608">
<rect width="20" height="20" fill="white"/>
</clipPath>
</defs>
</svg>`;

const PHONE_SVG = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_2039_6616)">
<mask id="mask0_2039_6616" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
<path d="M20 0H0V20H20V0Z" fill="white"/>
</mask>
<g mask="url(#mask0_2039_6616)">
<path d="M14.5417 18.9584C13.6 18.9584 12.6083 18.7334 11.5833 18.3C10.5833 17.875 9.57499 17.2917 8.59166 16.5834C7.61666 15.8667 6.67499 15.0667 5.78332 14.1917C4.89999 13.3 4.09999 12.3584 3.39166 11.3917C2.67499 10.3917 2.09999 9.39169 1.69166 8.42502C1.25832 7.39169 1.04166 6.39169 1.04166 5.45002C1.04166 4.80002 1.15832 4.18335 1.38332 3.60835C1.61666 3.01669 1.99166 2.46669 2.49999 1.99169C3.14166 1.35835 3.87499 1.04169 4.65832 1.04169C4.98332 1.04169 5.31666 1.11669 5.59999 1.25002C5.92499 1.40002 6.19999 1.62502 6.39999 1.92502L8.33332 4.65002C8.50832 4.89169 8.64166 5.12502 8.73332 5.35835C8.84166 5.60835 8.89999 5.85835 8.89999 6.10002C8.89999 6.41669 8.80832 6.72502 8.63332 7.01669C8.50832 7.24169 8.31666 7.48335 8.07499 7.72502L7.50832 8.31669C7.51666 8.34169 7.52499 8.35835 7.53332 8.37502C7.63332 8.55002 7.83332 8.85002 8.21666 9.30002C8.62499 9.76669 9.00832 10.1917 9.39166 10.5834C9.88332 11.0667 10.2917 11.45 10.675 11.7667C11.15 12.1667 11.4583 12.3667 11.6417 12.4584L11.625 12.5L12.2333 11.9C12.4917 11.6417 12.7417 11.45 12.9833 11.325C13.4417 11.0417 14.025 10.9917 14.6083 11.2334C14.825 11.325 15.0583 11.45 15.3083 11.625L18.075 13.5917C18.3833 13.8 18.6083 14.0667 18.7417 14.3834C18.8667 14.7 18.925 14.9917 18.925 15.2834C18.925 15.6834 18.8333 16.0834 18.6583 16.4584C18.4833 16.8334 18.2667 17.1584 17.9917 17.4584C17.5167 17.9834 17 18.3584 16.4 18.6C15.825 18.8334 15.2 18.9584 14.5417 18.9584Z" fill="black"/>
</g>
</g>
<defs>
<clipPath id="clip0_2039_6616">
<rect width="20" height="20" fill="white"/>
</clipPath>
</defs>
</svg>`;

const LOCATION_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M9.66668 7.00038C9.66668 6.07953 8.92053 5.33337 8.00036 5.33337C7.07951 5.33337 6.33335 6.07953 6.33335 7.00038C6.33335 7.92055 7.07951 8.66671 8.00036 8.66671C8.92053 8.66671 9.66668 7.92055 9.66668 7.00038Z" stroke="black" stroke-linecap="round" stroke-linejoin="round"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M7.99967 14C7.20069 14 3 10.5989 3 7.04219C3 4.25776 5.23807 2 7.99967 2C10.7613 2 13 4.25776 13 7.04219C13 10.5989 8.79866 14 7.99967 14Z" stroke="black" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const NOTE_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_2039_6920)">
<mask id="mask0_2039_6920" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
<path d="M24 0H0V24H24V0Z" fill="white"/>
</mask>
<g mask="url(#mask0_2039_6920)">
<path d="M8 2V5" stroke="black" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M16 2V5" stroke="black" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7 13H15" stroke="black" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7 17H12" stroke="black" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M16 3.5C19.33 3.68 21 4.95 21 9.65V15.83C21 19.95 20 22.01 15 22.01H9C4 22.01 3 19.95 3 15.83V9.65C3 4.95 4.67 3.69 8 3.5H16Z" stroke="black" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
</g>
</g>
<defs>
<clipPath id="clip0_2039_6920">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
`;

const CALL_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_2039_6941)">
<path d="M8.66668 0.666633C8.66668 0.489822 8.73692 0.320252 8.86194 0.195228C8.98697 0.0702039 9.15653 -3.39878e-05 9.33335 -3.39878e-05C11.1009 0.00190708 12.7954 0.704909 14.0452 1.95473C15.2951 3.20455 15.9981 4.89912 16 6.66663C16 6.84344 15.9298 7.01301 15.8048 7.13804C15.6797 7.26306 15.5102 7.3333 15.3333 7.3333C15.1565 7.3333 14.987 7.26306 14.8619 7.13804C14.7369 7.01301 14.6667 6.84344 14.6667 6.66663C14.6651 5.25263 14.1027 3.897 13.1028 2.89715C12.103 1.8973 10.7473 1.33489 9.33335 1.3333C9.15653 1.3333 8.98697 1.26306 8.86194 1.13804C8.73692 1.01301 8.66668 0.843444 8.66668 0.666633ZM9.33335 3.99997C10.0406 3.99997 10.7189 4.28092 11.219 4.78101C11.7191 5.28111 12 5.95939 12 6.66663C12 6.84344 12.0702 7.01301 12.1953 7.13804C12.3203 7.26306 12.4899 7.3333 12.6667 7.3333C12.8435 7.3333 13.0131 7.26306 13.1381 7.13804C13.2631 7.01301 13.3333 6.84344 13.3333 6.66663C13.3323 5.60609 12.9105 4.58929 12.1606 3.83937C11.4107 3.08946 10.3939 2.66769 9.33335 2.66663C9.15653 2.66663 8.98697 2.73687 8.86194 2.86189C8.73692 2.98692 8.66668 3.15649 8.66668 3.3333C8.66668 3.51011 8.73692 3.67968 8.86194 3.8047C8.98697 3.92973 9.15653 3.99997 9.33335 3.99997ZM15.3953 11.1593C15.7817 11.5467 15.9986 12.0715 15.9986 12.6186C15.9986 13.1658 15.7817 13.6906 15.3953 14.078L14.7887 14.7773C9.32868 20.0046 -3.95799 6.7213 1.18868 1.24397L1.95534 0.577299C2.34319 0.201751 2.8633 -0.00600127 3.40315 -0.00101076C3.943 0.00397975 4.45917 0.221312 4.84001 0.603966C4.86068 0.624633 6.09601 2.2293 6.09601 2.2293C6.46256 2.61438 6.66661 3.12592 6.66575 3.65757C6.66488 4.18922 6.45916 4.70008 6.09134 5.08397L5.31934 6.05463C5.74658 7.09271 6.37472 8.03613 7.16768 8.8307C7.96065 9.62526 8.9028 10.2553 9.94001 10.6846L10.9167 9.90796C11.3006 9.54044 11.8114 9.33496 12.3429 9.33422C12.8744 9.33347 13.3857 9.53752 13.7707 9.90396C13.7707 9.90396 15.3747 11.1386 15.3953 11.1593ZM14.478 12.1286C14.478 12.1286 12.8827 10.9013 12.862 10.8806C12.7247 10.7445 12.5391 10.668 12.3457 10.668C12.1523 10.668 11.9667 10.7445 11.8293 10.8806C11.8113 10.8993 10.4667 11.9706 10.4667 11.9706C10.3761 12.0428 10.2682 12.09 10.1538 12.1078C10.0393 12.1256 9.92223 12.1132 9.81401 12.072C8.47032 11.5717 7.24984 10.7885 6.23523 9.77535C5.22063 8.76225 4.43561 7.54292 3.93334 6.19997C3.88881 6.09027 3.87429 5.97069 3.89128 5.85352C3.90827 5.73636 3.95615 5.62583 4.03001 5.5333C4.03001 5.5333 5.10134 4.18797 5.11934 4.17063C5.25552 4.03329 5.33193 3.84771 5.33193 3.6543C5.33193 3.46089 5.25552 3.27531 5.11934 3.13797C5.09868 3.11797 3.87134 1.5213 3.87134 1.5213C3.73194 1.3963 3.55001 1.32936 3.36284 1.3342C3.17567 1.33903 2.99744 1.41527 2.86468 1.5473L2.09801 2.21397C-1.66332 6.73663 9.85068 17.612 13.814 13.8666L14.4213 13.1666C14.5637 13.0348 14.6491 12.8528 14.6597 12.6591C14.6703 12.4654 14.6051 12.2752 14.478 12.1286Z" fill="black"/>
</g>
<defs>
<clipPath id="clip0_2039_6941">
<rect width="16" height="16" fill="white"/>
</clipPath>
</defs>
</svg>
`;

const BELL_SVG = `<svg width="13" height="15" viewBox="0 0 13 15" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M4.88282 12.7373C5.22815 13.122 5.67148 13.3333 6.13148 13.3333H6.13215C6.59415 13.3333 7.03948 13.122 7.38548 12.7367C7.57082 12.532 7.88682 12.5153 8.09148 12.7C8.29682 12.8847 8.31349 13.2013 8.12882 13.406C7.59015 14.004 6.88148 14.3333 6.13215 14.3333H6.13082C5.38348 14.3327 4.67615 14.0033 4.13948 13.4053C3.95482 13.2007 3.97148 12.884 4.17682 12.7C4.38215 12.5147 4.69815 12.5313 4.88282 12.7373ZM6.16468 0C9.12802 0 11.1187 2.308 11.1187 4.46333C11.1187 5.572 11.4007 6.042 11.7 6.54067C11.996 7.03266 12.3314 7.59133 12.3314 8.64733C12.0987 11.3453 9.28202 11.5653 6.16468 11.5653C3.04735 11.5653 0.230018 11.3453 8.82422e-06 8.69C-0.00198227 7.59133 0.333351 7.03266 0.629351 6.54067L0.733847 6.36477C0.991134 5.92257 1.21068 5.44157 1.21068 4.46333C1.21068 2.308 3.20135 0 6.16468 0ZM6.16468 1C3.83468 1 2.21068 2.82533 2.21068 4.46333C2.21068 5.84933 1.82602 6.49 1.48602 7.05533C1.21335 7.50933 0.998018 7.868 0.998018 8.64733C1.10935 9.90466 1.93935 10.5653 6.16468 10.5653C10.3667 10.5653 11.2227 9.87533 11.3334 8.604C11.3314 7.868 11.116 7.50933 10.8434 7.05533C10.5034 6.49 10.1187 5.84933 10.1187 4.46333C10.1187 2.82533 8.49468 1 6.16468 1Z" fill="black"/>
</svg>`;

const CHECK_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_2039_6704)">
<mask id="mask0_2039_6704" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
<path d="M24 0H0V24H24V0Z" fill="white"/>
</mask>
<g mask="url(#mask0_2039_6704)">
<path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM16.78 9.7L11.11 15.37C10.97 15.51 10.78 15.59 10.58 15.59C10.38 15.59 10.19 15.51 10.05 15.37L7.22 12.54C6.93 12.25 6.93 11.77 7.22 11.48C7.51 11.19 7.99 11.19 8.28 11.48L10.58 13.78L15.72 8.64C16.01 8.35 16.49 8.35 16.78 8.64C17.07 8.93 17.07 9.4 16.78 9.7Z" fill="white"/>
</g>
</g>
<defs>
<clipPath id="clip0_2039_6704">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>`;

const WARN_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_2039_6713)">
<mask id="mask0_2039_6713" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="14" height="14">
<path d="M14 0H0V14H14V0Z" fill="white"/>
</mask>
<g mask="url(#mask0_2039_6713)">
<path d="M6.27084 1.42939C6.67917 1.08522 7.33834 1.08522 7.735 1.42939L8.65667 2.21689C8.83167 2.36272 9.16417 2.48522 9.3975 2.48522H10.3892C11.0075 2.48522 11.515 2.99272 11.515 3.61106V4.60272C11.515 4.83606 11.6375 5.16272 11.7833 5.33772L12.5708 6.25938C12.915 6.66772 12.915 7.32688 12.5708 7.72355L11.7833 8.64522C11.6375 8.82022 11.515 9.14688 11.515 9.38022V10.3719C11.515 10.9902 11.0075 11.4977 10.3892 11.4977H9.3975C9.16417 11.4977 8.8375 11.6202 8.6625 11.7661L7.74084 12.5536C7.3325 12.8977 6.67334 12.8977 6.27667 12.5536L5.35501 11.7661C5.18001 11.6202 4.8475 11.4977 4.62 11.4977H3.59917C2.98084 11.4977 2.47334 10.9902 2.47334 10.3719V9.37438C2.47334 9.14688 2.35667 8.81438 2.21084 8.64522L1.42334 7.71772C1.085 7.31522 1.085 6.66188 1.42334 6.25938L2.21084 5.33189C2.35667 5.15689 2.47334 4.83022 2.47334 4.60272V3.61689C2.47334 2.99856 2.98084 2.49106 3.59917 2.49106H4.60834C4.84167 2.49106 5.16834 2.36856 5.34334 2.22272L6.27084 1.42939Z" stroke="#7C7890" stroke-width="0.875" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7.00003 4.74304V7.56057" stroke="#7C7890" stroke-width="0.875" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6.99683 9.33337H7.00208" stroke="#7C7890" stroke-width="1.16667" stroke-linecap="round" stroke-linejoin="round"/>
</g>
</g>
<defs>
<clipPath id="clip0_2039_6713">
<rect width="14" height="14" fill="white"/>
</clipPath>
</defs>
</svg>`;
const PROFILE_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9615 11.8921H11.9925C14.8245 11.8921 17.1285 9.58814 17.1285 6.75614C17.1285 3.92414 14.8245 1.61914 11.9925 1.61914C9.15959 1.61914 6.8556 3.92414 6.8556 6.75314C6.8506 8.12214 7.3796 9.41014 8.3436 10.3811C9.30659 11.3511 10.5915 11.8881 11.9615 11.8921ZM8.3556 6.75614C8.3556 4.75114 9.98759 3.11914 11.9925 3.11914C13.9975 3.11914 15.6285 4.75114 15.6285 6.75614C15.6285 8.76114 13.9975 10.3921 11.9925 10.3921H11.9645C10.9965 10.3901 10.0895 10.0101 9.40759 9.32314C8.7256 8.63714 8.3526 7.72614 8.3556 6.75614Z" fill="#000"/><path fill-rule="evenodd" clip-rule="evenodd" d="M4.40549 18.7558C4.40549 22.3808 10.1215 22.3808 11.9995 22.3808C13.8775 22.3808 19.5945 22.3808 19.5945 18.7338C19.5945 15.9408 16.1165 13.5808 11.9995 13.5808C7.88349 13.5808 4.40549 15.9508 4.40549 18.7558ZM5.90549 18.7558C5.90549 17.0208 8.51149 15.0808 11.9995 15.0808C15.4885 15.0808 18.0945 17.0098 18.0945 18.7338C18.0945 20.1578 16.0435 20.8808 11.9995 20.8808C7.95649 20.8808 5.90549 20.1658 5.90549 18.7558Z" fill="#000"/></svg>`;

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderItem = {
  id: string;
  qty: number;
  name: string;
  price: number;
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const ORDER_ITEMS: OrderItem[] = [
  { id: "1", qty: 2, name: "Chicken Burger", price: 12000 },
  { id: "2", qty: 1, name: "Pepsi", price: 1500 },
];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function RestaurantCard({ rtl, font, t }: { rtl: boolean; font: any; t: any }) {
  const row = rtl ? "row-reverse" : "row";
  const align = rtl ? "right" : "left";
  return (
    <View style={cardStyles.card}>
      <View style={[cardStyles.topRow, { flexDirection: row }]}>
        <View style={cardStyles.logoWrap}>
          <Image
            source={{
              uri: "https://tse1.mm.bing.net/th/id/OIP.AiK2XKBbcs31B24ebg5mAQHaGL?rs=1&pid=ImgDetMain",
            }}
            style={cardStyles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={{ flex: 1, marginHorizontal: scale(12) }}>
          <Text
            style={[
              cardStyles.bizName,
              { fontFamily: font.bold, textAlign: align },
            ]}
          >
            The Grill Restaurant
          </Text>
          <View style={[cardStyles.locRow, { flexDirection: row }]}>
            <SvgXml xml={LOCATION_SVG} width={scale(14)} height={scale(14)} />
            <Text style={[cardStyles.locText, { fontFamily: font.regular }]}>
              Sulaimany-baxtyari
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        activeOpacity={0.85}
        style={cardStyles.navBtn}
        onPress={() => router.push("/orders/delivery_route")}
      >
        <SvgXml xml={NAV_SVG} width={scale(20)} height={scale(20)} />
        <Text style={[cardStyles.navBtnText, { fontFamily: font.bold }]}>
          {t("delivery.navigateToRestaurant")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function CustomerCard({ rtl, font, t }: { rtl: boolean; font: any; t: any }) {
  const row = rtl ? "row-reverse" : "row";
  const align = rtl ? "right" : "left";
  return (
    <View style={cardStyles.card}>
      <View style={[cardStyles.customerHeader, { flexDirection: row }]}>
        <View style={cardStyles.avatarCircle}>
          <SvgXml xml={PROFILE_SVG} width={scale(22)} height={scale(22)} />
        </View>
        <View style={{ flex: 1, marginHorizontal: scale(12) }}>
          <Text
            style={[
              cardStyles.customerName,
              { fontFamily: font.bold, textAlign: align },
            ]}
          >
            Ahmed J.
          </Text>
          <Text
            style={[
              cardStyles.customerRole,
              {
                fontFamily: font.semibold,
                textAlign: align,
                letterSpacing: rtl ? 0 : 1.2,
              },
            ]}
          >
            {t("delivery.customer")}
          </Text>
        </View>
        <View style={[cardStyles.actionBtns, { flexDirection: row }]}>
          <TouchableOpacity style={cardStyles.actionBtn} activeOpacity={0.8}>
            <SvgXml xml={CHAT_SVG} width={scale(20)} height={scale(20)} />
          </TouchableOpacity>
          <TouchableOpacity style={cardStyles.actionBtn} activeOpacity={0.8}>
            <SvgXml xml={PHONE_SVG} width={scale(20)} height={scale(20)} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={[cardStyles.customerLocRow, { flexDirection: row }]}>
        <SvgXml xml={LOCATION_SVG} width={scale(15)} height={scale(15)} />
        <Text
          style={[cardStyles.customerLocText, { fontFamily: font.regular }]}
        >
          Sulaimany - Sarshaqam
        </Text>
      </View>
      <TouchableOpacity activeOpacity={0.85} style={cardStyles.navBtn}>
        <SvgXml xml={NAV_SVG} width={scale(20)} height={scale(20)} />
        <Text style={[cardStyles.navBtnText, { fontFamily: font.bold }]}>
          {t("delivery.navigateToCustomer")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function OrderItemsCard({ rtl, font, t }: { rtl: boolean; font: any; t: any }) {
  const row = rtl ? "row-reverse" : "row";
  const align = rtl ? "right" : "left";
  const total = ORDER_ITEMS.reduce((s, i) => s + i.price, 0);
  return (
    <View style={[cardStyles.card, { paddingBottom: spacing.lg }]}>
      <Text
        style={[
          cardStyles.sectionLabel,
          {
            fontFamily: font.semibold,
            textAlign: align,
            letterSpacing: rtl ? 0 : 1.2,
          },
        ]}
      >
        {t("delivery.orderItems")}
      </Text>
      {ORDER_ITEMS.map((item) => (
        <View key={item.id}>
          <View style={[cardStyles.itemRow, { flexDirection: row }]}>
            <Text
              style={[
                cardStyles.itemQty,
                { fontFamily: font.bold, color: "#7B3FEE" },
              ]}
            >
              {item.qty}×
            </Text>
            <Text
              style={[
                cardStyles.itemName,
                { fontFamily: font.regular, textAlign: align },
              ]}
            >
              {item.name}
            </Text>
            <Text style={[cardStyles.itemPrice, { fontFamily: font.semibold }]}>
              {item.price.toLocaleString()} {t("common.iqd")}
            </Text>
          </View>
        </View>
      ))}
      <View style={cardStyles.totalDivider} />
      <View style={[cardStyles.itemRow, { flexDirection: row }]}>
        <Text
          style={[
            cardStyles.totalLabel,
            { fontFamily: font.bold, textAlign: align },
          ]}
        >
          {t("delivery.total")}
        </Text>
        <Text style={[cardStyles.totalPrice, { fontFamily: font.bold }]}>
          {total.toLocaleString()} {t("common.iqd")}
        </Text>
      </View>
    </View>
  );
}

// ─── ✅ UPDATED DeliveryNoteCard ──────────────────────────────────────────────

function DeliveryNoteCard({
  rtl,
  font,
  t,
}: {
  rtl: boolean;
  font: any;
  t: any;
}) {
  const row = rtl ? "row-reverse" : "row";
  const align = rtl ? "right" : "left";

  return (
    <View style={[cardStyles.card, cardStyles.noteCard]}>
      {/* Row 1: Note icon + "Delivery Note" label */}
      <View style={[cardStyles.noteLabelRow, { flexDirection: row }]}>
        <SvgXml xml={NOTE_SVG} width={scale(25)} height={scale(25)} />
        <Text style={[cardStyles.noteLabel, { fontFamily: font.semibold }]}>
          {t("delivery.deliveryNote")}
        </Text>
      </View>
      {/* Row 2: Bold message */}
      <Text
        style={[
          cardStyles.noteMessage,
          { fontFamily: font.bold, textAlign: align },
        ]}
      >
        {t("delivery.noteContent")}
      </Text>

      {/* Row 3: Two option cards */}
      <View style={[cardStyles.noteOptions, { flexDirection: row }]}>
        {/* Call option */}
        <View style={cardStyles.noteOption}>
          {/* Title + icon in a row */}
          <View style={[cardStyles.noteOptionTopRow, { flexDirection: row }]}>
            <Text
              style={[cardStyles.noteOptionTitle, { fontFamily: font.bold }]}
            >
              {t("delivery.call")}
            </Text>
            <View style={cardStyles.noteOptionIconBox}>
              <SvgXml xml={CALL_SVG} width={scale(18)} height={scale(18)} />
            </View>
          </View>
          {/* Sub text */}
          <Text
            style={[
              cardStyles.noteOptionSub,
              { fontFamily: font.regular, textAlign: align },
            ]}
          >
            {t("delivery.callDesc")}
          </Text>
        </View>

        {/* Ringing option */}
        <View style={cardStyles.noteOption}>
          <View style={[cardStyles.noteOptionTopRow, { flexDirection: row }]}>
            <Text
              style={[cardStyles.noteOptionTitle, { fontFamily: font.bold }]}
            >
              {t("delivery.ringing")}
            </Text>
            <View style={cardStyles.noteOptionIconBox}>
              <SvgXml xml={BELL_SVG} width={scale(16)} height={scale(16)} />
            </View>
          </View>
          <Text
            style={[
              cardStyles.noteOptionSub,
              { fontFamily: font.regular, textAlign: align },
            ]}
          >
            {t("delivery.ringingDesc")}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ActiveDeliveryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = isRTL(i18n.language);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View
        style={{
          paddingTop: insets.top + verticalScale(8),
        }}
      >
        <OrderHeader
          orderNumber={8821}
          statusKey="delivery.activeDelivery"
          statusFallback="ACTIVE DELIVERY"
          estimatedEarnings={13500}
          currencyKey="common.iqd"
          currencyFallback="IQD"
          onBack={() => router.back()}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + verticalScale(120) },
        ]}
      >
        <View style={styles.section}>
          <OrderProgressCard
            shopStatus="active"
            pickupStatus="inactive"
            deliverStatus="inactive"
            shopLabel={t("delivery.goToShop")}
            pickupLabel={t("delivery.pickUp")}
            deliverLabel={t("delivery.deliver")}
            distance="3.2 km"
            duration="18 min"
            paymentMethod="CASH"
            activeColor="#6B21E8"
          />
        </View>

        <View style={styles.section}>
          <RestaurantCard rtl={rtl} font={font} t={t} />
        </View>

        <View style={styles.section}>
          <CustomerCard rtl={rtl} font={font} t={t} />
        </View>

        <View style={styles.section}>
          <OrderItemsCard rtl={rtl} font={font} t={t} />
        </View>

        <View style={styles.section}>
          <DeliveryNoteCard rtl={rtl} font={font} t={t} />
        </View>
      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + verticalScale(8) },
        ]}
      >
        <LinearGradient
          colors={["#BC99FF", "#8140FF", "#BA97FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.arrivedBtn}
        >
          <TouchableOpacity activeOpacity={0.88} style={styles.arrivedBtnInner}>
            <SvgXml xml={CHECK_SVG} width={scale(22)} height={scale(22)} />
            <Text
              style={[
                styles.arrivedBtnText,
                { fontFamily: font.bold, letterSpacing: rtl ? 0 : 0.3 },
              ]}
            >
              {t("delivery.arrivedAtRestaurant")}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity style={styles.reportRow} activeOpacity={0.7}>
          <SvgXml xml={WARN_SVG} width={scale(15)} height={scale(15)} />
          <Text style={[styles.reportText, { fontFamily: font.regular }]}>
            {t("delivery.reportIssue")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Card Styles ──────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: scale(32),
    borderColor: Colors.inputBg,
    borderWidth: 1,
    paddingHorizontal: scale(16),
    paddingVertical: scale(18),
  },

  // Restaurant
  topRow: { alignItems: "center", marginBottom: scale(16) },
  logoWrap: {
    width: scale(58),
    height: scale(58),
    borderRadius: scale(29),
    borderWidth: 1,
    borderColor: Colors.primary,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: scale(50), height: scale(50) },
  bizName: { fontSize: scale(16), color: "#1A1A2E", marginBottom: scale(4) },
  locRow: { alignItems: "center", gap: scale(4) },
  locText: { fontSize: scale(13), color: "#7C7890" },
  navBtn: {
    backgroundColor: "#1A1A2E",
    borderRadius: scale(99),
    paddingVertical: scale(17),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
  },
  navBtnText: { fontSize: scale(15), color: "#FFFFFF" },

  // Customer
  customerHeader: { alignItems: "center", marginBottom: scale(12) },
  avatarCircle: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: "#0000001A",
    borderWidth: 1,
    borderColor: "#00000033",
    alignItems: "center",
    justifyContent: "center",
  },
  customerName: { fontSize: scale(16), color: "#1A1A2E" },
  customerRole: {
    fontSize: scale(11),
    color: Colors.textMuted,
    textTransform: "uppercase",
    marginTop: scale(2),
  },
  actionBtns: { gap: scale(10) },
  actionBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  customerLocRow: {
    alignItems: "center",
    gap: scale(6),
    backgroundColor: "#F9FAFB",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    paddingHorizontal: scale(12),
    paddingVertical: scale(13),
    marginBottom: scale(14),
  },
  customerLocText: { fontSize: scale(13), color: "#7C7890" },

  // Order Items
  sectionLabel: {
    fontSize: scale(11),
    color: "#9A9AAF",
    textTransform: "uppercase",
    marginBottom: scale(14),
  },
  itemRow: { alignItems: "center", paddingVertical: scale(10), gap: scale(8) },
  itemQty: { fontSize: scale(14), width: scale(28) },
  itemName: { flex: 1, fontSize: scale(15), color: "#1A1A2E" },
  itemPrice: { fontSize: scale(14), color: "#1A1A2E" },
  totalDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: scale(4),
  },
  totalLabel: { flex: 1, fontSize: scale(15), color: "#1A1A2E" },
  totalPrice: { fontSize: scale(15), color: "#1A1A2E" },

  // ─── Delivery Note (updated) ───────────────────────────────────────────────
  noteCard: {
    backgroundColor: "#FAF7FF",
    borderColor: "#E9DEFF",
  },

  // "Delivery Note" label row: icon + purple text
  noteLabelRow: {
    alignItems: "center",
    gap: scale(6),
    marginBottom: scale(6),
  },
  noteLabel: {
    fontSize: scale(13),
    color: "#8B5CF6",
  },

  // Bold message below label
  noteMessage: {
    fontSize: scale(15),
    color: "#1A1A2E",
    marginBottom: scale(14),
  },

  // Two cards side by side
  noteOptions: {
    gap: scale(10),
  },
  noteOption: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: scale(24),
    padding: scale(12),
    gap: scale(6),
    borderWidth: 1,
    borderColor: "#F0EAF8",
  },

  // Title on left, icon circle on right
  noteOptionTopRow: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scale(4),
  },
  noteOptionTitle: {
    fontSize: scale(14),
    color: "#1A1A2E",
  },
  noteOptionIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  noteOptionSub: {
    fontSize: scale(12),
    color: "#9A9AAF",
    lineHeight: scale(18),
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
    gap: verticalScale(14),
  },
  section: {},
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    backgroundColor: Colors.background,
    gap: verticalScale(10),
    borderColor: Colors.inputBg,
    borderWidth: 1,
    borderStyle: "solid",
    borderTopStartRadius: scale(35),
    borderTopEndRadius: scale(35),
  },
  arrivedBtn: { borderRadius: scale(99), overflow: "hidden" },
  arrivedBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(17),
    gap: scale(10),
  },
  arrivedBtnText: { fontSize: scale(17), color: "#FFFFFF" },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
  },
  reportText: { fontSize: scale(13), color: Colors.textSecondary },
});
