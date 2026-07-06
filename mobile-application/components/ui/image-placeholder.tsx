/**
 * Branded fallback for a missing image asset: a brand-tint box (dark-mode
 * aware) with a centered muted glyph. Fills the slot it is given via `style`
 * (same dimensions/radius the real <Image> would have used).
 */
import { Image as ImageIcon, type LucideIcon } from "lucide-react-native";
import { View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";

import { palette } from "@/constants/colors";

export function ImagePlaceholder({
  icon: Icon = ImageIcon,
  style,
  iconSize = 26,
}: {
  icon?: LucideIcon;
  style?: StyleProp<ImageStyle>;
  iconSize?: number;
}) {
  return (
    <View
      style={style as StyleProp<ViewStyle>}
      className="h-full w-full items-center justify-center bg-tint dark:bg-surface-dark"
    >
      <Icon size={iconSize} color={palette["fg-2"]} strokeWidth={1.6} />
    </View>
  );
}
