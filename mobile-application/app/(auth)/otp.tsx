import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import {
  useRequestOtpMutation,
  useVerifyOtpMutation,
} from "@/hooks/mutations/use-auth-mutations";

const CODE_LENGTH = 6;

/** 6-digit OTP entry with resend countdown. */
export default function Otp() {
  const router = useRouter();
  const toast = useToast();
  const { signInResident } = useAuth();
  const params = useLocalSearchParams<{
    phone: string;
    expiresIn?: string;
    devCode?: string;
  }>();
  const phone = params.phone ?? "";

  const verifyOtp = useVerifyOtpMutation();
  const resendOtp = useRequestOtpMutation();

  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState(params.devCode);
  const [secondsLeft, setSecondsLeft] = useState(
    Number.parseInt(params.expiresIn ?? "300", 10) || 300,
  );
  const inputRef = useRef<TextInput>(null);

  // Countdown for resend.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (value: string) => {
    if (value.length !== CODE_LENGTH || verifyOtp.isPending) return;
    verifyOtp.mutate(
      { phoneNumber: phone, code: value },
      {
        onSuccess: async (session) => {
          await signInResident(session);
          router.replace("/(tabs)");
        },
        onError: (err) => {
          setCode("");
          toast.show(
            (err as { message?: string })?.message ?? "Invalid code. Try again.",
          );
        },
      },
    );
  };

  const onChange = (raw: string) => {
    const next = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(next);
    if (next.length === CODE_LENGTH) submit(next);
  };

  const resend = () => {
    if (secondsLeft > 0 || resendOtp.isPending) return;
    resendOtp.mutate(phone, {
      onSuccess: (res) => {
        setSecondsLeft(res.expires_in_seconds);
        setDevCode(res.dev_code);
        toast.show("Code sent");
      },
      onError: (err) => {
        toast.show(
          (err as { message?: string })?.message ?? "Could not resend the code.",
        );
      },
    });
  };

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <Screen className="justify-center px-8">
      <AppText variant="title" className="text-center">
        Enter the code
      </AppText>
      <AppText variant="caption" className="mt-2 text-center">
        We sent a {CODE_LENGTH}-digit code to {phone}
      </AppText>

      {/* Code boxes over a single hidden input */}
      <Pressable
        className="mt-8 flex-row justify-center gap-2"
        onPress={() => inputRef.current?.focus()}
      >
        {Array.from({ length: CODE_LENGTH }).map((_, i) => (
          <View
            key={i}
            className={`h-14 w-11 items-center justify-center rounded-xl bg-surface dark:bg-surface-dark ${
              i === code.length ? "border-2 border-brand" : ""
            }`}
          >
            <Text className="text-xl font-bold text-fg dark:text-fg-dark">
              {code[i] ?? ""}
            </Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={inputRef}
        className="absolute h-px w-px opacity-0"
        keyboardType="number-pad"
        value={code}
        onChangeText={onChange}
        maxLength={CODE_LENGTH}
        autoFocus
        testID="otp-input"
      />

      {verifyOtp.isPending && <ActivityIndicator className="mt-6" />}

      {/* Dev-only hint chip */}
      {__DEV__ && devCode ? (
        <Pressable
          onPress={() => onChange(devCode)}
          className="mt-6 self-center rounded-full bg-tint px-4 py-1.5"
        >
          <Text className="text-xs font-medium text-fg-2">
            dev code: {devCode} (tap to fill)
          </Text>
        </Pressable>
      ) : null}

      <View className="mt-8 items-center">
        {secondsLeft > 0 ? (
          <AppText variant="caption">
            Resend available in {mm}:{ss}
          </AppText>
        ) : (
          <Pressable accessibilityRole="button" onPress={resend} hitSlop={8}>
            <Text className="text-sm font-semibold text-brand">
              {resendOtp.isPending ? "Sending…" : "Resend code"}
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        className="mt-6 items-center py-2"
      >
        <Text className="text-sm text-fg-2 dark:text-fg-2-dark">
          Change number
        </Text>
      </Pressable>
    </Screen>
  );
}
