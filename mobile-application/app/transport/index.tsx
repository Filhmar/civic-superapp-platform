import { ArrowRight, Bus } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import {
  useTransportMatchQuery,
  useTransportRoutesQuery,
} from "@/hooks/queries/use-transport";
import type { TransportRoute } from "@/types/transport";

export default function TransportIndex() {
  const { config } = useTenantConfig();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [searched, setSearched] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const { data: routes } = useTransportRoutesQuery();
  const match = useTransportMatchQuery(searched.from, searched.to);
  const primary = config?.brand.colors.primary ?? palette.brand;

  const popular = (routes ?? []).filter((r) => r.popular);
  const canSearch = from.trim().length > 0 && to.trim().length > 0;

  return (
    <Screen>
      <ScreenHeader title="Transport" />
      <ScrollView
        contentContainerClassName="px-5 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        {/* Route finder */}
        <View className="rounded-2xl bg-surface p-4 dark:bg-surface-dark">
          <TextInput
            className="rounded-xl bg-bg px-4 py-3 text-base text-fg dark:bg-bg-dark dark:text-fg-dark"
            placeholder="From (e.g. your barangay)"
            placeholderTextColor="#94A3B8"
            value={from}
            onChangeText={setFrom}
          />
          <TextInput
            className="mt-2 rounded-xl bg-bg px-4 py-3 text-base text-fg dark:bg-bg-dark dark:text-fg-dark"
            placeholder="To"
            placeholderTextColor="#94A3B8"
            value={to}
            onChangeText={setTo}
          />
          <Text
            onPress={() => canSearch && setSearched({ from, to })}
            suppressHighlighting
            className={`mt-3 self-end rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white ${
              canSearch ? "" : "opacity-50"
            }`}
          >
            Find routes
          </Text>
        </View>

        {/* Match results */}
        {searched.from.length > 0 && (
          <>
            <AppText variant="subtitle" className="mt-6">
              {searched.from} → {searched.to}
            </AppText>
            {match.isPending ? (
              <AppText variant="caption" className="mt-3">
                Searching…
              </AppText>
            ) : (match.data?.length ?? 0) === 0 ? (
              <AppText variant="caption" className="mt-3">
                No direct routes found. Try nearby landmarks or barangay names.
              </AppText>
            ) : (
              <View className="mt-2 gap-2">
                {(match.data ?? []).map((route) => (
                  <RouteCard key={route.id} route={route} color={primary} />
                ))}
              </View>
            )}
          </>
        )}

        {/* Popular routes */}
        <AppText variant="subtitle" className="mt-7">
          Popular routes
        </AppText>
        <View className="mt-2 gap-2">
          {popular.map((route) => (
            <RouteCard key={route.id} route={route} color={primary} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function RouteCard({ route, color }: { route: TransportRoute; color: string }) {
  return (
    <View className="rounded-2xl bg-surface p-4 dark:bg-surface-dark">
      <View className="flex-row items-center gap-2">
        <Bus size={16} color={color} />
        <AppText variant="subtitle" className="flex-1 text-sm" numberOfLines={1}>
          {route.name}
        </AppText>
        <View className="rounded-full bg-tint px-2.5 py-0.5">
          <Text className="text-[10px] font-bold uppercase text-fg-2">
            {route.mode}
          </Text>
        </View>
      </View>
      <View className="mt-2 flex-row flex-wrap items-center gap-1">
        {route.stops.map((stop, i) => (
          <View key={`${stop}-${i}`} className="flex-row items-center gap-1">
            <AppText variant="caption" className="text-[11px]">
              {stop}
            </AppText>
            {i < route.stops.length - 1 && (
              <ArrowRight size={10} color={palette["fg-2"]} />
            )}
          </View>
        ))}
      </View>
      <AppText variant="caption" className="mt-2 font-medium">
        Fare ₱{route.fare_min}–₱{route.fare_max}
      </AppText>
    </View>
  );
}
