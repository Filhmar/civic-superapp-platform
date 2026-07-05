import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { AssetImage } from "@/components/ui/asset-image";
import { GradientBox } from "@/components/ui/gradient-box";
import { GhostButton } from "@/components/ui/primary-button";
import { QrPlaceholder } from "@/components/ui/qr-placeholder";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { cardShadow } from "@/constants/shadows";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { useDigitalIdQuery } from "@/hooks/queries/use-digital-id";
import { isRenderableAssetUrl } from "@/lib/asset-url";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ID";
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? ""))
    .toUpperCase()
    .slice(0, 2);
}

function formatValidUntil(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Digital City ID per DESIGN_SPEC §4 — banner r22 + meta card + Log Out. */
export default function DigitalIdScreen() {
  const router = useRouter();
  const { config } = useTenantConfig();
  const { status, user, signOut } = useAuth();
  const { data: id, isPending, isError } = useDigitalIdQuery({
    enabled: status === "resident",
  });

  const primary = config?.brand.colors.primary ?? palette.brand;
  const primaryDark = config?.brand.colors.primaryDark ?? palette["brand-dark"];
  const accentDeep = config?.brand.colors.accentDeep ?? palette["accent-deep"];
  const assets = config?.brand.logo.assets;
  const watermarkUri = [assets?.watermark, assets?.seal].find(
    isRenderableAssetUrl,
  );

  const onSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <Screen padTop>
      <ScreenHeader title="Digital City ID" />
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        {status !== "resident" ? (
          <AppText variant="caption" className="mt-8 text-center">
            Sign in as a resident to view your Digital City ID.
          </AppText>
        ) : isError ? (
          <AppText variant="caption" className="mt-8 text-center">
            Could not load your ID. Try again later.
          </AppText>
        ) : isPending || !id ? (
          <AppText variant="caption" className="mt-8 text-center">
            Loading your ID…
          </AppText>
        ) : (
          <>
            {/* ID banner — gradient w/ accent bleed + watermark */}
            <GradientBox
              stops={[
                { color: primaryDark, offset: 0 },
                { color: primary, offset: 0.62 },
                { color: accentDeep, offset: 1 },
              ]}
              style={[cardShadow, { borderRadius: 22, padding: 20 }]}
            >
              {watermarkUri && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    right: -24,
                    top: -20,
                    opacity: 0.16,
                  }}
                >
                  <AssetImage
                    uri={watermarkUri}
                    style={{ width: 170, height: 170 }}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* Header row */}
              <View className="flex-row items-center gap-2.5">
                <View className="h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/90">
                  <AssetImage
                    uri={assets?.seal}
                    style={{ width: 22, height: 22 }}
                    resizeMode="contain"
                    fallback={
                      <Text
                        className="text-[10px] font-extrabold"
                        style={{ color: primaryDark }}
                      >
                        {initialsOf(config?.app.name ?? "ID")}
                      </Text>
                    }
                  />
                </View>
                <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-white">
                  {config?.app.name} · e-ID
                </Text>
              </View>

              {/* Identity */}
              <View className="mt-4 flex-row items-center gap-4">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white/90">
                  <Text
                    className="text-xl font-extrabold"
                    style={{ color: primaryDark }}
                  >
                    {initialsOf(id.name ?? "Resident")}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    className="text-[20px] font-extrabold tracking-tight-3 text-white"
                    numberOfLines={1}
                  >
                    {id.name ?? "Unnamed Resident"}
                  </Text>
                  <Text className="mt-0.5 font-sans text-[12.5px] text-white/80">
                    ID No. {id.resident_id}
                  </Text>
                  {id.unit ? (
                    <Text className="font-sans text-[12.5px] text-white/80">
                      {id.unit}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Inner white QR panel */}
              <View className="mt-4 flex-row items-center gap-4 rounded-card bg-white p-4">
                <QrPlaceholder payload={id.qr_token} size={110} />
                <View className="flex-1">
                  <AppText variant="kicker">Scan to Verify</AppText>
                  <Text className="mt-1 text-[15px] font-bold text-fg">
                    {id.verified_resident ? "Verified Resident ✓" : "Unverified"}
                  </Text>
                  <AppText variant="caption" className="mt-0.5">
                    Valid until {formatValidUntil(id.valid_until)}
                  </AppText>
                  <AppText variant="caption" className="mt-1 text-[10px]">
                    QR refreshes every {Math.round(id.qr_expires_in / 60)} min
                  </AppText>
                </View>
              </View>
            </GradientBox>

            {/* Grouped meta card */}
            <View className="mt-5 rounded-card border border-line bg-surface dark:border-line-dark dark:bg-surface-dark">
              <MetaRow label="Mobile" value={user?.phone_number ?? "—"} />
              <MetaRow label="Barangay" value={id.unit ?? "—"} divider />
              <MetaRow
                label="Status"
                value={id.verified_resident ? "Verified ✓" : "Unverified"}
                divider
              />
            </View>

            {/* Log out — danger ghost */}
            <GhostButton
              label="Log Out"
              danger
              onPress={() => void onSignOut()}
              className="mt-5"
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function MetaRow({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3.5 ${
        divider ? "border-t border-line dark:border-line-dark" : ""
      }`}
    >
      <AppText variant="caption" className="text-sm">
        {label}
      </AppText>
      <Text className="text-sm font-bold text-fg dark:text-fg-dark">
        {value}
      </Text>
    </View>
  );
}
