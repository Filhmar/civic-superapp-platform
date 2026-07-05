import { Text, type TextProps } from "react-native";

type Variant =
  | "display"
  | "title"
  | "section"
  | "subtitle"
  | "body"
  | "caption"
  | "kicker";

/** DESIGN_SPEC §1 type scale (Plus Jakarta Sans). */
const VARIANT_CLASSES: Record<Variant, string> = {
  display:
    "text-[26px] leading-8 font-extrabold tracking-tight-5 text-fg dark:text-fg-dark",
  title: "text-xl font-extrabold tracking-tight-3 text-fg dark:text-fg-dark",
  section:
    "text-base font-extrabold tracking-tight-3 text-fg dark:text-fg-dark",
  subtitle: "text-sm font-bold tracking-tight-2 text-fg dark:text-fg-dark",
  body: "text-sm font-sans text-fg dark:text-fg-dark",
  caption: "text-[11.5px] font-sans text-fg-2 dark:text-fg-2-dark",
  kicker:
    "text-[10px] font-extrabold uppercase tracking-kicker text-fg-2 dark:text-fg-2-dark",
};

interface AppTextProps extends TextProps {
  variant?: Variant;
  className?: string;
}

/** Themed text with the design-system variants. */
export function AppText({
  variant = "body",
  className = "",
  ...rest
}: AppTextProps) {
  return <Text className={`${VARIANT_CLASSES[variant]} ${className}`} {...rest} />;
}
