import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssetImage } from "@/components/ui/asset-image";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { isRenderableAssetUrl } from "@/lib/asset-url";
import { primaryGlow } from "@/constants/shadows";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import type { OnboardingSlide } from "@/types/config";

/**
 * Onboarding per DESIGN_SPEC §4: full-bleed tenant photo with a brand duotone
 * overlay (slide bg color), glass circle mark, bottom white sheet with
 * Display/800 title, dots and a primary Next pill. All content is config
 * data — tenancy is data, never code.
 */
export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Photo fills the whole screen; the sheet floats over it. Its measured
  // height keeps the glass circle centered in the visible photo area.
  const [sheetHeight, setSheetHeight] = useState(300);
  const { config } = useTenantConfig();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [index, setIndex] = useState(0);

  const slides = config?.onboarding ?? [];
  const isLast = index >= slides.length - 1;
  const primary = config?.brand.colors.primary ?? palette.brand;
  const seal = config?.brand.logo.assets.seal;

  const finish = useCallback(() => {
    void AsyncStorage.setItem("onboarded", "1");
    router.replace("/(auth)/login");
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

  // Config guarantees 3 slides; if absent, skip straight to login.
  useEffect(() => {
    if (slides.length === 0) finish();
  }, [slides.length, finish]);

  if (slides.length === 0) return null;

  const activeSlide = slides[Math.min(index, slides.length - 1)];

  return (
    <View className="flex-1" style={{ backgroundColor: activeSlide?.bg }}>
      {/* Slides: full-screen photo (when a real asset) under a duotone brand
          overlay; the bottom sheet floats above it. */}
      <FlatList
        style={StyleSheet.absoluteFill}
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
          <View style={{ width, height, backgroundColor: item.bg }}>
            {/* Decorative photo — absent asset renders nothing, not a placeholder */}
            {isRenderableAssetUrl(item.image) && (
              <AssetImage
                uri={item.image}
                style={{
                  position: "absolute",
                  width,
                  height,
                  opacity: 0.35,
                }}
                resizeMode="cover"
                accessibilityLabel={item.title}
              />
            )}
            {/* Glass circle mark — centered in the area above the sheet */}
            <View
              className="flex-1 items-center justify-center"
              style={{ paddingBottom: sheetHeight }}
            >
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: 190,
                  height: 190,
                  backgroundColor: "rgba(255,255,255,0.18)",
                }}
              >
                {/* No borderRadius: clipping mangles non-circular seal art */}
                <AssetImage
                  uri={seal}
                  style={{ width: 156, height: 156 }}
                  resizeMode="contain"
                  fallback={
                    <Text className="text-3xl font-extrabold text-white">
                      {config?.app.name?.slice(0, 2).toUpperCase()}
                    </Text>
                  }
                />
              </View>
            </View>
          </View>
        )}
      />

      {/* Skip */}
      <Pressable
        accessibilityRole="button"
        onPress={finish}
        hitSlop={12}
        style={{ position: "absolute", top: insets.top + 10, right: 20 }}
      >
        <Text className="text-[13px] font-semibold text-white">Skip</Text>
      </Pressable>

      {/* Bottom white sheet — floats over the full-bleed photo */}
      <View
        onLayout={(e) => setSheetHeight(Math.round(e.nativeEvent.layout.height))}
        className="absolute inset-x-0 bottom-0 bg-surface px-6 pt-7 dark:bg-surface-dark"
        style={{
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingBottom: insets.bottom + 20,
        }}
      >
        <AppText variant="display">{activeSlide?.title}</AppText>
        <Text className="mt-3 font-sans text-[15px] leading-6 text-fg-2 dark:text-fg-2-dark">
          {activeSlide?.body}
        </Text>

        <View className="mt-7 flex-row items-center justify-between">
          {/* Dots — active is a 28px bar */}
          <View className="flex-row items-center gap-1.5">
            {slides.map((slide, i) => (
              <View
                key={slide.title}
                className="h-[6px] rounded-[3px]"
                style={{
                  width: i === index ? 28 : 6,
                  backgroundColor: i === index ? primary : palette.line,
                }}
              />
            ))}
          </View>
          {/* Next pill */}
          <Pressable
            accessibilityRole="button"
            onPress={next}
            style={[primaryGlow(primary), { backgroundColor: primary }]}
            className="flex-row items-center gap-1 rounded-[14px] px-7 py-3.5 active:opacity-85"
          >
            <Text className="text-[15px] font-bold text-white">
              {isLast ? "Get Started" : "Next"}
            </Text>
            <ChevronRight size={16} color="white" strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
