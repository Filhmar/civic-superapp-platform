import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import { useAuth } from "@/contexts/auth-context";
import { useCreateAssistanceRequestMutation } from "@/hooks/mutations/use-assistance-mutations";
import { useAssistanceProgramsQuery } from "@/hooks/queries/use-assistance";

export default function AssistanceApply() {
  const router = useRouter();
  const toast = useToast();
  const { programKey } = useLocalSearchParams<{ programKey: string }>();
  const { status } = useAuth();
  const { data: programs } = useAssistanceProgramsQuery();
  const createRequest = useCreateAssistanceRequestMutation();
  const [details, setDetails] = useState("");

  const program = useMemo(
    () => (programs ?? []).find((p) => p.key === programKey),
    [programs, programKey],
  );

  const submit = () => {
    if (status !== "resident") {
      toast.show("Sign in as a resident to request assistance.");
      router.push("/(auth)/login");
      return;
    }
    if (!program || details.trim().length < 5 || createRequest.isPending) {
      return;
    }
    createRequest.mutate(
      { program_key: program.key, details: details.trim() },
      {
        onSuccess: (req) => {
          toast.show(`Request ${req.request_id} submitted`);
          router.replace(`/assistance/${req.request_id}` as never);
        },
        onError: (err) =>
          toast.show(
            (err as { message?: string })?.message ??
              "Could not submit the request.",
          ),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title={program?.name ?? "Request Assistance"} />
      <ScrollView
        contentContainerClassName="px-5 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        {program && (
          <>
            <AppText variant="caption">{program.description}</AppText>
            <AppText variant="caption" className="mt-1">
              Handled by {program.office}
            </AppText>
            <AppText variant="subtitle" className="mt-5 text-sm">
              Bring these when claiming
            </AppText>
            {program.requirements.map((req) => (
              <AppText key={req} variant="caption" className="mt-1">
                • {req}
              </AppText>
            ))}
          </>
        )}

        <AppText variant="subtitle" className="mt-6 text-sm">
          Tell us about your situation
        </AppText>
        <TextInput
          className="mt-2 min-h-[120px] rounded-2xl bg-surface px-4 py-3.5 text-base text-fg dark:bg-surface-dark dark:text-fg-dark"
          multiline
          textAlignVertical="top"
          placeholder="Who needs help, what happened, how much support is needed…"
          placeholderTextColor="#94A3B8"
          value={details}
          onChangeText={setDetails}
        />

        <Pressable
          accessibilityRole="button"
          onPress={submit}
          disabled={
            status === "resident" &&
            (details.trim().length < 5 || createRequest.isPending)
          }
          className={`mt-6 items-center rounded-full bg-brand py-4 active:opacity-80 ${
            status === "resident" &&
            (details.trim().length < 5 || createRequest.isPending)
              ? "opacity-50"
              : ""
          }`}
        >
          {createRequest.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {status === "resident" ? "Submit Request" : "Sign in to request"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
