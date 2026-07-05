import { useRouter } from "expo-router";
import { FileText } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { useServiceCatalogQuery } from "@/hooks/queries/use-egov";

/** e-Services grouped catalog with fee chips. */
export default function ServicesIndex() {
  const router = useRouter();
  const { config } = useTenantConfig();
  const { status } = useAuth();
  const { data: groups, isPending } = useServiceCatalogQuery();
  const primary = config?.brand.colors.primary ?? palette.brand;

  return (
    <Screen>
      <ScreenHeader
        title="e-Services"
        right={
          status === "resident" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/services/applications" as never)}
              className="px-2 py-1"
            >
              <Text className="text-xs font-semibold text-brand">
                My Applications
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView contentContainerClassName="px-5 pb-10">
        {isPending && (
          <AppText variant="caption" className="mt-8 text-center">
            Loading catalog…
          </AppText>
        )}
        {(groups ?? []).map((group) => (
          <View key={group.group} className="mt-5">
            <AppText variant="subtitle">{group.group}</AppText>
            <View className="mt-2 gap-2">
              {group.services.map((service) => (
                <Pressable
                  key={service.code}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(`/services/${service.code}` as never)
                  }
                  className="flex-row items-center gap-3 rounded-2xl bg-surface p-4 active:opacity-70 dark:bg-surface-dark"
                >
                  <FileText size={20} color={primary} />
                  <View className="flex-1">
                    <AppText variant="subtitle" className="text-sm">
                      {service.name}
                    </AppText>
                    <AppText variant="caption" numberOfLines={2}>
                      {service.description}
                    </AppText>
                  </View>
                  <View className="items-end gap-1">
                    <View className="rounded-full bg-tint px-2.5 py-0.5">
                      <Text className="text-[10px] font-bold text-fg-2">
                        ₱{service.fee}
                      </Text>
                    </View>
                    <AppText variant="caption" className="text-[10px]">
                      {service.processing_days}d
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
