import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { usePostQuery } from "@/hooks/queries/use-posts";
import { resolveAssetUrl } from "@/utils/asset-url";
import { formatDateTime } from "@/utils/format-date";

export default function NewsDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: post, isPending, isError } = usePostQuery(id ?? "");
  const hero = resolveAssetUrl(post?.hero_image);

  return (
    <Screen>
      <ScreenHeader title="Article" />
      {isError ? (
        <AppText variant="caption" className="mt-10 text-center">
          Could not load this article.
        </AppText>
      ) : isPending || !post ? (
        <AppText variant="caption" className="mt-10 text-center">
          Loading…
        </AppText>
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-10">
          {hero && (
            <Image
              source={{ uri: hero }}
              style={{ width: "100%", height: 200, borderRadius: 16 }}
              contentFit="cover"
            />
          )}
          <View className="mt-4 self-start rounded-full bg-tint px-3 py-1">
            <Text className="text-xs font-semibold text-fg-2">
              {post.category}
            </Text>
          </View>
          <AppText variant="title" className="mt-3">
            {post.title}
          </AppText>
          <AppText variant="caption" className="mt-2">
            {formatDateTime(post.published_at)} · {post.author}
          </AppText>
          <AppText variant="body" className="mt-5 leading-7">
            {post.body}
          </AppText>
        </ScrollView>
      )}
    </Screen>
  );
}
