import { QrCode } from "lucide-react-native";
import { Text, View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { useDigitalIdQuery } from "@/hooks/queries/use-digital-id";
import { formatDate } from "@/utils/format-date";

/** Digital City ID — resident-only (guests are routed to login upstream). */
export default function DigitalIdScreen() {
  const { config } = useTenantConfig();
  const { status } = useAuth();
  const { data: id, isPending, isError } = useDigitalIdQuery({
    enabled: status === "resident",
  });

  return (
    <Screen>
      <ScreenHeader title="Digital City ID" />
      <View className="px-5">
        {status !== "resident" ? (
          <AppText variant="caption" className="mt-8 text-center">
            Sign in as a resident to view your Digital City ID.
          </AppText>
        ) : isError ? (
          <AppText variant="caption" className="mt-8 text-center">
            Could not load your ID. Pull down to retry later.
          </AppText>
        ) : isPending || !id ? (
          <AppText variant="caption" className="mt-8 text-center">
            Loading your ID…
          </AppText>
        ) : (
          <View className="mt-4 overflow-hidden rounded-3xl bg-surface dark:bg-surface-dark">
            {/* Brand band */}
            <View className="bg-brand px-5 py-4">
              <Text className="text-xs font-medium text-white/80">
                {config?.app.name}
              </Text>
              <Text className="mt-0.5 text-lg font-bold text-white">
                {id.resident_id}
              </Text>
            </View>
            <View className="items-center px-5 py-6">
              {/* QR placeholder box carrying the short-lived token */}
              <View className="items-center justify-center rounded-2xl bg-tint p-8">
                <QrCode size={120} color="#0F172A" />
              </View>
              <AppText variant="caption" className="mt-2">
                QR refreshes every {Math.round(id.qr_expires_in / 60)} min
              </AppText>

              <View className="mt-6 w-full gap-3">
                <Row label="Name" value={id.name ?? "Unnamed Resident"} />
                <Row label="Barangay" value={id.unit ?? "—"} />
                <Row
                  label="Status"
                  value={id.verified_resident ? "Verified resident" : "Unverified"}
                />
                <Row label="Valid until" value={formatDate(id.valid_until)} />
              </View>
            </View>
          </View>
        )}
      </View>
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
