/**
 * Floating tab bar per DESIGN_SPEC §4: white sheet, top radius 26, upward
 * shadow, tabs Home · Services · [SOS] · News · More; center SOS is a 60px
 * danger circle with a white halo ring raised above the bar, on every tab.
 */
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Ellipsis,
  House,
  LayoutGrid,
  Newspaper,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette } from "@/constants/colors";
import { sosGlow, tabBarShadow } from "@/constants/shadows";
import { useTenantConfig } from "@/contexts/tenant-config-context";

const TAB_META: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: "Home", icon: House },
  services: { label: "Services", icon: LayoutGrid },
  news: { label: "News", icon: Newspaper },
  more: { label: "More", icon: Ellipsis },
};

/** Left/right slot order around the center SOS button. */
const LEFT = ["index", "services"];
const RIGHT = ["news", "more"];

export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { config } = useTenantConfig();
  const primary = config?.brand.colors.primary ?? palette.brand;

  const activeRoute = state.routes[state.index]?.name;

  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (activeRoute !== name && !event.defaultPrevented) {
      navigation.navigate(name);
    }
  };

  const renderTab = (name: string) => {
    const meta = TAB_META[name];
    if (!meta) return null;
    const active = activeRoute === name;
    const color = active ? primary : palette["fg-2"];
    const Icon = meta.icon;
    return (
      <Pressable
        key={name}
        accessibilityRole="button"
        accessibilityState={active ? { selected: true } : {}}
        onPress={() => go(name)}
        className="flex-1 items-center gap-1 pt-2.5"
      >
        <Icon size={22} color={color} strokeWidth={active ? 2.2 : 1.8} />
        <Text
          className="text-[10px] font-bold"
          style={{ color }}
          numberOfLines={1}
        >
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        tabBarShadow,
        {
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
      className="bg-surface dark:bg-surface-dark"
    >
      <View className="flex-row items-start px-4">
        {LEFT.map(renderTab)}
        {/* Center slot spacer for the raised SOS button */}
        <View className="w-[72px]" />
        {RIGHT.map(renderTab)}
      </View>

      {/* Raised SOS button — halo ring + red glow */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: -26,
          alignItems: "center",
        }}
      >
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: 74,
            height: 74,
            backgroundColor: "rgba(255,255,255,0.9)",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Emergency SOS"
            onPress={() => go("sos")}
            style={[sosGlow, { width: 60, height: 60 }]}
            className="items-center justify-center rounded-full bg-danger active:opacity-90"
          >
            <Text className="text-[15px] font-extrabold text-white">SOS</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
