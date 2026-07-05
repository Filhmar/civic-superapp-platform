import { Text, type TextProps } from "react-native";

type Variant = "title" | "subtitle" | "body" | "caption";

const VARIANT_CLASSES: Record<Variant, string> = {
  title: "text-2xl font-bold text-fg dark:text-fg-dark",
  subtitle: "text-base font-semibold text-fg dark:text-fg-dark",
  body: "text-base text-fg dark:text-fg-dark",
  caption: "text-xs text-fg-2 dark:text-fg-2-dark",
};

interface AppTextProps extends TextProps {
  variant?: Variant;
  className?: string;
}

/** Themed text with a small set of variants. */
export function AppText({
  variant = "body",
  className = "",
  ...rest
}: AppTextProps) {
  return <Text className={`${VARIANT_CLASSES[variant]} ${className}`} {...rest} />;
}
