import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { usePostsQuery } from "@/hooks/queries/use-posts";
import { resolveAssetUrl } from "@/utils/asset-url";
import { formatDate } from "@/utils/format-date";

/** Platform post taxonomy — same for every tenant. */
const CATEGORIES = [
  "ALL",
  "NEWS",
  "ADVISORY",
  "EVENT",
  "PROGRAM",
  "TRAFFIC",
  "WEATHER",
] as const;

export default function NewsIndex() {
  const router = useRouter();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("ALL");
  const { data: posts, isPending } = usePostsQuery(
    category === "ALL" ? undefined : { category },
  );

  return (
    <Screen padTop>
      <ScreenHeader title="News & Advisories" />

      {/* Category chips */}
      <View className="pb-2">
        <FlatList
          data={CATEGORIES}
          keyExtractor={(c) => c}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-5 gap-2"
          renderItem={({ item }) => {
            const active = item === category;
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => setCategory(item)}
                className={`rounded-full px-4 py-1.5 ${
                  active ? "bg-brand" : "bg-surface dark:bg-surface-dark"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? "text-white" : "text-fg-2 dark:text-fg-2-dark"
                  }`}
                >
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={posts ?? []}
        keyExtractor={(p) => p.id}
        contentContainerClassName="px-5 pb-8 gap-3"
        ListEmptyComponent={
          <AppText variant="caption" className="mt-10 text-center">
            {isPending ? "Loading…" : "No posts in this category yet."}
          </AppText>
        }
        renderItem={({ item }) => {
          const hero = resolveAssetUrl(item.hero_image);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/news/${item.id}` as never)}
              className="overflow-hidden rounded-2xl bg-surface active:opacity-80 dark:bg-surface-dark"
            >
              {hero && (
                <Image
                  source={{ uri: hero }}
                  style={{ width: "100%", height: 150 }}
                  contentFit="cover"
                />
              )}
              <View className="p-4">
                <View className="flex-row items-center gap-2">
                  <View className="rounded-full bg-tint px-2.5 py-0.5">
                    <Text className="text-[10px] font-semibold text-fg-2">
                      {item.category}
                    </Text>
                  </View>
                  {item.pinned && (
                    <View className="rounded-full bg-brand px-2.5 py-0.5">
                      <Text className="text-[10px] font-semibold text-white">
                        PINNED
                      </Text>
                    </View>
                  )}
                </View>
                <AppText variant="subtitle" className="mt-2">
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
    </Screen>
  );
}
