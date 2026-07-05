import { Search } from "lucide-react-native";
import { TextInput, View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";

/** Search stub — recents & quick actions ship in a later milestone. */
export default function SearchScreen() {
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
            autoFocus
          />
        </View>
        <AppText variant="caption" className="mt-6 text-center">
          Search across services, news and places is coming soon.
        </AppText>
      </View>
    </Screen>
  );
}
