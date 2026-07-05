/** Horizontal snap carousel of pinned posts (DESIGN_SPEC §4). */
import { useRouter } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { AssetImage } from "@/components/ui/asset-image";
import { AppText } from "@/components/ui/typography";
import { cardShadow } from "@/constants/shadows";
import { usePostsQuery } from "@/hooks/queries/use-posts";
import { formatDate } from "@/utils/format-date";

const CARD_WIDTH = 270;

export function AnnouncementsCarousel() {
  const router = useRouter();
  const { data: posts } = usePostsQuery({ pinned: true });

  if (!posts?.length) return null;

  return (
    <View className="mt-1">
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 13}
        decelerationRate="fast"
        contentContainerClassName="px-5 gap-3 py-2"
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/news/${item.id}` as never)}
            style={[cardShadow, { width: CARD_WIDTH }]}
            className="overflow-hidden rounded-card-lg bg-surface active:opacity-85 dark:bg-surface-dark"
          >
            <View>
              <AssetImage
                uri={item.hero_image}
                style={{ width: "100%", height: 120 }}
                resizeMode="cover"
                fallback={<View className="h-[120px] w-full bg-tint" />}
              />
              {/* Category pill overlaid bottom-left */}
              <View className="absolute bottom-2.5 left-2.5 rounded-full bg-[#FEF3D9] px-2.5 py-1">
                <Text className="text-[10.5px] font-bold uppercase text-accent-deep">
                  {item.category}
                </Text>
              </View>
            </View>
            <View className="p-3">
              <AppText
                variant="subtitle"
                className="leading-[18px]"
                numberOfLines={2}
              >
                {item.title}
              </AppText>
              <AppText variant="caption" className="mt-1.5">
                {formatDate(item.published_at)} · {item.author}
              </AppText>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
