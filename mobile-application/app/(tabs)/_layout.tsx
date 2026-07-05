import { Tabs } from "expo-router";
import { House, Menu, Siren } from "lucide-react-native";

import { palette } from "@/constants/colors";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const { config } = useTenantConfig();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Active tint is the tenant's brand primary (runtime config, data not code).
  const activeTint = config?.brand.colors.primary ?? palette.brand;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: isDark ? palette["fg-2-dark"] : palette["fg-2"],
        tabBarStyle: {
          backgroundColor: isDark ? palette["surface-dark"] : palette.surface,
          borderTopColor: isDark ? palette["bg-dark"] : palette.tint,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: "SOS",
          tabBarIcon: ({ color, size }) => <Siren color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
