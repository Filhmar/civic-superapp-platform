/**
 * Gradient container built with react-native-svg (STACK_BASIS §4 — no
 * expo-linear-gradient native dep). Children render above the gradient.
 */
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from "react-native-svg";

export interface GradientStop {
  color: string;
  /** 0..1 */
  offset: number;
}

interface GradientBoxProps {
  stops: GradientStop[];
  /** Gradient direction as unit-box coords. Default ≈ 135deg. */
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
  className?: string;
  children?: ReactNode;
}

let gradientCounter = 0;

export function GradientBox({
  stops,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  className,
  children,
}: GradientBoxProps) {
  // Stable-enough unique id per mount (SSR-safe: deterministic ordering).
  const id = `grad-${(gradientCounter = (gradientCounter + 1) % 1e6)}`;
  return (
    <View className={className} style={[{ overflow: "hidden" }, style]}>
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <Defs>
          <SvgLinearGradient
            id={id}
            x1={String(start.x)}
            y1={String(start.y)}
            x2={String(end.x)}
            y2={String(end.y)}
          >
            {stops.map((stop) => (
              <Stop
                key={`${stop.offset}-${stop.color}`}
                offset={String(stop.offset)}
                stopColor={stop.color}
              />
            ))}
          </SvgLinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}
