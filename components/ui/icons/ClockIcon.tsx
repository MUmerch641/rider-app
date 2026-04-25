import Svg, { Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

export function ClockIcon({ size = 16, color = "#7C7890" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M14.6666 8.00016C14.6666 11.6802 11.68 14.6668 7.99998 14.6668C4.31998 14.6668 1.33331 11.6802 1.33331 8.00016C1.33331 4.32016 4.31998 1.3335 7.99998 1.3335C11.68 1.3335 14.6666 4.32016 14.6666 8.00016Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.4734 10.1202L8.40669 8.88684C8.04669 8.6735 7.75336 8.16017 7.75336 7.74017V5.00684"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
