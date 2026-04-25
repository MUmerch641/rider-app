import React from "react";
import Svg, { Path } from "react-native-svg";

interface IconProps {
  size?: number;
  bgColor?: string;
  borderColor?: string;
  iconColor?: string;
}

export function CartAvatarIcon({
  size = 44,
  bgColor = "#9B72E0",
  borderColor = "#F2E9FF",
  iconColor = "white",
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <Path
        d="M19.4642 17.8556C21.3892 17.7648 24.0292 17.5431 24.9233 17.5315C25.7775 17.5206 26.7025 17.409 27.505 17.7698C30.2575 19.009 29.0967 23.9881 27.1942 25.4664C25.8683 26.4964 23.7483 26.5731 22.1392 26.5314C20.6458 26.4939 18.8442 26.3231 17.5875 25.4281C15.4217 23.8856 16.5533 19.6823 16.4825 16.8081C16.525 15.1998 14.7792 14.939 14.7792 14.939"
        stroke={iconColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22.6959 20.7722H25.0068"
        stroke={iconColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.9157 28.7947C18.1657 28.7947 18.369 28.998 18.369 29.248C18.369 29.4988 18.1657 29.7022 17.9157 29.7022C17.6649 29.7022 17.4615 29.4988 17.4615 29.248C17.4615 28.998 17.6649 28.7947 17.9157 28.7947Z"
        fill={iconColor}
        stroke={iconColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M26.5249 28.7947C26.7757 28.7947 26.979 28.998 26.979 29.248C26.979 29.4988 26.7757 29.7022 26.5249 29.7022C26.2749 29.7022 26.0715 29.4988 26.0715 29.248C26.0715 28.998 26.2749 28.7947 26.5249 28.7947Z"
        fill={iconColor}
        stroke={iconColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
