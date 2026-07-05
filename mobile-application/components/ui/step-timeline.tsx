/**
 * Generic status step ladder (Submitted → … → terminal), hydrated with
 * timestamps/notes from a backend timeline[]; the current status highlighted.
 * Used by reports, e-gov applications and assistance requests.
 */
import { View } from "react-native";

import { AppText } from "@/components/ui/typography";
import type { TimelineEntry } from "@/types/reports";
import { formatDateTime } from "@/utils/format-date";
import { formatStatus } from "@/utils/report-status";

interface StepTimelineProps {
  /** Ordered step statuses, e.g. ["SUBMITTED","UNDER_REVIEW","RESOLVED"]. */
  steps: string[];
  timeline: TimelineEntry[];
  /** Current status (highlighted). */
  status: string;
  /** Steps rendered with the danger color when reached (e.g. REJECTED). */
  dangerSteps?: string[];
}

export function StepTimeline({
  steps,
  timeline,
  status,
  dangerSteps = ["REJECTED"],
}: StepTimelineProps) {
  const entryFor = (step: string): TimelineEntry | undefined =>
    timeline.find((t) => t.to === step);

  const reachedIndex = steps.reduce(
    (acc, step, i) => (entryFor(step) ? i : acc),
    -1,
  );

  return (
    <View>
      {steps.map((step, i) => {
        const entry = entryFor(step);
        const reached = i <= reachedIndex;
        const isCurrent = status === step;
        const isLast = i === steps.length - 1;
        const dotColor = reached
          ? dangerSteps.includes(step)
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
