import { Text, View } from "react-native";

import type { ReportStatus } from "@/types/reports";
import { formatStatus, statusChipClasses } from "@/utils/report-status";

export function StatusChip({ status }: { status: ReportStatus }) {
  const c = statusChipClasses(status);
  return (
    <View className={`self-start rounded-full px-3 py-1 ${c.container}`}>
      <Text className={`text-[10px] font-bold ${c.text}`}>
        {formatStatus(status).toUpperCase()}
      </Text>
    </View>
  );
}
