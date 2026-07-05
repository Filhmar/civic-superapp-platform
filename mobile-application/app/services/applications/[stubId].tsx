import { useLocalSearchParams } from "expo-router";
import { QrCode } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";

import { StatusChip } from "@/components/reports/status-chip";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { StepTimeline } from "@/components/ui/step-timeline";
import { AppText } from "@/components/ui/typography";
import { useApplicationQuery } from "@/hooks/queries/use-egov";
import { formatDate } from "@/utils/format-date";

const STEPS = ["PENDING_PAYMENT", "PROCESSING", "READY", "CLAIMED"];

export default function ApplicationDetail() {
  const { stubId } = useLocalSearchParams<{ stubId: string }>();
  const { data: app, isPending, isError } = useApplicationQuery(stubId ?? "");

  return (
    <Screen>
      <ScreenHeader title={stubId ?? "Application"} />
      {isError ? (
        <AppText variant="caption" className="mt-10 text-center">
          Could not load this application.
        </AppText>
      ) : isPending || !app ? (
        <AppText variant="caption" className="mt-10 text-center">
          Loading…
        </AppText>
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-10">
          <View className="items-center rounded-3xl bg-surface p-6 dark:bg-surface-dark">
            <View className="items-center justify-center rounded-2xl bg-tint p-6">
              <QrCode size={90} color="#0F172A" />
            </View>
            <Text className="mt-3 text-lg font-bold tracking-widest text-fg dark:text-fg-dark">
              {app.stub_id}
            </Text>
            <View className="mt-2">
              <StatusChip status={app.status} />
            </View>
            <View className="mt-4 w-full gap-2">
              <Row label="Service" value={app.service.name} />
              <Row label="Group" value={app.service.group} />
              <Row label="Total paid/due" value={`₱${app.fees.total}`} />
              <Row label="Claim window" value={app.window_no ?? "TBA"} />
              <Row
                label="Ready by"
                value={app.ready_eta ? formatDate(app.ready_eta) : "TBA"}
              />
            </View>
          </View>

          <AppText variant="subtitle" className="mb-3 mt-6">
            Progress
          </AppText>
          <StepTimeline
            steps={STEPS}
            timeline={app.timeline}
            status={app.status}
          />
        </ScrollView>
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <AppText variant="caption">{label}</AppText>
      <AppText variant="body" className="font-medium">
        {value}
      </AppText>
    </View>
  );
}
