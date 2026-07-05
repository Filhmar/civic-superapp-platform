/** Primary CTA per DESIGN_SPEC §4: 48-49 tall, r14, colored glow shadow. */
import { ActivityIndicator, Pressable, Text } from "react-native";

import { palette } from "@/constants/colors";
import { primaryGlow } from "@/constants/shadows";
import { useTenantConfig } from "@/contexts/tenant-config-context";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  className = "",
}: PrimaryButtonProps) {
  const { config } = useTenantConfig();
  const primary = config?.brand.colors.primary ?? palette.brand;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={disabled ? undefined : primaryGlow(primary)}
      className={`h-[49px] items-center justify-center rounded-[14px] bg-brand active:opacity-85 ${
        disabled ? "opacity-50" : ""
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className="text-[15px] font-bold text-white">{label}</Text>
      )}
    </Pressable>
  );
}

/** Ghost/secondary button: white, 1px line border. */
export function GhostButton({
  label,
  onPress,
  disabled,
  loading,
  className = "",
  danger,
}: PrimaryButtonProps & { danger?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={danger ? { borderColor: "rgba(229,57,53,0.4)" } : undefined}
      className={`h-[49px] items-center justify-center rounded-[14px] border bg-surface active:opacity-70 dark:bg-surface-dark ${
        danger ? "" : "border-line dark:border-line-dark"
      } ${disabled ? "opacity-50" : ""} ${className}`}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text
          className={`text-[15px] font-bold ${
            danger ? "text-danger" : "text-fg dark:text-fg-dark"
          }`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
