import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";

/**
 * Sub-screen header per DESIGN_SPEC §4: 40px light-gray rounded square back
 * button + 16/800 title on a white sheet with a hairline.
 */
export function ScreenHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-3 border-b border-line bg-surface px-4 pb-3 pt-2 dark:border-line-dark dark:bg-surface-dark">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-[14px] bg-[#F1F4F1] active:opacity-60 dark:bg-bg-dark"
      >
        <ChevronLeft size={20} color={palette.fg} strokeWidth={2.2} />
      </Pressable>
      <AppText variant="section" className="flex-1" numberOfLines={1}>
        {title}
      </AppText>
      {right}
    </View>
  );
}
