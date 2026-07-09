import { useRouter } from "expo-router";
import { Newspaper } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssetImage } from "@/components/ui/asset-image";
import { GradientBox } from "@/components/ui/gradient-box";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { cardShadow } from "@/constants/shadows";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { usePostsQuery } from "@/hooks/queries/use-posts";
import { lightenHex } from "@/lib/theme";
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

export default function NewsTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config } = useTenantConfig();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("ALL");
  const { data: posts, isPending } = usePostsQuery(
    category === "ALL" ? undefined : { category },
  );

  const primary = config?.brand.colors.primary ?? palette.brand;
  const primaryDark = config?.brand.colors.primaryDark ?? palette["brand-dark"];

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      {/* Hero header */}
      <GradientBox
        stops={[
          { color: primaryDark, offset: 0 },
          { color: primary, offset: 0.65 },
          { color: lightenHex(primary, 0.15), offset: 1 },
        ]}
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 22,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      >
        <Text className="text-[24px] font-extrabold tracking-tight-5 text-white">
          News & Advisories
        </Text>
        <Text className="mt-1 text-xs font-medium text-white/80">
          Curated by the City PIO
        </Text>
      </GradientBox>

      {/* Category chips */}
      <View className="pb-1 pt-4">
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
                style={active ? { backgroundColor: primary } : undefined}
                className={`rounded-full px-4 py-2 ${
                  active
                    ? ""
                    : "border border-line bg-surface dark:border-line-dark dark:bg-surface-dark"
                }`}
              >
                <Text
                  className={`text-xs font-bold capitalize ${
                    active ? "text-white" : "text-fg-2 dark:text-fg-2-dark"
                  }`}
                >
                  {item === "ALL" ? "All" : item.toLowerCase()}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={posts ?? []}
        keyExtractor={(p) => p.id}
        contentContainerClassName="px-5 pb-28 pt-3 gap-4"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <AppText variant="caption" className="mt-10 text-center">
            {isPending ? "Loading…" : "No posts in this category yet."}
          </AppText>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/news/${item.id}` as never)}
            style={cardShadow}
            className="overflow-hidden rounded-card-lg bg-surface active:opacity-80 dark:bg-surface-dark"
          >
            <View>
              <AssetImage
                uri={item.hero_image}
                style={{ width: "100%", height: 140 }}
                resizeMode="cover"
                placeholderIcon={Newspaper}
              />
              {/* Category pill overlaid bottom-left of the image area */}
              <View className="absolute left-3 top-3 rounded-full bg-[#FEF3D9] px-2.5 py-1">
                <Text className="text-[10.5px] font-bold uppercase text-accent-deep">
                  {item.category}
                </Text>
              </View>
            </View>
            <View className="p-3.5">
              <AppText variant="subtitle" className="leading-5" numberOfLines={2}>
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
