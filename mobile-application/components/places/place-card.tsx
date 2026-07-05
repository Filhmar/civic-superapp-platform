import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Star } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { AppText } from "@/components/ui/typography";
import type { Place } from "@/types/places";
import { resolveAssetUrl } from "@/utils/asset-url";

export function OpenNowBadge({ open }: { open: boolean }) {
  return (
    <View
      className={`rounded-full px-2 py-0.5 ${open ? "bg-brand" : "bg-tint"}`}
    >
      <Text
        className={`text-[9px] font-bold ${open ? "text-white" : "text-fg-2"}`}
      >
        {open ? "OPEN NOW" : "CLOSED"}
      </Text>
    </View>
  );
}

export function Rating({ value }: { value: number | null }) {
  if (value == null) return null;
  return (
    <View className="flex-row items-center gap-1">
      <Star size={12} color="#F59E0B" fill="#F59E0B" />
      <Text className="text-xs font-semibold text-fg dark:text-fg-dark">
        {value.toFixed(1)}
      </Text>
    </View>
  );
}

/** Grid card with photo (or placeholder color block). */
export function PlaceCard({ place, width }: { place: Place; width?: number }) {
  const router = useRouter();
  const photo = resolveAssetUrl(place.photos?.[0]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/tourism/${place.id}` as never)}
      style={width ? { width } : undefined}
      className="overflow-hidden rounded-2xl bg-surface active:opacity-80 dark:bg-surface-dark"
    >
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{ width: "100%", height: 90 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-[90px] w-full items-center justify-center bg-tint">
          <AppText variant="caption" className="text-[10px]">
            {place.category}
          </AppText>
        </View>
      )}
      <View className="p-3">
        <AppText variant="subtitle" className="text-sm" numberOfLines={1}>
          {place.name}
        </AppText>
        <View className="mt-1.5 flex-row items-center justify-between">
          <Rating value={place.rating} />
          <OpenNowBadge open={place.open_now} />
        </View>
        {typeof place.distance_km === "number" && (
          <AppText variant="caption" className="mt-1 text-[10px]">
            {place.distance_km.toFixed(1)} km away
          </AppText>
        )}
      </View>
    </Pressable>
  );
}
