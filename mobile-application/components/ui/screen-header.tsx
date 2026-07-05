import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";

/** Simple back + title header for stack screens (root header is hidden). */
export function ScreenHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-2 px-3 py-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
      >
        <ChevronLeft size={24} color={palette["fg-2"]} />
      </Pressable>
      <AppText variant="subtitle" className="flex-1" numberOfLines={1}>
        {title}
      </AppText>
      {right}
    </View>
  );
}
