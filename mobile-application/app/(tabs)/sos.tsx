import { Ambulance, Flame, Shield, Siren } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";

/** Platform quick-link labels — hotline numbers are tenant data (later). */
const QUICK_LINKS = [
  { key: "rescue", label: "Rescue", icon: Siren },
  { key: "police", label: "Police", icon: Shield },
  { key: "fire", label: "Fire", icon: Flame },
  { key: "medical", label: "Medical", icon: Ambulance },
] as const;

/** SOS shell — hold-to-activate + live location ship in a later milestone. */
export default function Sos() {
  const toast = useToast();

  return (
    <Screen className="px-5">
      <View className="flex-1 items-center justify-center">
        <Pressable
          accessibilityRole="button"
          onPress={() => toast.show("Hold-to-SOS is coming soon")}
          className="h-44 w-44 items-center justify-center rounded-full bg-danger active:opacity-80"
        >
          <Siren size={48} color="white" />
          <Text className="mt-2 text-xl font-bold text-white">SOS</Text>
        </Pressable>
        <AppText variant="caption" className="mt-4 text-center">
          Hold-to-activate SOS with live location is coming soon.
        </AppText>
      </View>

      <View className="pb-6">
        <AppText variant="subtitle" className="mb-3">
          Quick links
        </AppText>
        <View className="flex-row justify-between">
          {QUICK_LINKS.map(({ key, label, icon: Icon }) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              onPress={() => toast.show(`Calling ${label}…`)}
              className="w-[23%] items-center rounded-2xl bg-surface py-4 active:opacity-70 dark:bg-surface-dark"
            >
              <Icon size={22} color={palette["fg-2"]} />
              <AppText variant="caption" className="mt-1.5 font-medium">
                {label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
