import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Bell, IdCard, Search, Siren, UserRound } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { AnnouncementsCarousel } from "@/components/home/announcements-carousel";
import { ModuleGrid } from "@/components/home/module-grid";
import { WeatherCard } from "@/components/home/weather-card";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { useUnreadCountQuery } from "@/hooks/queries/use-notifications";
import { resolveAssetUrl } from "@/utils/asset-url";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Home shell — everything tenant-facing comes FROM CONFIG (Reference §10). */
export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { config } = useTenantConfig();
  const { status, user } = useAuth();
  const isResident = status === "resident";

  const { data: unread } = useUnreadCountQuery({ enabled: isResident });
  const unreadCount = unread?.unread ?? 0;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  if (!config) return null;

  const { app, brand, home } = config;
  const primary = brand.colors.primary;
  const greeting = greetingForHour(new Date().getHours());
  const displayName = isResident ? (user?.name ?? "Resident") : "Guest";
  const avatarUrl = isResident ? resolveAssetUrl(user?.avatar_url) : null;
  const executivePhoto = resolveAssetUrl(brand.executive.photo);

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Greeting + avatar + bell */}
        <View className="flex-row items-center justify-between pt-4">
          <View className="flex-1 flex-row items-center gap-3">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
            ) : (
              <View className="h-10 w-10 items-center justify-center rounded-full bg-tint">
                <UserRound size={20} color={primary} />
              </View>
            )}
            <View className="flex-1">
              <AppText variant="caption">{greeting}</AppText>
              <AppText variant="subtitle" numberOfLines={1}>
                {displayName}
              </AppText>
            </View>
          </View>
          {isResident && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => router.push("/notifications")}
              className="h-10 w-10 items-center justify-center rounded-full bg-surface active:opacity-70 dark:bg-surface-dark"
            >
              <Bell size={20} color={primary} />
              {unreadCount > 0 && (
                <View className="absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1">
                  <Text className="text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        </View>

        {/* App identity — from config.app */}
        <View className="mt-4">
          <AppText variant="title">{app.name}</AppText>
          <AppText variant="caption" className="mt-0.5">
            {app.tagline}
          </AppText>
        </View>

        {/* Search bar → /search */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/search")}
          className="mt-4 flex-row items-center gap-2 rounded-2xl bg-surface px-4 py-3.5 active:opacity-70 dark:bg-surface-dark"
        >
          <Search size={18} color={palette["fg-2"]} />
          <Text className="text-sm text-fg-2 dark:text-fg-2-dark">
            Search services, news, places…
          </Text>
        </Pressable>

        {/* SOS bar → SOS tab */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/sos" as never)}
          className="mt-4 flex-row items-center justify-between rounded-2xl bg-danger px-5 py-4 active:opacity-80"
        >
          <View className="flex-row items-center gap-3">
            <Siren size={22} color="white" />
            <View>
              <Text className="text-base font-bold text-white">
                Emergency SOS
              </Text>
              <Text className="text-xs text-white/80">
                Tap for one-tap emergency help
              </Text>
            </View>
          </View>
          <Text className="text-lg text-white">›</Text>
        </Pressable>

        {/* Module grid */}
        <AppText variant="subtitle" className="mb-3 mt-7">
          Services
        </AppText>
        <ModuleGrid />

        {/* Announcements carousel (pinned posts) */}
        <AppText variant="subtitle" className="mt-7">
          Announcements
        </AppText>
        <AnnouncementsCarousel />

        {/* Mayor's Corner — iff config.home.mayors_corner */}
        {home.mayors_corner && (
          <View className="mt-6 rounded-2xl bg-surface p-5 dark:bg-surface-dark">
            <View className="flex-row items-center gap-4">
              {executivePhoto ? (
                <Image
                  source={{ uri: executivePhoto }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                />
              ) : (
                <View className="h-14 w-14 items-center justify-center rounded-full bg-tint">
                  <UserRound size={26} color={primary} />
                </View>
              )}
              <View className="flex-1">
                <AppText variant="caption">{brand.executive.title}</AppText>
                <AppText variant="subtitle" numberOfLines={1}>
                  {brand.executive.name}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" className="mt-3 leading-5">
              {brand.executive.greeting}
            </AppText>
            <View className="mt-3 self-start rounded-full bg-tint px-3 py-1">
              <Text
                className="text-xs font-semibold"
                style={{ color: brand.colors.primaryDark }}
              >
                {brand.slogan}
              </Text>
            </View>
          </View>
        )}

        {/* Weather + AQI */}
        <WeatherCard />

        {/* Digital-ID promo — iff config.home.digital_id_promo */}
        {home.digital_id_promo && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              isResident
                ? router.push("/digital-id")
                : router.push("/(auth)/login")
            }
            className="mt-6 flex-row items-center gap-4 rounded-2xl bg-brand p-5 active:opacity-80"
          >
            <IdCard size={28} color="white" />
            <View className="flex-1">
              <Text className="text-base font-bold text-white">
                Your Digital City ID
              </Text>
              <Text className="mt-0.5 text-xs text-white/85">
                {isResident
                  ? "View your QR ID and validity"
                  : "Sign in to get your resident QR ID"}
              </Text>
            </View>
            <Text className="text-lg text-white">›</Text>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}
