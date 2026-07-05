import { useRouter } from "expo-router";
import { Ambulance, Flame, PhoneCall, Shield, Siren } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";

import { SosHoldButton } from "@/components/sos/hold-button";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useHotlinesQuery } from "@/hooks/queries/use-hotlines";
import { useSosSession } from "@/hooks/use-sos-session";

/** Platform quick-link tags — hotline orgs/numbers are tenant data. */
const QUICK_LINKS = [
  { tag: "rescue", label: "Rescue", icon: Siren },
  { tag: "police", label: "Police", icon: Shield },
  { tag: "fire", label: "Fire", icon: Flame },
  { tag: "medical", label: "Medical", icon: Ambulance },
] as const;

export default function Sos() {
  const router = useRouter();
  const toast = useToast();
  const { state, session, fixCount, transport, activate, close, reset } =
    useSosSession();
  // Persisted to AsyncStorage — available offline for degraded mode.
  const { data: hotlines } = useHotlinesQuery();

  const dial = (tag: string, label: string) => {
    const line = (hotlines ?? []).find((h) => h.tag === tag);
    const number = line?.numbers[0];
    if (!number) {
      toast.show("No hotline on file yet");
      return;
    }
    toast.show(`Calling ${label}…`);
    void Linking.openURL(`tel:${number.replace(/[^\d+]/g, "")}`);
  };

  return (
    <Screen className="px-5">
      <View className="flex-1 items-center justify-center">
        {state === "live" && session ? (
          <>
            {/* LIVE session */}
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-full bg-danger" />
              <Text className="text-lg font-bold text-danger">LIVE</Text>
            </View>
            <AppText variant="title" className="mt-3 text-xl">
              {session.session_id}
            </AppText>
            <AppText variant="caption" className="mt-1 text-center">
              Dispatched to {session.dispatch_target}
            </AppText>
            <View className="mt-5 flex-row gap-3">
              <View className="items-center rounded-2xl bg-surface px-5 py-3 dark:bg-surface-dark">
                <AppText variant="subtitle">{fixCount}</AppText>
                <AppText variant="caption" className="text-[10px]">
                  location fixes
                </AppText>
              </View>
              <View className="items-center rounded-2xl bg-surface px-5 py-3 dark:bg-surface-dark">
                <AppText variant="subtitle">
                  {transport === "ws" ? "Realtime" : "HTTP"}
                </AppText>
                <AppText variant="caption" className="text-[10px]">
                  {transport === "ws" ? "socket connected" : "every 5s"}
                </AppText>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void close()}
              className="mt-8 items-center rounded-full bg-brand px-10 py-4 active:opacity-80"
            >
              <Text className="text-base font-semibold text-white">
                I'm safe — end SOS
              </Text>
            </Pressable>
          </>
        ) : state === "failed" ? (
          <>
            {/* Degraded mode: could not reach the server */}
            <AppText variant="title" className="text-center text-xl">
              Couldn't reach dispatch
            </AppText>
            <AppText variant="caption" className="mt-2 text-center">
              You appear to be offline. Call the rescue hotline directly:
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => dial("rescue", "Rescue")}
              className="mt-6 flex-row items-center gap-3 rounded-full bg-danger px-8 py-4 active:opacity-80"
            >
              <PhoneCall size={20} color="white" />
              <Text className="text-base font-bold text-white">
                Dial Rescue Hotline
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={reset}
              className="mt-4 py-2"
            >
              <Text className="text-sm text-fg-2 dark:text-fg-2-dark">
                Try SOS again
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <SosHoldButton
              onActivate={() => void activate()}
              disabled={state === "opening"}
            />
            <AppText variant="caption" className="mt-4 text-center">
              {state === "opening"
                ? "Contacting dispatch…"
                : "Hold for 3 seconds to alert emergency dispatch with your live location."}
            </AppText>
          </>
        )}
      </View>

      {state !== "live" && (
        <View className="pb-6">
          <View className="flex-row items-center justify-between">
            <AppText variant="subtitle">Quick links</AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/hotlines" as never)}
            >
              <Text className="text-xs font-semibold text-brand">
                All hotlines
              </Text>
            </Pressable>
          </View>
          <View className="mt-3 flex-row justify-between">
            {QUICK_LINKS.map(({ tag, label, icon: Icon }) => (
              <Pressable
                key={tag}
                accessibilityRole="button"
                onPress={() => dial(tag, label)}
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
      )}
    </Screen>
  );
}
