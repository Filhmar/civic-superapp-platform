import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTenantConfig } from "@/contexts/tenant-config-context";
import type { OnboardingSlide } from "@/types/config";

/**
 * 3-slide carousel rendered entirely from the fetched TenantConfig
 * (title / body / bg color per slide). Tenancy is data, never code.
 */
export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { config } = useTenantConfig();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [index, setIndex] = useState(0);

  const slides = config?.onboarding ?? [];
  const isLast = index >= slides.length - 1;

  const finish = useCallback(() => {
    void AsyncStorage.setItem("onboarded", "1");
    router.replace("/(tabs)");
  }, [router]);

  const next = useCallback(() => {
    if (isLast) {
      finish();
    } else {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  }, [finish, index, isLast]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first && typeof first.index === "number") setIndex(first.index);
    },
  ).current;

  if (slides.length === 0) {
    // Config guarantees 3 slides; if absent, skip straight to the app.
    finish();
    return null;
  }

  const activeBg = slides[Math.min(index, slides.length - 1)]?.bg;

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: activeBg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View
            style={{ width, backgroundColor: item.bg }}
            className="flex-1 items-center justify-center px-10"
          >
            <Text className="text-center text-3xl font-bold text-white">
              {item.title}
            </Text>
            <Text className="mt-4 text-center text-base leading-6 text-white/90">
              {item.body}
            </Text>
          </View>
        )}
      />

      {/* Dots */}
      <View className="flex-row items-center justify-center gap-2 pb-6">
        {slides.map((slide, i) => (
          <View
            key={slide.title}
            className={`h-2 rounded-full bg-white ${
              i === index ? "w-6 opacity-100" : "w-2 opacity-40"
            }`}
          />
        ))}
      </View>

      {/* Skip / Next */}
      <View className="flex-row items-center justify-between px-8 pb-8">
        <Pressable accessibilityRole="button" onPress={finish} hitSlop={12}>
          <Text className="text-base font-medium text-white/80">Skip</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={next}
          className="rounded-full bg-white px-8 py-3 active:opacity-80"
        >
          <Text className="text-base font-semibold" style={{ color: activeBg }}>
            {isLast ? "Get Started" : "Next"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
