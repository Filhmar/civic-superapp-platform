/** Home "nearby" strip: places near the tenant centroid. */
import { FlatList, View } from "react-native";

import { PlaceCard } from "@/components/places/place-card";
import { AppText } from "@/components/ui/typography";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { usePlacesQuery } from "@/hooks/queries/use-places";

export function NearbyStrip() {
  const { config } = useTenantConfig();
  const centroid = config?.geo.centroid;
  const { data: places } = usePlacesQuery(
    centroid
      ? { near: `${centroid[0]},${centroid[1]}`, limit: 5 }
      : undefined,
  );

  if (!places?.length) return null;

  return (
    <>
      <AppText variant="subtitle" className="mt-7">
        Nearby
      </AppText>
      <View className="-mx-5 mt-3">
        <FlatList
          data={places}
          keyExtractor={(p) => p.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-5 gap-3"
          renderItem={({ item }) => <PlaceCard place={item} width={160} />}
        />
      </View>
    </>
  );
}
