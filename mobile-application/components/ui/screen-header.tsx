import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GradientBox } from "@/components/ui/gradient-box";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { lightenHex } from "@/lib/theme";

/**
 * Sub-screen hero header: tenant primary gradient (config-driven — tenancy is
 * data, never code), glass back button, white title. Pulls itself up over the
 * parent Screen's safe-area padding so the gradient reaches the status bar.
 */
export function ScreenHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config } = useTenantConfig();
  const primary = config?.brand.colors.primary ?? palette.brand;
  const primaryDark = config?.brand.colors.primaryDark ?? palette["brand-dark"];
  return (
    <GradientBox
      stops={[
        { color: primaryDark, offset: 0 },
        { color: primary, offset: 0.65 },
        { color: lightenHex(primary, 0.15), offset: 1 },
      ]}
      style={{
        marginTop: -insets.top, // Screen already padded the inset; reclaim it
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 14,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        marginBottom: 12,
      }}
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-[14px] active:opacity-60"
          style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
        >
          <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
        </Pressable>
        {/* style color: must beat the variant's text-fg on the gradient */}
        <AppText
          variant="section"
          className="flex-1"
          style={{ color: "#FFFFFF" }}
          numberOfLines={1}
        >
          {title}
        </AppText>
        {right}
      </View>
    </GradientBox>
  );
}
