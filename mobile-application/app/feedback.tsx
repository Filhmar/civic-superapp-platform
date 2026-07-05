import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from "react-native";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useToast } from "@/components/ui/toast";
import { AppText } from "@/components/ui/typography";
import { useLocale } from "@/contexts/locale-context";
import { useSendFeedbackMutation } from "@/hooks/mutations/use-feedback-mutation";

export default function Feedback() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useLocale();
  const send = useSendFeedbackMutation();
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");

  const submit = () => {
    if (message.trim().length < 5 || send.isPending) return;
    send.mutate(
      {
        message: message.trim(),
        ...(contact.trim() ? { contact: contact.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.show("Thank you for your feedback!");
          router.back();
        },
        onError: (err) =>
          toast.show(
            (err as { message?: string })?.message ?? "Could not send feedback.",
          ),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title={t("sendFeedback")} />
      <ScrollView
        contentContainerClassName="px-5 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="caption">
          Tell us what works, what doesn't, and what you'd like to see.
        </AppText>
        <TextInput
          className="mt-4 min-h-[140px] rounded-2xl bg-surface px-4 py-3.5 text-base text-fg dark:bg-surface-dark dark:text-fg-dark"
          multiline
          textAlignVertical="top"
          placeholder="Your feedback…"
          placeholderTextColor="#94A3B8"
          value={message}
          onChangeText={setMessage}
        />
        <TextInput
          className="mt-3 rounded-2xl bg-surface px-4 py-3.5 text-base text-fg dark:bg-surface-dark dark:text-fg-dark"
          placeholder="Contact (optional)"
          placeholderTextColor="#94A3B8"
          value={contact}
          onChangeText={setContact}
        />
        <Pressable
          accessibilityRole="button"
          onPress={submit}
          disabled={message.trim().length < 5 || send.isPending}
          className={`mt-6 items-center rounded-full bg-brand py-4 active:opacity-80 ${
            message.trim().length < 5 || send.isPending ? "opacity-50" : ""
          }`}
        >
          {send.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {t("sendFeedback")}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
