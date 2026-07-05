/** Horizontal snap carousel of pinned posts. */
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { FlatList, Pressable, Text, View, useWindowDimensions } from "react-native";

import { AppText } from "@/components/ui/typography";
import { usePostsQuery } from "@/hooks/queries/use-posts";
import { resolveAssetUrl } from "@/utils/asset-url";
import { formatDate } from "@/utils/format-date";

export function AnnouncementsCarousel() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data: posts } = usePostsQuery({ pinned: true });

  if (!posts?.length) return null;
  const cardWidth = width - 40 - 24; // screen padding + peek

  return (
    <View className="-mx-5 mt-3">
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 12}
        decelerationRate="fast"
        contentContainerClassName="px-5 gap-3"
        renderItem={({ item }) => {
          const hero = resolveAssetUrl(item.hero_image);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/news/${item.id}` as never)}
              style={{ width: cardWidth }}
              className="overflow-hidden rounded-2xl bg-surface active:opacity-80 dark:bg-surface-dark"
            >
              {hero ? (
                <Image
                  source={{ uri: hero }}
                  style={{ width: "100%", height: 110 }}
                  contentFit="cover"
                />
              ) : (
                <View className="h-2 w-full bg-brand" />
              )}
              <View className="p-4">
                <View className="self-start rounded-full bg-tint px-2.5 py-0.5">
                  <Text className="text-[10px] font-semibold text-fg-2">
                    {item.category}
                  </Text>
                </View>
                <AppText variant="subtitle" className="mt-2" numberOfLines={2}>
                  {item.title}
                </AppText>
                <AppText variant="caption" className="mt-1">
                  {formatDate(item.published_at)} · {item.author}
                </AppText>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
