import Svg, { Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

export function SendIcon({ size = 28, color = "#ffffff" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 17 15" fill="none">
      <Path
        d="M6.68729 7.49413H2.28848L0.817495 1.6422C0.808075 1.60819 0.802338 1.57327 0.800382 1.53803C0.784012 1.00157 1.37479 0.629551 1.88669 0.875087L15.6813 7.49413L1.88669 14.1132C1.38074 14.3565 0.797405 13.9949 0.800382 13.4681C0.801888 13.421 0.810157 13.3744 0.824935 13.3297L1.91645 9.72628"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
