/** Home "nearby" strip (DESIGN_SPEC §4): 150x136 cards, pastel tops. */
import { useRouter } from "expo-router";
import { FlatList, Pressable, View } from "react-native";

import { AssetImage } from "@/components/ui/asset-image";
import { AppText } from "@/components/ui/typography";
import { nearbyShadow } from "@/constants/shadows";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { usePlacesQuery } from "@/hooks/queries/use-places";

const PASTELS = ["#FEF3D9", "#E8F1FA", "#FDEDEC", "#F1ECFA"];

export function NearbyStrip() {
  const router = useRouter();
  const { config } = useTenantConfig();
  const centroid = config?.geo.centroid;
  const tint = config?.brand.colors.tint ?? "#EDF1ED";
  const { data: places } = usePlacesQuery(
    centroid ? { near: `${centroid[0]},${centroid[1]}`, limit: 5 } : undefined,
  );

  if (!places?.length) return null;

  return (
    <>
      <AppText variant="section" className="mt-6 px-5">
        Nearby
      </AppText>
      <View className="mt-1">
        <FlatList
          data={places}
          keyExtractor={(p) => p.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-5 gap-3 py-2"
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/tourism/${item.id}` as never)}
              style={[nearbyShadow, { width: 150, minHeight: 136 }]}
              className="overflow-hidden rounded-card bg-surface active:opacity-85 dark:bg-surface-dark"
            >
              <AssetImage
                uri={item.photos?.[0]}
                style={{ width: "100%", height: 84 }}
                resizeMode="cover"
                fallback={
                  <View
                    style={{
                      width: "100%",
                      height: 84,
                      backgroundColor:
                        index % 2 === 0 ? tint : PASTELS[index % PASTELS.length],
                    }}
                  />
                }
              />
              <View className="px-3 py-2.5">
                <AppText
                  variant="subtitle"
                  className="text-[13px]"
                  numberOfLines={1}
                >
                  {item.name}
                </AppText>
                <AppText variant="caption" className="mt-0.5" numberOfLines={1}>
                  {item.category}
                  {typeof item.distance_km === "number"
                    ? ` · ${item.distance_km.toFixed(1)} km`
                    : ""}
                </AppText>
              </View>
            </Pressable>
          )}
        />
      </View>
    </>
  );
}
