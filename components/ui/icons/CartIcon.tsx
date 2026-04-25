import Svg, { Path } from "react-native-svg";

interface IconProps {
  size?: number;
  colorPrimary?: string;
  colorSecondary?: string;
}

export function CartIcon({
  size = 24,
  colorPrimary = "#2859C5",
  colorSecondary = "#8FBFFA",
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1.18399 9.5L4.23999 20.5H19.76L22.816 9.5H1.18399Z"
        fill={colorSecondary}
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 22.5C6.79565 22.5 7.55871 22.1839 8.12132 21.6213C8.68393 21.0587 9 20.2956 9 19.5C9 18.7044 8.68393 17.9413 8.12132 17.3787C7.55871 16.8161 6.79565 16.5 6 16.5C5.20435 16.5 4.44129 16.8161 3.87868 17.3787C3.31607 17.9413 3 18.7044 3 19.5C3 20.2956 3.31607 21.0587 3.87868 21.6213C4.44129 22.1839 5.20435 22.5 6 22.5ZM18 22.5C18.7956 22.5 19.5587 22.1839 20.1213 21.6213C20.6839 21.0587 21 20.2956 21 19.5C21 18.7044 20.6839 17.9413 20.1213 17.3787C19.5587 16.8161 18.7956 16.5 18 16.5C17.2044 16.5 16.4413 16.8161 15.8787 17.3787C15.3161 17.9413 15 18.7044 15 19.5C15 20.2956 15.3161 21.0587 15.8787 21.6213C16.4413 22.1839 17.2044 22.5 18 22.5Z"
        fill={colorPrimary}
      />
      <Path
        d="M3.5 7.5V9.5H20.5V7.5L14.5 3L10.5 6L7.5 4.5L3.5 7.5Z"
        fill={colorPrimary}
      />
    </Svg>
  );
}
