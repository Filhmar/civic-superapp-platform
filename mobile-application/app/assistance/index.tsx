import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { StatusChip } from "@/components/reports/status-chip";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import {
  useAssistanceProgramsQuery,
  useMyAssistanceRequestsQuery,
} from "@/hooks/queries/use-assistance";
import { formatDate } from "@/utils/format-date";
import { getLucideIcon } from "@/utils/report-icons";

/** Assistance programs + active-request tracker. */
export default function AssistanceIndex() {
  const router = useRouter();
  const { config } = useTenantConfig();
  const { status } = useAuth();
  const { data: programs, isPending } = useAssistanceProgramsQuery();
  const { data: requests } = useMyAssistanceRequestsQuery({
    enabled: status === "resident",
  });
  const primary = config?.brand.colors.primary ?? palette.brand;

  return (
    <Screen>
      <ScreenHeader title="Assistance" />
      <ScrollView contentContainerClassName="px-5 pb-10">
        {/* Active-request tracker */}
        {(requests?.length ?? 0) > 0 && (
          <>
            <AppText variant="subtitle">My Requests</AppText>
            <View className="mt-2 gap-2">
              {(requests ?? []).map((req) => (
                <Pressable
                  key={req.request_id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(`/assistance/${req.request_id}` as never)
                  }
                  className="flex-row items-center justify-between rounded-2xl bg-surface p-4 active:opacity-70 dark:bg-surface-dark"
                >
                  <View className="flex-1 pr-3">
                    <AppText variant="subtitle" className="text-sm">
                      {req.request_id}
                    </AppText>
                    <AppText variant="caption" numberOfLines={1}>
                      {req.program.name} · {formatDate(req.created_at)}
                    </AppText>
                  </View>
                  <StatusChip status={req.status} />
                </Pressable>
              ))}
            </View>
            <View className="my-5 h-px bg-tint" />
          </>
        )}

        <AppText variant="subtitle">Programs</AppText>
        {isPending && (
          <AppText variant="caption" className="mt-6 text-center">
            Loading programs…
          </AppText>
        )}
        <View className="mt-2 gap-3">
          {(programs ?? []).map((program) => {
            const Icon = getLucideIcon(program.icon);
            return (
              <Pressable
                key={program.key}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/assistance/apply" as never,
                    params: { programKey: program.key } as never,
                  })
                }
                className="rounded-2xl bg-surface p-5 active:opacity-70 dark:bg-surface-dark"
              >
                <View className="flex-row items-center gap-3">
                  <Icon size={22} color={primary} />
                  <View className="flex-1">
                    <AppText variant="subtitle" className="text-sm">
                      {program.name}
                    </AppText>
                    <AppText variant="caption">{program.office}</AppText>
                  </View>
                </View>
                <AppText variant="caption" className="mt-2 leading-5">
                  {program.description}
                </AppText>
                {/* Requirements preview */}
                <View className="mt-3 flex-row flex-wrap gap-1.5">
                  {program.requirements.slice(0, 3).map((req) => (
                    <View
                      key={req}
                      className="rounded-full bg-tint px-2.5 py-0.5"
                    >
                      <Text className="text-[10px] font-medium text-fg-2">
                        {req}
                      </Text>
                    </View>
                  ))}
                  {program.requirements.length > 3 && (
                    <View className="rounded-full bg-tint px-2.5 py-0.5">
                      <Text className="text-[10px] font-medium text-fg-2">
                        +{program.requirements.length - 3} more
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
