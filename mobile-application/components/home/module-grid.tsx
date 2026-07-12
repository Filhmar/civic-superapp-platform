/**
 * Home module grid per DESIGN_SPEC §4: 4 columns, 52px pastel rounded-square
 * icon chips (r16) with saturated icons, 10.5/600 labels. The 10 config
 * modules plus 2 platform tiles (Hotlines, Digital ID) = 12 tiles.
 * Config-disabled tiles keep the required dimmed "Soon" treatment.
 */
import { useRouter } from "expo-router";
import { IdCard, PhoneCall } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { useToast } from "@/components/ui/toast";
import { palette } from "@/constants/colors";
import { MODULE_ROUTES } from "@/constants/modules";
import { tileShadow } from "@/constants/shadows";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { useThemeMode } from "@/contexts/theme-context";
import {
  DISABLED_TILE,
  deriveModuleTiles,
  resolveToneColors,
} from "@/lib/modules";

function Tile({
  label,
  bg,
  iconColor,
  icon: Icon,
  onPress,
  dimmed,
}: {
  label: string;
  bg: string;
  iconColor: string;
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  onPress: () => void;
  dimmed?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="w-[23%] items-center py-1.5 active:opacity-70"
    >
      <View
        style={[tileShadow, { backgroundColor: bg }]}
        className="h-[52px] w-[52px] items-center justify-center rounded-2xl"
      >
        <Icon size={22} color={iconColor} strokeWidth={1.9} />
      </View>
      <View className="mt-[7px] flex-row items-center gap-1">
        <Text
          className={`text-[10.5px] font-semibold text-fg dark:text-fg-dark ${
            dimmed ? "opacity-60" : ""
          }`}
          numberOfLines={1}
        >
          {label}
        </Text>
        {dimmed && (
          <View className="rounded-full bg-line px-1.5 py-0.5 dark:bg-line-dark">
            <Text className="text-[8px] font-bold text-fg-2 dark:text-fg-2-dark">
              Soon
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function ModuleGrid() {
  const router = useRouter();
  const toast = useToast();
  const { config } = useTenantConfig();
  const { status } = useAuth();
  const { scheme } = useThemeMode();

  const primary = config?.brand.colors.primary ?? palette.brand;
  const tint = config?.brand.colors.tint ?? palette.tint;
  const tiles = deriveModuleTiles(config?.modules);

  const onModulePress = (tile: (typeof tiles)[number]) => {
    if (!tile.enabled) {
      toast.show(`${tile.label} is coming soon`);
      return;
    }
    const route = MODULE_ROUTES[tile.key];
    if (route) router.push(route as never);
    else toast.show(`${tile.label} is opening soon`);
  };

  return (
    <View className="flex-row flex-wrap justify-between">
      {tiles.map((tile) => {
        const colors = tile.enabled
          ? resolveToneColors(tile.tone, scheme, primary, tint)
          : DISABLED_TILE[scheme];
        return (
          <Tile
            key={tile.key}
            label={tile.label}
            bg={colors.bg}
            iconColor={colors.icon}
            icon={tile.icon}
            dimmed={!tile.enabled}
            onPress={() => onModulePress(tile)}
          />
        );
      })}

      {/* Platform utility tiles (same for every tenant) */}
      <Tile
        label="Hotlines"
        bg={resolveToneColors("blue", scheme, primary, tint).bg}
        iconColor={resolveToneColors("blue", scheme, primary, tint).icon}
        icon={PhoneCall}
        onPress={() => router.push("/hotlines" as never)}
      />
      <Tile
        label="Digital ID"
        bg={resolveToneColors("brand", scheme, primary, tint).bg}
        iconColor={resolveToneColors("brand", scheme, primary, tint).icon}
        icon={IdCard}
        onPress={() =>
          status === "resident"
            ? router.push("/digital-id")
            : router.push("/(auth)/login")
        }
      />
    </View>
  );
}
