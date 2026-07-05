import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";

import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/typography";
import { useTenantConfig } from "@/contexts/tenant-config-context";

/** Minimal placeholder — M1 fills the OTP-first login flow. */
export default function Login() {
  const router = useRouter();
  const { config } = useTenantConfig();

  return (
    <Screen className="items-center justify-center gap-4 px-8">
      <AppText variant="title" className="text-center">
        {config?.app.name ?? "Welcome"}
      </AppText>
      <AppText variant="caption" className="text-center">
        Sign in is coming in a future update.
      </AppText>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/(tabs)")}
        className="mt-4 rounded-full bg-brand px-8 py-3 active:opacity-80"
      >
        <Text className="font-semibold text-white">Continue as guest</Text>
      </Pressable>
    </Screen>
  );
}
