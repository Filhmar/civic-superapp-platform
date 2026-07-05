import { useRouter } from "expo-router";
import { FlatList, Pressable, View } from "react-native";

import { StatusChip } from "@/components/reports/status-chip";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { useAuth } from "@/contexts/auth-context";
import { useMyApplicationsQuery } from "@/hooks/queries/use-egov";
import { formatDate } from "@/utils/format-date";

export default function MyApplications() {
  const router = useRouter();
  const { status } = useAuth();
  const isResident = status === "resident";
  const { data: applications, isPending } = useMyApplicationsQuery({
    enabled: isResident,
  });

  return (
    <Screen>
      <ScreenHeader title="My Applications" />
      {!isResident ? (
        <AppText variant="caption" className="mt-10 text-center">
          Sign in as a resident to see your applications.
        </AppText>
      ) : (
        <FlatList
          data={applications ?? []}
          keyExtractor={(a) => a.stub_id}
          contentContainerClassName="px-5 pb-8 gap-2"
          ListEmptyComponent={
            <AppText variant="caption" className="mt-10 text-center">
              {isPending ? "Loading…" : "No applications yet."}
            </AppText>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push(`/services/applications/${item.stub_id}` as never)
              }
              className="rounded-2xl bg-surface p-4 active:opacity-70 dark:bg-surface-dark"
            >
              <View className="flex-row items-center justify-between">
                <AppText variant="subtitle" className="text-sm">
                  {item.stub_id}
                </AppText>
                <StatusChip status={item.status} />
              </View>
              <AppText variant="caption" className="mt-1">
                {item.service.name} · ₱{item.fees.total}
              </AppText>
              <AppText variant="caption" className="mt-1 text-[10px]">
                {formatDate(item.created_at)}
                {item.window_no ? ` · Window ${item.window_no}` : ""}
              </AppText>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
