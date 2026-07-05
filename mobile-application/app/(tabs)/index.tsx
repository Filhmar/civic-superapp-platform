import { ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { MODULES } from "@/constants/modules";
import { useTenantConfig } from "@/contexts/tenant-config-context";

/**
 * Home shell — everything tenant-facing here comes FROM CONFIG: app name,
 * tagline, slogan chip, executive card, and module enablement. Module labels
 * and icons are PLATFORM data (constants/modules.ts), identical per tenant.
 */
export default function Home() {
  const { config } = useTenantConfig();
  if (!config) return null; // provider guarantees config before children render

  const { app, brand, home, modules } = config;
  const primary = brand.colors.primary;

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Header — from config.app */}
        <View className="pt-4">
          <AppText variant="title">{app.name}</AppText>
          <AppText variant="caption" className="mt-1">
            {app.tagline}
          </AppText>
          {/* Slogan chip — from config.brand.slogan */}
          <View className="mt-3 self-start rounded-full bg-tint px-4 py-1.5">
            <Text
              className="text-xs font-semibold"
              style={{ color: brand.colors.primaryDark }}
            >
              {brand.slogan}
            </Text>
          </View>
        </View>

        {/* Executive card — only when config.home.mayors_corner */}
        {home.mayors_corner && (
          <View className="mt-6 rounded-2xl bg-surface p-5 dark:bg-surface-dark">
            <AppText variant="caption">{brand.executive.title}</AppText>
            <AppText variant="subtitle" className="mt-1">
              {brand.executive.name}
            </AppText>
            <AppText variant="caption" className="mt-2 leading-5">
              {brand.executive.greeting}
            </AppText>
          </View>
        )}

        {/* Module grid — enablement from config.modules */}
        <AppText variant="subtitle" className="mb-3 mt-8">
          Services
        </AppText>
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {MODULES.map(({ key, label, icon: Icon }) => {
            const enabled = modules[key];
            return (
              <View
                key={key}
                className={`w-[31%] items-center rounded-2xl bg-surface px-2 py-4 dark:bg-surface-dark ${
                  enabled ? "" : "opacity-50"
                }`}
              >
                <Icon
                  size={26}
                  color={enabled ? primary : palette["fg-2"]}
                />
                <AppText
                  variant="caption"
                  className="mt-2 text-center font-medium"
                  numberOfLines={1}
                >
                  {label}
                </AppText>
                {!enabled && (
                  <View className="mt-1 rounded-full bg-tint px-2 py-0.5">
                    <Text className="text-[9px] font-medium text-fg-2 dark:text-fg-2">
                      Coming soon
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
