import { Tabs } from "expo-router";

import { AppTabBar } from "@/components/navigation/tab-bar";

/** Tabs per DESIGN_SPEC §5: Home · Services · [SOS] · News · More. */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="services" options={{ title: "Services" }} />
      <Tabs.Screen name="sos" options={{ title: "SOS" }} />
      <Tabs.Screen name="news" options={{ title: "News" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
