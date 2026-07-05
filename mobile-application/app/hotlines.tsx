import { PhoneCall, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  FlatList,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useToast } from "@/components/ui/toast";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useHotlinesQuery } from "@/hooks/queries/use-hotlines";

const TAGS = ["all", "rescue", "police", "fire", "medical", "utility"] as const;

/** Searchable hotlines — persisted query, works offline. */
export default function Hotlines() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<(typeof TAGS)[number]>("all");
  const { data: hotlines, isPending } = useHotlinesQuery();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (hotlines ?? []).filter(
      (h) =>
        (tag === "all" || h.tag === tag) &&
        (q.length === 0 ||
          h.org.toLowerCase().includes(q) ||
          h.numbers.some((n) => n.includes(q))),
    );
  }, [hotlines, query, tag]);

  const call = (org: string, number: string) => {
    toast.show(`Calling ${org}…`);
    void Linking.openURL(`tel:${number.replace(/[^\d+]/g, "")}`);
  };

  return (
    <Screen>
      <ScreenHeader title="Hotlines" />
      <View className="px-5 pb-2">
        <View className="flex-row items-center gap-2 rounded-2xl bg-surface px-4 dark:bg-surface-dark">
          <Search size={16} color={palette["fg-2"]} />
          <TextInput
            className="flex-1 py-3 text-base text-fg dark:text-fg-dark"
            placeholder="Search organization or number…"
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {TAGS.map((t) => (
            <Pressable
              key={t}
              accessibilityRole="button"
              onPress={() => setTag(t)}
              className={`rounded-full px-3.5 py-1.5 ${
                tag === t ? "bg-brand" : "bg-surface dark:bg-surface-dark"
              }`}
            >
              <Text
                className={`text-xs font-semibold capitalize ${
                  tag === t ? "text-white" : "text-fg-2 dark:text-fg-2-dark"
                }`}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(h) => `${h.org}-${h.tag}`}
        contentContainerClassName="px-5 pb-8 gap-2"
        ListEmptyComponent={
          <AppText variant="caption" className="mt-10 text-center">
            {isPending ? "Loading…" : "No hotlines match."}
          </AppText>
        }
        renderItem={({ item }) => (
          <View className="rounded-2xl bg-surface p-4 dark:bg-surface-dark">
            <View className="flex-row items-center justify-between">
              <AppText variant="subtitle" className="flex-1 pr-2 text-sm">
                {item.org}
              </AppText>
              <View className="rounded-full bg-tint px-2.5 py-0.5">
                <Text className="text-[10px] font-semibold capitalize text-fg-2">
                  {item.tag}
                </Text>
              </View>
            </View>
            <View className="mt-2 gap-1.5">
              {item.numbers.map((number) => (
                <Pressable
                  key={number}
                  accessibilityRole="button"
                  onPress={() => call(item.org, number)}
                  className="flex-row items-center gap-2 active:opacity-60"
                >
                  <PhoneCall size={14} color={palette["fg-2"]} />
                  <Text className="text-sm font-medium text-brand">
                    {number}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
