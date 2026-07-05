import { useRouter } from "expo-router";
import {
  Bus,
  MapPin,
  Megaphone,
  Newspaper,
  PhoneCall,
  Search,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import {
  useRecentSearchesQuery,
  useSearchQuery,
} from "@/hooks/queries/use-search";

const DEBOUNCE_MS = 350;

/** Federated search: places / routes / posts / hotlines / services. */
export default function SearchScreen() {
  const router = useRouter();
  const { status } = useAuth();
  const isResident = status === "resident";
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  // Debounce.
  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  const results = useSearchQuery(query);
  const recents = useRecentSearchesQuery({ enabled: isResident });

  const hasQuery = query.length >= 2;
  const data = results.data;
  const empty =
    hasQuery &&
    data &&
    data.places.length +
      data.routes.length +
      data.posts.length +
      data.hotlines.length +
      data.services.length ===
      0;

  return (
    <Screen>
      <ScreenHeader title="Search" />
      <View className="px-5">
        <View className="flex-row items-center gap-2 rounded-2xl bg-surface px-4 dark:bg-surface-dark">
          <Search size={18} color={palette["fg-2"]} />
          <TextInput
            className="flex-1 py-3.5 text-base text-fg dark:text-fg-dark"
            placeholder="Search services, news, places…"
            placeholderTextColor="#94A3B8"
            value={input}
            onChangeText={setInput}
            autoFocus
          />
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {!hasQuery && (
          <>
            {/* Quick actions */}
            <AppText variant="subtitle" className="text-sm">
              Quick actions
            </AppText>
            <View className="mt-2 flex-row gap-3">
              <QuickAction
                label="Report"
                icon={<Megaphone size={18} color={palette["fg-2"]} />}
                onPress={() => router.push("/report" as never)}
              />
              <QuickAction
                label="Hotlines"
                icon={<PhoneCall size={18} color={palette["fg-2"]} />}
                onPress={() => router.push("/hotlines" as never)}
              />
              <QuickAction
                label="Tourism"
                icon={<MapPin size={18} color={palette["fg-2"]} />}
                onPress={() => router.push("/tourism" as never)}
              />
            </View>

            {/* Recents (residents) */}
            {isResident && (recents.data?.length ?? 0) > 0 && (
              <>
                <AppText variant="subtitle" className="mt-6 text-sm">
                  Recent searches
                </AppText>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {(recents.data ?? []).map((term) => (
                    <Pressable
                      key={term}
                      accessibilityRole="button"
                      onPress={() => setInput(term)}
                      className="rounded-full bg-surface px-4 py-2 active:opacity-70 dark:bg-surface-dark"
                    >
                      <Text className="text-xs text-fg-2 dark:text-fg-2-dark">
                        {term}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {hasQuery && results.isPending && (
          <AppText variant="caption" className="mt-6 text-center">
            Searching…
          </AppText>
        )}
        {empty && (
          <AppText variant="caption" className="mt-6 text-center">
            Nothing found for “{query}”.
          </AppText>
        )}

        {data && (
          <>
            <Section title="Places" visible={data.places.length > 0}>
              {data.places.map((p) => (
                <Row
                  key={p.id}
                  icon={<MapPin size={16} color={palette["fg-2"]} />}
                  title={p.name}
                  subtitle={`${p.category}${p.address ? ` · ${p.address}` : ""}`}
                  onPress={() => router.push(`/tourism/${p.id}` as never)}
                />
              ))}
            </Section>
            <Section title="Routes" visible={data.routes.length > 0}>
              {data.routes.map((r) => (
                <Row
                  key={r.id}
                  icon={<Bus size={16} color={palette["fg-2"]} />}
                  title={r.name}
                  subtitle={`₱${r.fare_min}–₱${r.fare_max} · ${r.mode}`}
                  onPress={() => router.push("/transport" as never)}
                />
              ))}
            </Section>
            <Section title="News" visible={data.posts.length > 0}>
              {data.posts.map((post) => (
                <Row
                  key={post.id}
                  icon={<Newspaper size={16} color={palette["fg-2"]} />}
                  title={post.title}
                  subtitle={post.category}
                  onPress={() => router.push(`/news/${post.id}` as never)}
                />
              ))}
            </Section>
            <Section title="Hotlines" visible={data.hotlines.length > 0}>
              {data.hotlines.map((h) => (
                <Row
                  key={`${h.org}-${h.tag}`}
                  icon={<PhoneCall size={16} color={palette["fg-2"]} />}
                  title={h.org}
                  subtitle={h.numbers.join(" · ")}
                  onPress={() => router.push("/hotlines" as never)}
                />
              ))}
            </Section>
            <Section title="e-Services" visible={data.services.length > 0}>
              {data.services.map((s) => (
                <Row
                  key={s.code}
                  icon={<Search size={16} color={palette["fg-2"]} />}
                  title={s.name}
                  subtitle={s.fee != null ? `₱${s.fee}` : (s.group ?? "")}
                  onPress={() => router.push(`/services/${s.code}` as never)}
                />
              ))}
            </Section>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function QuickAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-1 items-center gap-1.5 rounded-2xl bg-surface py-4 active:opacity-70 dark:bg-surface-dark"
    >
      {icon}
      <Text className="text-xs font-medium text-fg dark:text-fg-dark">
        {label}
      </Text>
    </Pressable>
  );
}

function Section({
  title,
  visible,
  children,
}: {
  title: string;
  visible: boolean;
  children: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <View className="mt-5">
      <AppText variant="subtitle" className="text-sm">
        {title}
      </AppText>
      <View className="mt-2 gap-2">{children}</View>
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl bg-surface px-4 py-3 active:opacity-70 dark:bg-surface-dark"
    >
      {icon}
      <View className="flex-1">
        <AppText variant="subtitle" className="text-sm" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
    </Pressable>
  );
}
