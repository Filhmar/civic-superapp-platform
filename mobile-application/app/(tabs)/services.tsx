import { useRouter } from "expo-router";
import { ChevronRight, FileText, Search } from "lucide-react-native";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GradientBox } from "@/components/ui/gradient-box";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { useServiceCatalogQuery } from "@/hooks/queries/use-egov";
import { lightenHex } from "@/lib/theme";
import { formatPeso } from "@/utils/currency";

/** e-Services catalog — hero header + grouped rows w/ fee chips (spec §5). */
export default function ServicesTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config } = useTenantConfig();
  const { status } = useAuth();
  const { data: groups, isPending } = useServiceCatalogQuery();

  const primary = config?.brand.colors.primary ?? palette.brand;
  const primaryDark = config?.brand.colors.primaryDark ?? palette["brand-dark"];

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      {/* Hero header */}
      <GradientBox
        stops={[
          { color: primaryDark, offset: 0 },
          { color: primary, offset: 0.6 },
          { color: lightenHex(primary, 0.18), offset: 1 },
        ]}
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 24,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      >
        <Text className="text-[24px] font-extrabold tracking-tight-5 text-white">
          Government Services
        </Text>
        <Text className="mt-1 text-xs font-medium text-white/80">
          {config?.app.name} Online Services · e-Gov
        </Text>
        <View
          className="mt-4 flex-row items-center gap-2.5 rounded-[14px] px-3.5"
          style={{ backgroundColor: "rgba(255,255,255,0.18)", height: 44 }}
        >
          <Search size={18} color="rgba(255,255,255,0.85)" />
          <TextInput
            className="flex-1 font-sans text-sm text-white"
            placeholder="Search a service…"
            placeholderTextColor="rgba(255,255,255,0.8)"
            onFocus={() => router.push("/search")}
          />
        </View>
      </GradientBox>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-28 pt-5"
        showsVerticalScrollIndicator={false}
      >
        {status === "resident" && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/services/applications" as never)}
            className="mb-4 flex-row items-center justify-between rounded-card border border-line bg-surface px-4 py-3.5 active:opacity-70 dark:border-line-dark dark:bg-surface-dark"
          >
            <AppText variant="subtitle">My Applications</AppText>
            <ChevronRight size={16} color={palette["fg-2"]} />
          </Pressable>
        )}

        {isPending && (
          <AppText variant="caption" className="mt-8 text-center">
            Loading catalog…
          </AppText>
        )}

        {(groups ?? []).map((group) => (
          <View key={group.group} className="mb-6">
            <AppText variant="kicker" className="mb-2">
              {group.group}
            </AppText>
            <View className="overflow-hidden rounded-card bg-surface dark:bg-surface-dark">
              {group.services.map((service, i) => (
                <Pressable
                  key={service.code}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(`/services/${service.code}` as never)
                  }
                  className={`flex-row items-center gap-3.5 p-3.5 active:opacity-70 ${
                    i > 0 ? "border-t border-line dark:border-line-dark" : ""
                  }`}
                >
                  <View className="h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-tint">
                    <FileText size={20} color={primary} strokeWidth={1.8} />
                  </View>
                  <View className="flex-1">
                    <AppText variant="subtitle">{service.name}</AppText>
                    <AppText variant="caption" numberOfLines={2}>
                      {service.description}
                    </AppText>
                  </View>
                  <Text
                    className="text-sm font-bold"
                    style={{ color: primary }}
                  >
                    {formatPeso(service.fee)}
                  </Text>
                  <ChevronRight size={16} color={palette["fg-2"]} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
