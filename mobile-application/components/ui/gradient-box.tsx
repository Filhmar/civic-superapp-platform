/**
 * Gradient container built with react-native-svg (STACK_BASIS §4 — no
 * expo-linear-gradient native dep). Children render above the gradient.
 */
import { useState, type ReactNode } from "react";
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
  testID?: string;
  children?: ReactNode;
}

let gradientCounter = 0;

export function GradientBox({
  stops,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  className,
  testID,
  children,
}: GradientBoxProps) {
  // Stable-enough unique id per mount (SSR-safe: deterministic ordering).
  const id = `grad-${(gradientCounter = (gradientCounter + 1) % 1e6)}`;
  // Opaque base = the middle stop. react-native-svg's <Svg> layer lets the
  // view background bleed through slightly; a dark app bg keeps it saturated
  // but a LIGHT bg washes the gradient out (and drops white-text contrast).
  // The base guarantees a solid same-hue backing in either theme.
  const baseColor = stops.length
    ? stops[Math.floor((stops.length - 1) / 2)].color
    : undefined;
  // Percentage Svg sizing is unreliable on Android (Fabric): the gradient rect
  // can end up covering only part of the container, leaving a hard seam where
  // the base color shows. Measure and size in numeric pixels instead; the
  // opaque base color fills the frame until the first layout pass.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View
      testID={testID}
      className={className}
      style={[{ overflow: "hidden", backgroundColor: baseColor }, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((prev) =>
          prev && prev.w === width && prev.h === height
            ? prev
            : { w: width, h: height },
        );
      }}
    >
      {size !== null && size.w > 0 && size.h > 0 && (
        <Svg
          testID={testID ? `${testID}-svg` : undefined}
          style={StyleSheet.absoluteFill}
          width={size.w}
          height={size.h}
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
          <Rect width={size.w} height={size.h} fill={`url(#${id})`} />
        </Svg>
      )}
      {children}
    </View>
  );
}
