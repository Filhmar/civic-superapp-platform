import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";

import { StatusChip } from "@/components/reports/status-chip";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { useReportQuery } from "@/hooks/queries/use-reports";
import type { Report, TimelineEntry } from "@/types/reports";
import { resolveAssetUrl } from "@/utils/asset-url";
import { formatDateTime } from "@/utils/format-date";
import { formatStatus } from "@/utils/report-status";

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
          <Timeline report={report} />
        </ScrollView>
      )}
    </Screen>
  );
}

/**
 * Fixed step ladder Submitted → Under Review → Resolved/Rejected, hydrated
 * with timestamps/notes from timeline[]; the current status is highlighted.
 */
function Timeline({ report }: { report: Report }) {
  const terminal = report.status === "REJECTED" ? "REJECTED" : "RESOLVED";
  const steps: string[] = ["SUBMITTED", "UNDER_REVIEW", terminal];

  const entryFor = (step: string): TimelineEntry | undefined =>
    report.timeline.find((t) => t.to === step);

  const reachedIndex = steps.reduce(
    (acc, step, i) => (entryFor(step) ? i : acc),
    -1,
  );

  return (
    <View className="gap-0">
      {steps.map((step, i) => {
        const entry = entryFor(step);
        const reached = i <= reachedIndex;
        const isCurrent = report.status === step;
        const isLast = i === steps.length - 1;
        const dotColor = reached
          ? step === "REJECTED"
            ? "bg-danger"
            : "bg-brand"
          : "bg-tint";
        return (
          <View key={step} className="flex-row">
            {/* Rail */}
            <View className="mr-3 items-center">
              <View
                className={`h-4 w-4 rounded-full ${dotColor} ${
                  isCurrent ? "border-2 border-accent" : ""
                }`}
              />
              {!isLast && (
                <View
                  className={`w-0.5 flex-1 ${
                    i < reachedIndex ? "bg-brand" : "bg-tint"
                  }`}
                />
              )}
            </View>
            {/* Step body */}
            <View className={`flex-1 ${isLast ? "" : "pb-5"}`}>
              <AppText
                variant="subtitle"
                className={`text-sm ${reached ? "" : "opacity-40"}`}
              >
                {formatStatus(step)}
                {isCurrent ? "  ·  current" : ""}
              </AppText>
              {entry ? (
                <>
                  <AppText variant="caption" className="mt-0.5">
                    {formatDateTime(entry.at)}
                  </AppText>
                  {entry.note ? (
                    <AppText variant="caption" className="mt-1 leading-5">
                      {entry.note}
                    </AppText>
                  ) : null}
                </>
              ) : (
                <AppText variant="caption" className="mt-0.5 opacity-50">
                  Pending
                </AppText>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
