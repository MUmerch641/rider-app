import Svg, { Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

export function SearchIcon({ size = 28, color = "#0D0B12" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.1546 3.1665C18.6701 3.1665 23.1424 7.63761 23.1424 13.1543C23.1424 18.671 18.6701 23.142 13.1546 23.142C7.63798 23.142 3.16687 18.671 3.16687 13.1543C3.16687 7.63761 7.63798 3.1665 13.1546 3.1665Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M23.2154 21.5688C24.1242 21.5688 24.8609 22.3066 24.8609 23.2144C24.8609 24.1244 24.1242 24.8612 23.2154 24.8612C22.3064 24.8612 21.5686 24.1244 21.5686 23.2144C21.5686 22.3066 22.3064 21.5688 23.2154 21.5688Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
