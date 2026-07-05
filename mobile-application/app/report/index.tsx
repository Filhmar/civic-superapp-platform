import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Camera, CircleCheck, Crosshair, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useToast } from "@/components/ui/toast";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import {
  useCreateReportMutation,
  useUploadMediaMutation,
} from "@/hooks/mutations/use-report-mutations";
import {
  useMyReportsQuery,
  useReportCategoriesQuery,
} from "@/hooks/queries/use-reports";
import type { Report, ReportCategory } from "@/types/reports";
import { getReportCategoryIcon } from "@/utils/report-icons";

import { StatusChip } from "@/components/reports/status-chip";
import { formatDate } from "@/utils/format-date";

type Step =
  | { kind: "pick" }
  | { kind: "form"; category: ReportCategory }
  | { kind: "done"; report: Report };

export default function ReportIndex() {
  const [step, setStep] = useState<Step>({ kind: "pick" });

  return (
    <Screen>
      <ScreenHeader title="Report an Issue" />
      {step.kind === "pick" && (
        <CategoryPicker
          onPick={(category) => setStep({ kind: "form", category })}
        />
      )}
      {step.kind === "form" && (
        <ReportForm
          category={step.category}
          onBack={() => setStep({ kind: "pick" })}
          onDone={(report) => setStep({ kind: "done", report })}
        />
      )}
      {step.kind === "done" && (
        <SuccessView
          report={step.report}
          onNew={() => setStep({ kind: "pick" })}
        />
      )}
    </Screen>
  );
}

function CategoryPicker({ onPick }: { onPick: (c: ReportCategory) => void }) {
  const router = useRouter();
  const { config } = useTenantConfig();
  const { status } = useAuth();
  const { data: categories, isPending } = useReportCategoriesQuery();
  const { data: mine } = useMyReportsQuery({ enabled: status === "resident" });
  const primary = config?.brand.colors.primary ?? palette.brand;

  return (
    <ScrollView contentContainerClassName="px-5 pb-8">
      <AppText variant="caption">
        What would you like to report? Your ticket is routed straight to the
        responsible department.
      </AppText>
      {isPending && <ActivityIndicator className="mt-8" />}
      <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
        {(categories ?? []).map((cat) => {
          const Icon = getReportCategoryIcon(cat.icon);
          return (
            <Pressable
              key={cat.key}
              accessibilityRole="button"
              onPress={() => onPick(cat)}
              className="w-[48%] rounded-2xl bg-surface p-4 active:opacity-70 dark:bg-surface-dark"
            >
              <Icon size={24} color={primary} />
              <AppText variant="subtitle" className="mt-2 text-sm">
                {cat.label}
              </AppText>
              <AppText variant="caption" className="mt-0.5 text-[10px]">
                {cat.department}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* My recent reports (residents) */}
      {status === "resident" && (mine?.length ?? 0) > 0 && (
        <>
          <View className="mt-8 flex-row items-center justify-between">
            <AppText variant="subtitle">My Reports</AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/report/mine")}
            >
              <Text className="text-xs font-semibold text-brand">See all</Text>
            </Pressable>
          </View>
          <View className="mt-3 gap-2">
            {(mine ?? []).slice(0, 3).map((r) => (
              <Pressable
                key={r.ticket_id}
                accessibilityRole="button"
                onPress={() => router.push(`/report/${r.ticket_id}` as never)}
                className="flex-row items-center justify-between rounded-2xl bg-surface p-4 active:opacity-70 dark:bg-surface-dark"
              >
                <View className="flex-1 pr-3">
                  <AppText variant="subtitle" className="text-sm">
                    {r.ticket_id}
                  </AppText>
                  <AppText variant="caption" numberOfLines={1}>
                    {r.category.label} · {formatDate(r.created_at)}
                  </AppText>
                </View>
                <StatusChip status={r.status} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function ReportForm({
  category,
  onBack,
  onDone,
}: {
  category: ReportCategory;
  onBack: () => void;
  onDone: (report: Report) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { config } = useTenantConfig();
  const { status } = useAuth();
  const createReport = useCreateReportMutation();
  const uploadMedia = useUploadMediaMutation();

  const centroid = config?.geo.centroid;
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(centroid ? String(centroid[0]) : "");
  const [lng, setLng] = useState(centroid ? String(centroid[1]) : "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLocalUri, setPhotoLocalUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  const latNum = Number.parseFloat(lat);
  const lngNum = Number.parseFloat(lng);
  const geoValid = Number.isFinite(latNum) && Number.isFinite(lngNum);
  const canSubmit =
    description.trim().length >= 5 &&
    geoValid &&
    uploadProgress === null &&
    !createReport.isPending;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.7,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setPhotoLocalUri(asset.uri);
    setUploadProgress(0);
    try {
      const url = await uploadMedia.mutateAsync({
        uri: asset.uri,
        contentType: asset.mimeType ?? "image/jpeg",
        kind: "report",
        onProgress: setUploadProgress,
      });
      setPhotoUrl(url);
    } catch {
      setPhotoLocalUri(null);
      toast.show("Photo upload failed. Try again.");
    } finally {
      setUploadProgress(null);
    }
  };

  const removePhoto = () => {
    setPhotoUrl(null);
    setPhotoLocalUri(null);
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status: perm } =
        await Location.requestForegroundPermissionsAsync();
      if (perm !== "granted") {
        toast.show("Location permission denied — adjust manually.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    } catch {
      toast.show("Could not get your location — adjust manually.");
    } finally {
      setLocating(false);
    }
  };

  const submit = () => {
    if (status !== "resident") {
      toast.show("Sign in as a resident to submit a report.");
      router.push("/(auth)/login");
      return;
    }
    if (!canSubmit) return;
    createReport.mutate(
      {
        category_key: category.key,
        description: description.trim(),
        ...(photoUrl ? { photos: [photoUrl] } : {}),
        geo: { lat: latNum, lng: lngNum },
        ...(address.trim() ? { address: address.trim() } : {}),
      },
      {
        onSuccess: onDone,
        onError: (err) => {
          toast.show(
            (err as { message?: string })?.message ??
              "Could not submit the report.",
          );
        },
      },
    );
  };

  const inputClass =
    "rounded-2xl bg-surface px-4 py-3.5 text-base text-fg dark:bg-surface-dark dark:text-fg-dark";

  return (
    <ScrollView contentContainerClassName="px-5 pb-10" keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" onPress={onBack}>
        <Text className="text-xs font-semibold text-brand">
          ‹ Change category
        </Text>
      </Pressable>
      <AppText variant="title" className="mt-2 text-xl">
        {category.label}
      </AppText>
      <AppText variant="caption" className="mt-0.5">
        Routed to {category.department}
      </AppText>

      {/* Description */}
      <AppText variant="subtitle" className="mt-6 text-sm">
        What happened?
      </AppText>
      <TextInput
        className={`mt-2 min-h-[100px] ${inputClass}`}
        multiline
        textAlignVertical="top"
        placeholder="Describe the issue (location details, since when, severity)…"
        placeholderTextColor="#94A3B8"
        value={description}
        onChangeText={setDescription}
        testID="report-description"
      />

      {/* Photo */}
      <AppText variant="subtitle" className="mt-5 text-sm">
        Photo (optional)
      </AppText>
      {photoLocalUri ? (
        <View className="mt-2">
          <Image
            source={{ uri: photoLocalUri }}
            style={{ width: "100%", height: 160, borderRadius: 16 }}
            contentFit="cover"
          />
          {uploadProgress !== null ? (
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-tint">
              <View
                className="h-2 rounded-full bg-brand"
                style={{ width: `${Math.round(uploadProgress * 100)}%` }}
              />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={removePhoto}
              className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-fg/70"
            >
              <X size={16} color="white" />
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={pickPhoto}
          className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-fg-2/40 py-6 active:opacity-70"
        >
          <Camera size={20} color={palette["fg-2"]} />
          <Text className="text-sm text-fg-2 dark:text-fg-2-dark">
            Add a photo
          </Text>
        </Pressable>
      )}

      {/* Location */}
      <AppText variant="subtitle" className="mt-5 text-sm">
        Location
      </AppText>
      <Pressable
        accessibilityRole="button"
        onPress={useMyLocation}
        disabled={locating}
        className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl bg-tint py-3 active:opacity-70"
      >
        {locating ? (
          <ActivityIndicator size="small" />
        ) : (
          <Crosshair size={16} color={palette["fg-2"]} />
        )}
        <Text className="text-sm font-medium text-fg-2">Use my location</Text>
      </Pressable>
      <View className="mt-2 flex-row gap-2">
        <TextInput
          className={`flex-1 ${inputClass}`}
          keyboardType="numbers-and-punctuation"
          placeholder="Latitude"
          placeholderTextColor="#94A3B8"
          value={lat}
          onChangeText={setLat}
        />
        <TextInput
          className={`flex-1 ${inputClass}`}
          keyboardType="numbers-and-punctuation"
          placeholder="Longitude"
          placeholderTextColor="#94A3B8"
          value={lng}
          onChangeText={setLng}
        />
      </View>
      <TextInput
        className={`mt-2 ${inputClass}`}
        placeholder="Street / landmark (optional)"
        placeholderTextColor="#94A3B8"
        value={address}
        onChangeText={setAddress}
      />

      {/* Submit */}
      <Pressable
        accessibilityRole="button"
        onPress={submit}
        disabled={status === "resident" && !canSubmit}
        className={`mt-6 items-center rounded-full bg-brand py-4 active:opacity-80 ${
          status === "resident" && !canSubmit ? "opacity-50" : ""
        }`}
      >
        {createReport.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-base font-semibold text-white">
            {status === "resident" ? "Submit Report" : "Sign in to submit"}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function SuccessView({
  report,
  onNew,
}: {
  report: Report;
  onNew: () => void;
}) {
  const router = useRouter();
  const { config } = useTenantConfig();
  const primary = config?.brand.colors.primary ?? palette.brand;

  return (
    <View className="flex-1 items-center justify-center px-8">
      <CircleCheck size={56} color={primary} />
      <AppText variant="title" className="mt-4 text-center text-xl">
        Report submitted
      </AppText>
      <AppText variant="caption" className="mt-1 text-center">
        Keep this ticket number to track progress:
      </AppText>
      <View className="mt-4 rounded-2xl bg-surface px-8 py-4 dark:bg-surface-dark">
        <Text className="text-2xl font-bold tracking-widest text-fg dark:text-fg-dark">
          {report.ticket_id}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/report/${report.ticket_id}` as never)}
        className="mt-6 items-center rounded-full bg-brand px-8 py-3.5 active:opacity-80"
      >
        <Text className="font-semibold text-white">Track my report</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onNew} className="mt-3 py-2">
        <Text className="text-sm font-medium text-fg-2 dark:text-fg-2-dark">
          Report another issue
        </Text>
      </Pressable>
    </View>
  );
}
