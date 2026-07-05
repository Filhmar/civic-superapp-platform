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

import { OpenNowBadge, Rating } from "@/components/places/place-card";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useToast } from "@/components/ui/toast";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { usePlacesQuery } from "@/hooks/queries/use-places";

/** Business directory: search-as-you-type client filter over kind=business. */
export default function DirectoryIndex() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const { data: places, isPending } = usePlacesQuery({ kind: "business" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places ?? [];
    return (places ?? []).filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.address ?? "").toLowerCase().includes(q),
    );
  }, [places, query]);

  const call = (name: string, contact: string) => {
    toast.show(`Calling ${name}…`);
    void Linking.openURL(`tel:${contact.replace(/[^\d+]/g, "")}`);
  };

  return (
    <Screen>
      <ScreenHeader title="Directory" />
      <View className="px-5 pb-2">
        <View className="flex-row items-center gap-2 rounded-2xl bg-surface px-4 dark:bg-surface-dark">
          <Search size={16} color={palette["fg-2"]} />
          <TextInput
            className="flex-1 py-3 text-base text-fg dark:text-fg-dark"
            placeholder="Search businesses…"
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerClassName="px-5 pb-8 gap-2"
        ListEmptyComponent={
          <AppText variant="caption" className="mt-10 text-center">
            {isPending ? "Loading…" : "No businesses match."}
          </AppText>
        }
        renderItem={({ item }) => (
          <View className="rounded-2xl bg-surface p-4 dark:bg-surface-dark">
            <View className="flex-row items-center justify-between">
              <AppText variant="subtitle" className="flex-1 pr-2 text-sm">
                {item.name}
              </AppText>
              <OpenNowBadge open={item.open_now} />
            </View>
            <View className="mt-1 flex-row items-center gap-3">
              <Rating value={item.rating} />
              <AppText variant="caption">{item.category}</AppText>
            </View>
            {item.address && (
              <AppText variant="caption" className="mt-1" numberOfLines={1}>
                {item.address}
              </AppText>
            )}
            {item.contact && (
              <Pressable
                accessibilityRole="button"
                onPress={() => call(item.name, item.contact!)}
                className="mt-3 flex-row items-center justify-center gap-2 self-start rounded-full bg-tint px-4 py-2 active:opacity-70"
              >
                <PhoneCall size={14} color={palette["fg-2"]} />
                <Text className="text-xs font-semibold text-fg-2">Call</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </Screen>
  );
}
