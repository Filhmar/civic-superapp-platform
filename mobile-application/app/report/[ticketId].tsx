import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";

import { StatusChip } from "@/components/reports/status-chip";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { StepTimeline } from "@/components/ui/step-timeline";
import { AppText } from "@/components/ui/typography";
import { useReportQuery } from "@/hooks/queries/use-reports";
import { resolveAssetUrl } from "@/utils/asset-url";
import { formatDateTime } from "@/utils/format-date";

export default function ReportDetail() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const { data: report, isPending, isError } = useReportQuery(ticketId ?? "");

  return (
    <Screen>
      <ScreenHeader title={ticketId ?? "Ticket"} />
      {isError ? (
        <AppText variant="caption" className="mt-10 text-center">
          Could not load this ticket.
        </AppText>
      ) : isPending || !report ? (
        <AppText variant="caption" className="mt-10 text-center">
          Loading…
        </AppText>
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-10">
          {/* Summary card */}
          <View className="rounded-2xl bg-surface p-5 dark:bg-surface-dark">
            <View className="flex-row items-center justify-between">
              <AppText variant="subtitle">{report.category.label}</AppText>
              <StatusChip status={report.status} />
            </View>
            <AppText variant="caption" className="mt-1">
              {report.department}
            </AppText>
            <AppText variant="body" className="mt-3 leading-6">
              {report.description}
            </AppText>
            {report.address ? (
              <AppText variant="caption" className="mt-2">
                📍 {report.address}
              </AppText>
            ) : null}
            <AppText variant="caption" className="mt-1 text-[10px]">
              {report.geo.lat.toFixed(5)}, {report.geo.lng.toFixed(5)} ·{" "}
              {formatDateTime(report.created_at)}
            </AppText>
          </View>

          {/* Photos */}
          {report.photos.length > 0 && (
            <View className="mt-4 flex-row flex-wrap gap-2">
              {report.photos.map((p) => {
                const uri = resolveAssetUrl(p);
                return uri ? (
                  <Image
                    key={p}
                    source={{ uri }}
                    style={{ width: 104, height: 104, borderRadius: 12 }}
                    contentFit="cover"
                  />
                ) : null;
              })}
            </View>
          )}

          {/* Status timeline */}
          <AppText variant="subtitle" className="mb-3 mt-6">
            Status
          </AppText>
          <StepTimeline
            steps={[
              "SUBMITTED",
              "UNDER_REVIEW",
              report.status === "REJECTED" ? "REJECTED" : "RESOLVED",
            ]}
            timeline={report.timeline}
            status={report.status}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
