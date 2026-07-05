import { useRouter } from "expo-router";
import { FlatList, Pressable, View } from "react-native";

import { StatusChip } from "@/components/reports/status-chip";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { useAuth } from "@/contexts/auth-context";
import { useMyReportsQuery } from "@/hooks/queries/use-reports";
import { formatDate } from "@/utils/format-date";

export default function MyReports() {
  const router = useRouter();
  const { status } = useAuth();
  const isResident = status === "resident";
  const { data: reports, isPending } = useMyReportsQuery({
    enabled: isResident,
  });

  return (
    <Screen>
      <ScreenHeader title="My Reports" />
      {!isResident ? (
        <AppText variant="caption" className="mt-10 text-center">
          Sign in as a resident to see your reports.
        </AppText>
      ) : (
        <FlatList
          data={reports ?? []}
          keyExtractor={(r) => r.ticket_id}
          contentContainerClassName="px-5 pb-8 gap-2"
          ListEmptyComponent={
            <AppText variant="caption" className="mt-10 text-center">
              {isPending ? "Loading…" : "No reports yet."}
            </AppText>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/report/${item.ticket_id}` as never)}
              className="rounded-2xl bg-surface p-4 active:opacity-70 dark:bg-surface-dark"
            >
              <View className="flex-row items-center justify-between">
                <AppText variant="subtitle" className="text-sm">
                  {item.ticket_id}
                </AppText>
                <StatusChip status={item.status} />
              </View>
              <AppText variant="caption" className="mt-1" numberOfLines={2}>
                {item.category.label} — {item.description}
              </AppText>
              <AppText variant="caption" className="mt-1 text-[10px]">
                {formatDate(item.created_at)} · {item.department}
              </AppText>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
