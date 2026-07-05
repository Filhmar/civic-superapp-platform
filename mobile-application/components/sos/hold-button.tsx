/**
 * Hold-to-activate SOS button: 3s long-press with an animated progress ring
 * (Reanimated animatedProps on an SVG circle — no animated transform on <G>,
 * per STACK_BASIS §15).
 */
import { Siren } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HOLD_MS = 3000;
const SIZE = 200;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface HoldButtonProps {
  onActivate: () => void;
  disabled?: boolean;
  ringColor?: string;
}

export function SosHoldButton({
  onActivate,
  disabled,
  ringColor = "#FFFFFF",
}: HoldButtonProps) {
  const progress = useSharedValue(0);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const start = () => {
    if (disabled) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: HOLD_MS }, (finished) => {
      if (finished) runOnJS(onActivate)();
    });
  };

  const cancel = () => {
    cancelAnimation(progress);
    progress.value = withTiming(0, { duration: 200 });
  };

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Svg width={SIZE} height={SIZE} style={{ position: "absolute" }}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={ringColor}
          strokeOpacity={0.25}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={ringColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          animatedProps={animatedProps}
          fill="none"
          // Start at 12 o'clock.
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hold for 3 seconds to send SOS"
        onPressIn={start}
        onPressOut={cancel}
        disabled={disabled}
        className="m-4 flex-1 items-center justify-center rounded-full bg-danger active:opacity-90"
      >
        <Siren size={44} color="white" />
        <Text className="mt-1 text-xl font-bold text-white">SOS</Text>
        <Text className="text-[10px] text-white/80">hold 3s</Text>
      </Pressable>
    </View>
  );
}
