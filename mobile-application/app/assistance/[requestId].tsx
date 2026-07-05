import { useLocalSearchParams } from "expo-router";
import { CircleCheck, Circle } from "lucide-react-native";
import { ScrollView, View } from "react-native";

import { StatusChip } from "@/components/reports/status-chip";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { StepTimeline } from "@/components/ui/step-timeline";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { useAssistanceRequestQuery } from "@/hooks/queries/use-assistance";
import { formatDateTime } from "@/utils/format-date";

const STEPS = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "RELEASED"];

export default function AssistanceRequestDetail() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { config } = useTenantConfig();
  const {
    data: request,
    isPending,
    isError,
  } = useAssistanceRequestQuery(requestId ?? "");
  const primary = config?.brand.colors.primary ?? palette.brand;

  return (
    <Screen>
      <ScreenHeader title={requestId ?? "Request"} />
      {isError ? (
        <AppText variant="caption" className="mt-10 text-center">
          Could not load this request.
        </AppText>
      ) : isPending || !request ? (
        <AppText variant="caption" className="mt-10 text-center">
          Loading…
        </AppText>
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-10">
          <View className="rounded-2xl bg-surface p-5 dark:bg-surface-dark">
            <View className="flex-row items-center justify-between">
              <AppText variant="subtitle">{request.program.name}</AppText>
              <StatusChip status={request.status} />
            </View>
            <AppText variant="caption" className="mt-1">
              {request.office}
            </AppText>
            <AppText variant="body" className="mt-3 leading-6">
              {request.details}
            </AppText>
          </View>

          {/* Claim info when approved */}
          {(request.claim_schedule || request.claim_location) && (
            <View className="mt-4 rounded-2xl bg-brand p-5">
              <AppText variant="subtitle" className="text-sm text-white">
                Ready to claim
              </AppText>
              {request.claim_schedule && (
                <AppText variant="caption" className="mt-1 text-white/90">
                  {formatDateTime(request.claim_schedule)}
                </AppText>
              )}
              {request.claim_location && (
                <AppText variant="caption" className="mt-0.5 text-white/90">
                  {request.claim_location}
                </AppText>
              )}
            </View>
          )}

          {/* Checklist */}
          <AppText variant="subtitle" className="mb-2 mt-6">
            Document checklist
          </AppText>
          <View className="gap-2">
            {request.checklist.map((item) => (
              <View
                key={item.name}
                className="flex-row items-center gap-2 rounded-2xl bg-surface px-4 py-3 dark:bg-surface-dark"
              >
                {item.provided ? (
                  <CircleCheck size={18} color={primary} />
                ) : (
                  <Circle size={18} color={palette["fg-2"]} />
                )}
                <AppText
                  variant="caption"
                  className={item.provided ? "" : "opacity-70"}
                >
                  {item.name}
                </AppText>
              </View>
            ))}
          </View>

          <AppText variant="subtitle" className="mb-3 mt-6">
            Progress
          </AppText>
          <StepTimeline
            steps={
              request.status === "REJECTED"
                ? ["SUBMITTED", "UNDER_REVIEW", "REJECTED"]
                : STEPS
            }
            timeline={request.timeline}
            status={request.status}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
