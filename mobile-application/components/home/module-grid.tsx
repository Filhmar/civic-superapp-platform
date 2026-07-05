/**
 * 12-tile home grid: the 10 config-driven module tiles plus 2 platform
 * utility tiles (Digital ID, My Reports). Disabled modules are dimmed with a
 * "Coming soon" badge and NEVER call their endpoint.
 */
import { useRouter } from "expo-router";
import { FileSearch, IdCard } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { useToast } from "@/components/ui/toast";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { MODULE_ROUTES } from "@/constants/modules";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { deriveModuleTiles } from "@/lib/modules";

export function ModuleGrid() {
  const router = useRouter();
  const toast = useToast();
  const { config } = useTenantConfig();
  const { status } = useAuth();

  const primary = config?.brand.colors.primary ?? palette.brand;
  const tiles = deriveModuleTiles(config?.modules);

  const onModulePress = (tile: (typeof tiles)[number]) => {
    if (!tile.enabled) {
      toast.show(`${tile.label} is coming soon`);
      return;
    }
    const route = MODULE_ROUTES[tile.key];
    if (route) {
      router.push(route as never);
    } else {
      toast.show(`${tile.label} is opening soon`);
    }
  };

  const onDigitalId = () => {
    if (status === "resident") router.push("/digital-id");
    else router.push("/(auth)/login");
  };

  const onMyReports = () => {
    if (status === "resident") router.push("/report/mine");
    else router.push("/(auth)/login");
  };

  const tileClass =
    "w-[31%] items-center rounded-2xl bg-surface px-1 py-4 active:opacity-70 dark:bg-surface-dark";

  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Pressable
            key={tile.key}
            accessibilityRole="button"
            onPress={() => onModulePress(tile)}
            className={`${tileClass} ${tile.enabled ? "" : "opacity-50"}`}
          >
            <Icon size={24} color={tile.enabled ? primary : palette["fg-2"]} />
            <AppText
              variant="caption"
              className="mt-2 text-center font-medium"
              numberOfLines={1}
            >
              {tile.label}
            </AppText>
            {!tile.enabled && (
              <View className="mt-1 rounded-full bg-tint px-2 py-0.5">
                <Text className="text-[9px] font-medium text-fg-2">
                  Coming soon
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Platform utility tiles (same for every tenant) */}
      <Pressable
        accessibilityRole="button"
        onPress={onDigitalId}
        className={tileClass}
      >
        <IdCard size={24} color={primary} />
        <AppText variant="caption" className="mt-2 text-center font-medium">
          Digital ID
        </AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onMyReports}
        className={tileClass}
      >
        <FileSearch size={24} color={primary} />
        <AppText variant="caption" className="mt-2 text-center font-medium">
          My Reports
        </AppText>
      </Pressable>
    </View>
  );
}
