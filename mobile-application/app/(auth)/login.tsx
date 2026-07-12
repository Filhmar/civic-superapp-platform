import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssetImage } from "@/components/ui/asset-image";
import { GradientBox } from "@/components/ui/gradient-box";
import { GhostButton, PrimaryButton } from "@/components/ui/primary-button";
import { useToast } from "@/components/ui/toast";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { useRequestOtpMutation } from "@/hooks/mutations/use-auth-mutations";
import { lightenHex } from "@/lib/theme";
import { otpErrorMessage } from "@/services/auth";

const PH_PREFIX = "+63";

/**
 * Login per DESIGN_SPEC §4: primary gradient hero (bottom radius 40) with the
 * tenant mark + wordmark, then welcome display, +63 field, Send OTP CTA,
 * "or" divider and Continue as Guest. Branding is config data.
 */
export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { config } = useTenantConfig();
  const { signInGuest } = useAuth();
  const requestOtp = useRequestOtpMutation();
  const [digits, setDigits] = useState("");
  const [guestBusy, setGuestBusy] = useState(false);

  const valid = /^9\d{9}$/.test(digits);
  const phoneNumber = `${PH_PREFIX}${digits}`;
  const primary = config?.brand.colors.primary ?? palette.brand;
  const primaryDark = config?.brand.colors.primaryDark ?? palette["brand-dark"];

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
        toast.show(
          otpErrorMessage(err),
        );
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
    <ScrollView
      className="flex-1 bg-surface dark:bg-bg-dark"
      contentContainerClassName="pb-10"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Hero — primary gradient sheet, bottom radius 40 */}
      <GradientBox
        stops={[
          { color: primaryDark, offset: 0 },
          { color: primary, offset: 0.7 },
          { color: lightenHex(primary, 0.15), offset: 1 },
        ]}
        style={{
          paddingTop: insets.top + 56,
          paddingBottom: 48,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          alignItems: "center",
        }}
      >
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: 148,
            height: 148,
            backgroundColor: "rgba(255,255,255,0.16)",
          }}
        >
          <AssetImage
            uri={config?.brand.logo.assets.seal}
            style={{ width: 122, height: 122, borderRadius: 61 }}
            resizeMode="contain"
            accessibilityLabel="City seal"
            fallback={
              <Text className="text-2xl font-extrabold text-white">
                {config?.app.name?.slice(0, 2).toUpperCase()}
              </Text>
            }
          />
        </View>
        <Text className="mt-5 text-[28px] font-extrabold tracking-tight-5 text-white">
          {config?.app.name}
        </Text>
      </GradientBox>

      <View className="px-6 pt-8">
        <AppText variant="display">Welcome!</AppText>
        <Text className="mt-2 font-sans text-[15px] text-fg-2 dark:text-fg-2-dark">
          Sign in with your mobile number to continue.
        </Text>

        <Text className="mt-7 text-[11.5px] font-semibold text-fg-2 dark:text-fg-2-dark">
          Mobile Number
        </Text>
        <View
          className="mt-2 h-[52px] flex-row items-center rounded-[14px] bg-[#F1F4F1] px-4 dark:bg-surface-dark"
        >
          <Text className="text-sm font-bold text-fg dark:text-fg-dark">
            🇵🇭 {PH_PREFIX}
          </Text>
          <View className="mx-3 h-5 w-px bg-line dark:bg-line-dark" />
          <TextInput
            className="flex-1 py-3 font-semibold text-sm text-fg dark:text-fg-dark"
            keyboardType="number-pad"
            maxLength={10}
            placeholder="917 555 0142"
            placeholderTextColor={palette["fg-2"]}
            value={digits}
            onChangeText={(t) => setDigits(t.replace(/\D/g, ""))}
            testID="phone-input"
          />
        </View>

        <PrimaryButton
          label="Send OTP"
          onPress={sendCode}
          disabled={!valid}
          loading={requestOtp.isPending}
          className="mt-5"
        />

        {/* or divider */}
        <View className="my-5 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-line dark:bg-line-dark" />
          <Text className="font-sans text-xs text-fg-2">or</Text>
          <View className="h-px flex-1 bg-line dark:bg-line-dark" />
        </View>

        <GhostButton
          label="Continue as Guest"
          onPress={() => void continueAsGuest()}
          loading={guestBusy}
        />

        <Text className="mt-6 text-center font-sans text-[11.5px] leading-4 text-fg-2 dark:text-fg-2-dark">
          By continuing you agree to the city&apos;s{" "}
          <Text className="text-[11.5px] font-semibold" style={{ color: primary }}>
            Terms
          </Text>{" "}
          &{" "}
          <Text className="text-[11.5px] font-semibold" style={{ color: primary }}>
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
    </ScrollView>
  );
}
