import Svg, { Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

export function LocationIcon({ size = 20, color = "#7C7890" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.0834 8.75026C12.0834 7.5992 11.1507 6.6665 10.0004 6.6665C8.84938 6.6665 7.91669 7.5992 7.91669 8.75026C7.91669 9.90047 8.84938 10.8332 10.0004 10.8332C11.1507 10.8332 12.0834 9.90047 12.0834 8.75026Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.99959 17.5C9.00086 17.5 3.75 13.2486 3.75 8.80274C3.75 5.3222 6.54758 2.5 9.99959 2.5C13.4516 2.5 16.25 5.3222 16.25 8.80274C16.25 13.2486 10.9983 17.5 9.99959 17.5Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
