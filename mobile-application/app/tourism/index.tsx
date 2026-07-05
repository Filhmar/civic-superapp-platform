import { FlatList, useWindowDimensions, View } from "react-native";

import { PlaceCard } from "@/components/places/place-card";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { usePlacesQuery } from "@/hooks/queries/use-places";

/** Tourism grid. */
export default function TourismIndex() {
  const { width } = useWindowDimensions();
  const { data: places, isPending } = usePlacesQuery({ kind: "tourism" });
  const cardWidth = (width - 40 - 12) / 2;

  return (
    <Screen>
      <ScreenHeader title="Tourism" />
      <FlatList
        data={places ?? []}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperClassName="justify-between"
        contentContainerClassName="px-5 pb-8 gap-3"
        ListEmptyComponent={
          <AppText variant="caption" className="mt-10 text-center">
            {isPending ? "Loading…" : "No places yet."}
          </AppText>
        }
        renderItem={({ item }) => (
          <View style={{ width: cardWidth }}>
            <PlaceCard place={item} width={cardWidth} />
          </View>
        )}
      />
    </Screen>
  );
}
