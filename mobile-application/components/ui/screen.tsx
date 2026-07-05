import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenProps extends ViewProps {
  children: ReactNode;
  /** Extra Tailwind classes appended to the base screen styles. */
  className?: string;
  /** Apply top safe-area inset (default true). */
  padTop?: boolean;
}

/** Themed full-screen wrapper with safe-area padding. */
export function Screen({
  children,
  className = "",
  padTop = true,
  style,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 bg-bg dark:bg-bg-dark ${className}`}
      style={[
        { paddingTop: padTop ? insets.top : 0, paddingBottom: insets.bottom },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
