import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Bell, ChevronRight, Search, TriangleAlert } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnnouncementsCarousel } from "@/components/home/announcements-carousel";
import { ModuleGrid } from "@/components/home/module-grid";
import { NearbyStrip } from "@/components/home/nearby-strip";
import { WeatherCard } from "@/components/home/weather-card";
import { AssetImage } from "@/components/ui/asset-image";
import { GradientBox } from "@/components/ui/gradient-box";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { primaryGlow, searchShadow, sosGlow } from "@/constants/shadows";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { useUnreadCountQuery } from "@/hooks/queries/use-notifications";
import { lightenHex } from "@/lib/theme";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning 👋";
  if (hour < 18) return "Good afternoon 👋";
  return "Good evening 👋";
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? ""))
    .toUpperCase()
    .slice(0, 2);
}

/** Home per DESIGN_SPEC §4 — everything tenant-facing comes FROM CONFIG. */
export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const { brand, home } = config;
  const primary = brand.colors.primary;
  const accent = brand.colors.accent;
  const primaryDark = brand.colors.primaryDark;
  const displayName = isResident ? (user?.name ?? "Resident") : "Guest";
  const seal = brand.logo.assets.seal;

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-28"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ── Gradient header banner (spec: ~172px, bottom radius 30) ── */}
        <GradientBox
          stops={[
            { color: primaryDark, offset: 0 },
            { color: primary, offset: 0.6 },
            { color: lightenHex(primary, 0.22), offset: 1 },
          ]}
          style={{
            paddingTop: insets.top + 14,
            paddingHorizontal: 20,
            paddingBottom: 58,
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
          }}
        >
          <View className="flex-row items-center gap-3">
            {/* Logo badge */}
            <View
              className="h-10 w-10 items-center justify-center overflow-hidden rounded-xl"
              style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
            >
              <AssetImage
                uri={seal}
                style={{ width: 30, height: 30 }}
                resizeMode="contain"
                fallback={
                  <Text className="text-sm font-extrabold text-white">
                    {initialsOf(config.app.name)}
                  </Text>
                }
              />
            </View>
            {/* Greeting */}
            <View className="flex-1">
              <Text className="text-xs font-medium text-white/80">
                {greetingForHour(new Date().getHours())}
              </Text>
              <Text
                className="text-[17px] font-bold tracking-tight-2 text-white"
                numberOfLines={1}
              >
                {displayName}
              </Text>
            </View>
            {/* Bell */}
            {isResident && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={() => router.push("/notifications")}
                className="h-10 w-10 items-center justify-center rounded-xl active:opacity-70"
                style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
              >
                <Bell size={19} color="white" strokeWidth={1.9} />
                {unreadCount > 0 && (
                  <View
                    className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                )}
              </Pressable>
            )}
            {/* Avatar — accent chip w/ initials + white ring */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile"
              onPress={() => router.push("/more" as never)}
              className="h-10 w-10 items-center justify-center rounded-full active:opacity-80"
              style={{
                backgroundColor: accent,
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.5)",
              }}
            >
              <Text
                className="text-[15px] font-extrabold"
                style={{ color: primaryDark }}
              >
                {isResident ? initialsOf(user?.name ?? "R") : "G"}
              </Text>
            </Pressable>
          </View>
        </GradientBox>

        {/* ── Search bar overlapping the header edge ── */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/search")}
          style={[searchShadow, { marginTop: -21, height: 42 }]}
          className="mx-5 flex-row items-center gap-2.5 rounded-[14px] bg-surface px-3.5 active:opacity-80 dark:bg-surface-dark"
        >
          <Search size={18} color={palette["fg-2"]} strokeWidth={2} />
          <Text className="font-sans text-sm text-fg-2 dark:text-fg-2-dark">
            Search services and places…
          </Text>
        </Pressable>

        {/* ── SOS bar (red gradient + glow) ── */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/sos" as never)}
          style={sosGlow}
          className="mx-5 mt-5 active:opacity-90"
        >
          <GradientBox
            stops={[
              { color: "#C62828", offset: 0 },
              { color: "#E53935", offset: 1 },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.35 }}
            style={{ borderRadius: 18, padding: 15 }}
          >
            <View className="flex-row items-center gap-3.5">
              <View
                className="h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              >
                <TriangleAlert size={20} color="white" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-extrabold text-white">
                  Emergency SOS
                </Text>
                <Text className="mt-0.5 font-sans text-xs text-white/85">
                  City Rescue & 911 · Tap for help
                </Text>
              </View>
              <ChevronRight size={18} color="white" />
            </View>
          </GradientBox>
        </Pressable>

        {/* ── Mayor's Corner (iff config.home.mayors_corner) ── */}
        {home.mayors_corner && (
          <GradientBox
            stops={[
              { color: primaryDark, offset: 0 },
              { color: primary, offset: 1 },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.55 }}
            className="mx-5 mt-4"
            style={{ borderRadius: 18, padding: 14, paddingHorizontal: 16 }}
          >
            <View className="flex-row items-center gap-3.5">
              <View
                className="h-16 w-16 items-center justify-center overflow-hidden rounded-full"
                style={{
                  borderWidth: 2,
                  borderColor: "rgba(255,255,255,0.6)",
                  backgroundColor: "rgba(255,255,255,0.15)",
                }}
              >
                <AssetImage
                  uri={brand.executive.photo}
                  style={{ width: 60, height: 60, borderRadius: 30 }}
                  resizeMode="cover"
                  accessibilityLabel={brand.executive.name}
                  fallback={
                    <Text className="text-lg font-extrabold text-white">
                      {initialsOf(brand.executive.name)}
                    </Text>
                  }
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[10px] font-extrabold uppercase tracking-kicker"
                  style={{ color: accent }}
                >
                  Mayor&apos;s Corner
                </Text>
                <Text
                  className="mt-0.5 text-[15px] font-extrabold leading-5 text-white"
                  numberOfLines={2}
                >
                  {brand.executive.greeting}
                </Text>
                <Text className="mt-0.5 font-sans text-[11px] text-white/80">
                  {brand.executive.name} · {brand.executive.title}
                </Text>
                <View
                  className="mt-1.5 self-start rounded-xl px-2.5 py-[3px]"
                  style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
                >
                  <Text className="text-[10px] font-bold text-white">
                    {brand.slogan}
                  </Text>
                </View>
              </View>
            </View>
          </GradientBox>
        )}

        {/* ── Services grid ── */}
        <View className="mt-6 flex-row items-center justify-between px-5">
          <AppText variant="section">Services</AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/services" as never)}
          >
            <Text
              className="text-[12.5px] font-semibold"
              style={{ color: primary }}
            >
              All services
            </Text>
          </Pressable>
        </View>
        <View className="mt-2 px-5">
          <ModuleGrid />
        </View>

        {/* ── Announcements ── */}
        <View className="mt-6 flex-row items-center justify-between px-5">
          <AppText variant="section">Announcements</AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/news" as never)}
          >
            <Text
              className="text-[12.5px] font-semibold"
              style={{ color: primary }}
            >
              News →
            </Text>
          </Pressable>
        </View>
        <AnnouncementsCarousel />

        {/* ── Weather + AQI ── */}
        <WeatherCard />

        {/* ── Nearby places ── */}
        <NearbyStrip />

        {/* ── Digital-ID banner (iff config.home.digital_id_promo) ── */}
        {home.digital_id_promo && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              isResident
                ? router.push("/digital-id")
                : router.push("/(auth)/login")
            }
            style={primaryGlow(primary)}
            className="mx-5 mt-6 active:opacity-90"
          >
            <GradientBox
              stops={[
                { color: primary, offset: 0 },
                { color: brand.colors.accentDeep, offset: 1 },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.6 }}
              style={{ borderRadius: 22, padding: 20, minHeight: 148 }}
            >
              <Text className="text-[10px] font-extrabold uppercase tracking-kicker text-white/70">
                Digital City ID
              </Text>
              <Text className="mt-1 w-3/4 text-[19px] font-extrabold leading-6 text-white">
                Get your QR City ID
              </Text>
              <View className="mt-3.5 self-start rounded-xl bg-white px-4 py-2.5">
                <Text
                  className="text-[13px] font-bold"
                  style={{ color: primary }}
                >
                  {isResident ? "Open my ID" : "Activate now"}
                </Text>
              </View>
            </GradientBox>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
