import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { Heart, MapPin, Navigation, PhoneCall } from "lucide-react-native";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { OpenNowBadge, Rating } from "@/components/places/place-card";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useToast } from "@/components/ui/toast";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { useFavoriteMutation } from "@/hooks/mutations/use-favorite-mutation";
import { usePlaceQuery } from "@/hooks/queries/use-places";
import { useBoundaryQuery, useGeoFeaturesQuery } from "@/hooks/queries/use-geo";
import { CivicMap } from "@/components/geo/civic-map";
import { resolveAssetUrl } from "@/utils/asset-url";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PlaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { status } = useAuth();
  const { data: place, isPending, isError } = usePlaceQuery(id ?? "");
  const favorite = useFavoriteMutation(id ?? "");
  const { data: boundary } = useBoundaryQuery();
  const { data: geoFeatures } = useGeoFeaturesQuery(boundary?.bbox ?? null);

  const toggleFavorite = () => {
    if (!place) return;
    if (status !== "resident") {
      toast.show("Sign in to save favorites");
      return;
    }
    favorite.mutate(!place.favorite); // optimistic
  };

  const openDirections = () => {
    if (!place) return;
    const { lat, lng } = place.geo;
    const label = encodeURIComponent(place.name);
    const url =
      Platform.OS === "ios"
        ? `maps:0,0?q=${label}@${lat},${lng}`
        : Platform.OS === "android"
          ? `geo:${lat},${lng}?q=${lat},${lng}(${label})`
          : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    void Linking.openURL(url);
  };

  const call = () => {
    if (!place?.contact) return;
    toast.show(`Calling ${place.name}…`);
    void Linking.openURL(`tel:${place.contact.replace(/[^\d+]/g, "")}`);
  };

  const photo = resolveAssetUrl(place?.photos?.[0]);

  return (
    <Screen>
      <ScreenHeader
        title={place?.name ?? "Place"}
        right={
          place ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                place.favorite ? "Remove favorite" : "Add favorite"
              }
              onPress={toggleFavorite}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center"
            >
              <Heart
                size={22}
                color={place.favorite ? "#FF8FA3" : "#FFFFFF"}
                fill={place.favorite ? "#FF8FA3" : "transparent"}
              />
            </Pressable>
          ) : undefined
        }
      />
      {isError ? (
        <AppText variant="caption" className="mt-10 text-center">
          Could not load this place.
        </AppText>
      ) : isPending || !place ? (
        <AppText variant="caption" className="mt-10 text-center">
          Loading…
        </AppText>
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-10">
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={{ width: "100%", height: 180, borderRadius: 16 }}
              contentFit="cover"
            />
          ) : (
            <View className="h-40 w-full items-center justify-center rounded-2xl bg-tint">
              <AppText variant="caption">{place.category}</AppText>
            </View>
          )}

          <View className="mt-4 flex-row items-center justify-between">
            <AppText variant="title" className="flex-1 pr-2 text-xl">
              {place.name}
            </AppText>
            <OpenNowBadge open={place.open_now} />
          </View>
          <View className="mt-1 flex-row items-center gap-3">
            <Rating value={place.rating} />
            <AppText variant="caption">{place.category}</AppText>
          </View>
          {place.address && (
            <View className="mt-2 flex-row items-center gap-1.5">
              <MapPin size={14} color={palette["fg-2"]} />
              <AppText variant="caption">{place.address}</AppText>
            </View>
          )}
          <AppText variant="body" className="mt-4 leading-6">
            {place.description}
          </AppText>

          {/* Self-hosted city map — place pinned within the tenant boundary. */}
          {boundary && place.geo ? (
            <View className="mt-5">
              <CivicMap
                boundary={boundary}
                features={geoFeatures}
                pin={{ lat: place.geo.lat, lng: place.geo.lng }}
                height={160}
              />
            </View>
          ) : null}

          {/* Actions */}
          <View className="mt-5 flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              onPress={openDirections}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-brand py-3.5 active:opacity-80"
            >
              <Navigation size={16} color="white" />
              <Text className="text-sm font-semibold text-white">
                Get Directions
              </Text>
            </Pressable>
            {place.contact && (
              <Pressable
                accessibilityRole="button"
                onPress={call}
                className="flex-row items-center justify-center gap-2 rounded-full bg-surface px-6 py-3.5 active:opacity-70 dark:bg-surface-dark"
              >
                <PhoneCall size={16} color={palette["fg-2"]} />
                <Text className="text-sm font-semibold text-fg dark:text-fg-dark">
                  Call
                </Text>
              </Pressable>
            )}
          </View>

          {/* Hours */}
          {place.hours.length > 0 && (
            <>
              <AppText variant="subtitle" className="mb-2 mt-6">
                Hours
              </AppText>
              <View className="rounded-2xl bg-surface p-4 dark:bg-surface-dark">
                {place.hours.map((h) => (
                  <View
                    key={h.day}
                    className="flex-row items-center justify-between py-1"
                  >
                    <AppText variant="caption">{DAYS[h.day] ?? h.day}</AppText>
                    <AppText variant="caption" className="font-medium">
                      {h.open} – {h.close}
                    </AppText>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
