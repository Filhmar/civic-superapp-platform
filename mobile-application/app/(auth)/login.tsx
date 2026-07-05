import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { AppText } from "@/components/ui/typography";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { useRequestOtpMutation } from "@/hooks/mutations/use-auth-mutations";

const PH_PREFIX = "+63";

/** +63 phone entry → OTP request → OTP screen. Or continue as guest. */
export default function Login() {
  const router = useRouter();
  const toast = useToast();
  const { config } = useTenantConfig();
  const { signInGuest } = useAuth();
  const requestOtp = useRequestOtpMutation();
  const [digits, setDigits] = useState("");
  const [guestBusy, setGuestBusy] = useState(false);

  const valid = /^9\d{9}$/.test(digits);
  const phoneNumber = `${PH_PREFIX}${digits}`;

  const sendCode = () => {
    if (!valid || requestOtp.isPending) return;
    requestOtp.mutate(phoneNumber, {
      onSuccess: (res) => {
        router.push({
          pathname: "/(auth)/otp",
          params: {
            phone: phoneNumber,
            expiresIn: String(res.expires_in_seconds),
            ...(res.dev_code ? { devCode: res.dev_code } : {}),
          },
        });
      },
      onError: (err) => {
        const message =
          (err as { message?: string })?.message ?? "Could not send the code.";
        toast.show(message);
      },
    });
  };

  const continueAsGuest = async () => {
    if (guestBusy) return;
    setGuestBusy(true);
    try {
      await signInGuest();
      router.replace("/(tabs)");
    } catch {
      toast.show("Could not start a guest session. Try again.");
    } finally {
      setGuestBusy(false);
    }
  };

  return (
    <Screen className="justify-center px-8">
      {/* Branding — from tenant config */}
      <AppText variant="title" className="text-center">
        {config?.app.name}
      </AppText>
      {config?.brand.slogan ? (
        <View className="mt-2 self-center rounded-full bg-tint px-4 py-1.5">
          <Text
            className="text-xs font-semibold"
            style={{ color: config.brand.colors.primaryDark }}
          >
            {config.brand.slogan}
          </Text>
        </View>
      ) : null}

      <AppText variant="subtitle" className="mt-10">
        Sign in with your mobile number
      </AppText>
      <View className="mt-3 flex-row items-center rounded-2xl bg-surface px-4 dark:bg-surface-dark">
        <Text className="text-base font-semibold text-fg dark:text-fg-dark">
          {PH_PREFIX}
        </Text>
        <TextInput
          className="ml-2 flex-1 py-4 text-base text-fg dark:text-fg-dark"
          keyboardType="number-pad"
          maxLength={10}
          placeholder="9XXXXXXXXX"
          placeholderTextColor="#94A3B8"
          value={digits}
          onChangeText={(t) => setDigits(t.replace(/\D/g, ""))}
          autoFocus
          testID="phone-input"
        />
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!valid || requestOtp.isPending}
        onPress={sendCode}
        className={`mt-5 items-center rounded-full bg-brand py-4 active:opacity-80 ${
          !valid || requestOtp.isPending ? "opacity-50" : ""
        }`}
      >
        {requestOtp.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-base font-semibold text-white">Send Code</Text>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={continueAsGuest}
        disabled={guestBusy}
        className="mt-4 items-center py-3"
      >
        {guestBusy ? (
          <ActivityIndicator />
        ) : (
          <Text className="text-sm font-medium text-fg-2 dark:text-fg-2-dark">
            Continue as Guest
          </Text>
        )}
      </Pressable>
    </Screen>
  );
}
