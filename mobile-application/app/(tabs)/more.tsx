import { useRouter } from "expo-router";
import {
  CircleQuestionMark,
  FileSearch,
  FileText,
  Globe,
  IdCard,
  LogIn,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  Pencil,
  Sun,
  UserRound,
} from "lucide-react-native";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import type { Locale } from "@/constants/strings";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { useUpdateProfileMutation } from "@/hooks/mutations/use-profile-mutations";
import { useTheme, type ThemePreference } from "@/hooks/use-theme";

export default function More() {
  const router = useRouter();
  const toast = useToast();
  const { config } = useTenantConfig();
  const { status, user, signOut } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const { preference, setPreference } = useTheme();
  const updateProfile = useUpdateProfileMutation();
  const [editing, setEditing] = useState(false);

  const isResident = status === "resident";
  const primary = config?.brand.colors.primary ?? palette.brand;
  // Locales offered come from the tenant config.
  const locales = (config?.locales ?? ["en"]).filter(
    (l): l is Locale => l === "en" || l === "fil",
  );

  const onSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  const switchLocale = (next: Locale) => {
    setLocale(next); // stored locally always
    if (isResident) {
      // Residents also persist the preference server-side.
      updateProfile.mutate({ language: next });
    }
  };

  const themeOptions: { key: ThemePreference; label: string; Icon: typeof Monitor }[] = [
    { key: "system", label: t("themeSystem"), Icon: Monitor },
    { key: "light", label: t("themeLight"), Icon: Sun },
    { key: "dark", label: t("themeDark"), Icon: Moon },
  ];

  return (
    <Screen>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <AppText variant="title">{t("more")}</AppText>

        {/* Profile card */}
        <View className="mt-5 rounded-2xl bg-surface p-5 dark:bg-surface-dark">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-tint">
              <UserRound size={22} color={primary} />
            </View>
            <View className="flex-1">
              <AppText variant="subtitle" numberOfLines={1}>
                {isResident ? (user?.name ?? t("resident")) : t("guest")}
              </AppText>
              <AppText variant="caption" numberOfLines={1}>
                {isResident
                  ? (user?.resident_id ?? user?.phone_number ?? "")
                  : t("browsingAsGuest")}
              </AppText>
              {isResident && user?.unit && (
                <AppText variant="caption" numberOfLines={1}>
                  {t("barangay")}: {user.unit}
                </AppText>
              )}
            </View>
            {isResident && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("editProfile")}
                onPress={() => setEditing(true)}
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-full bg-tint active:opacity-70"
              >
                <Pencil size={16} color={primary} />
              </Pressable>
            )}
          </View>
        </View>

        <View className="mt-4 gap-2">
          {isResident && (
            <>
              <MenuItem
                label={t("digitalId")}
                icon={<IdCard size={20} color={primary} />}
                onPress={() => router.push("/digital-id")}
              />
              <MenuItem
                label={t("myApplications")}
                icon={<FileText size={20} color={primary} />}
                onPress={() => router.push("/services/applications" as never)}
              />
              <MenuItem
                label={t("myReports")}
                icon={<FileSearch size={20} color={primary} />}
                onPress={() => router.push("/report/mine")}
              />
            </>
          )}

          {/* Language toggle — locales offered per tenant config */}
          {locales.length > 1 && (
            <MenuItem
              label={`${t("language")}: ${locale.toUpperCase()}`}
              icon={<Globe size={20} color={primary} />}
              onPress={() => switchLocale(locale === "en" ? "fil" : "en")}
              right={
                <Text className="text-xs font-semibold text-fg-2 dark:text-fg-2-dark">
                  {locales.map((l) => l.toUpperCase()).join(" / ")}
                </Text>
              }
            />
          )}

          {/* Theme — System / Light / Dark segmented control */}
          <View className="rounded-2xl bg-surface p-3 dark:bg-surface-dark">
            <AppText variant="caption" className="mb-2 px-1">
              {t("theme")}
            </AppText>
            <View className="flex-row gap-2">
              {themeOptions.map(({ key, label, Icon }) => {
                const active = preference === key;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setPreference(key)}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
                      active ? "bg-brand" : "bg-tint dark:bg-bg-dark"
                    }`}
                  >
                    <Icon
                      size={16}
                      color={active ? "#FFFFFF" : palette["fg-2"]}
                      strokeWidth={2}
                    />
                    <Text
                      className={`text-xs font-semibold ${
                        active ? "text-white" : "text-fg-2 dark:text-fg-2-dark"
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <MenuItem
            label={t("helpFaq")}
            icon={<CircleQuestionMark size={20} color={primary} />}
            onPress={() => router.push("/faq" as never)}
          />
          <MenuItem
            label={t("sendFeedback")}
            icon={<MessageSquare size={20} color={primary} />}
            onPress={() => router.push("/feedback" as never)}
          />

          {status === "anonymous" || status === "guest" ? (
            <MenuItem
              label={t("signIn")}
              icon={<LogIn size={20} color={primary} />}
              onPress={() => router.push("/(auth)/login")}
            />
          ) : (
            <MenuItem
              label={t("signOut")}
              icon={<LogOut size={20} color={palette["fg-2"]} />}
              onPress={onSignOut}
            />
          )}
        </View>
      </ScrollView>

      {/* Edit profile modal */}
      {isResident && editing && (
        <EditProfileModal
          visible={editing}
          initialName={user?.name ?? ""}
          initialUnit={user?.unit ?? null}
          units={config?.geo.units ?? []}
          saving={updateProfile.isPending}
          onCancel={() => setEditing(false)}
          onSave={(name, unit) => {
            updateProfile.mutate(
              {
                ...(name.trim() ? { name: name.trim() } : {}),
                ...(unit ? { unit } : {}),
              },
              {
                onSuccess: () => {
                  setEditing(false);
                  toast.show("Profile updated");
                },
                onError: (err) =>
                  toast.show(
                    (err as { message?: string })?.message ??
                      "Could not update profile.",
                  ),
              },
            );
          }}
        />
      )}
    </Screen>
  );
}

function MenuItem({
  label,
  icon,
  onPress,
  right,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl bg-surface px-5 py-4 active:opacity-70 dark:bg-surface-dark"
    >
      {icon}
      <AppText variant="body" className="flex-1 font-medium">
        {label}
      </AppText>
      {right}
    </Pressable>
  );
}

function EditProfileModal({
  visible,
  initialName,
  initialUnit,
  units,
  saving,
  onCancel,
  onSave,
}: {
  visible: boolean;
  initialName: string;
  initialUnit: string | null;
  units: string[];
  saving: boolean;
  onCancel: () => void;
  onSave: (name: string, unit: string | null) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(initialName);
  const [unit, setUnit] = useState<string | null>(initialUnit);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[85%] rounded-t-3xl bg-bg p-5 dark:bg-bg-dark">
          <AppText variant="subtitle">{t("editProfile")}</AppText>

          <AppText variant="caption" className="mt-4">
            {t("name")}
          </AppText>
          <TextInput
            className="mt-1 rounded-2xl bg-surface px-4 py-3 text-base text-fg dark:bg-surface-dark dark:text-fg-dark"
            value={name}
            onChangeText={setName}
            placeholder="Juan D. Cruz"
            placeholderTextColor="#94A3B8"
          />

          <AppText variant="caption" className="mt-4">
            {t("barangay")}
          </AppText>
          {/* Barangay picker — units come from config.geo.units */}
          <ScrollView className="mt-1 max-h-56">
            <View className="flex-row flex-wrap gap-2">
              {units.map((u) => (
                <Pressable
                  key={u}
                  accessibilityRole="button"
                  onPress={() => setUnit(u)}
                  className={`rounded-full px-3.5 py-2 ${
                    unit === u ? "bg-brand" : "bg-surface dark:bg-surface-dark"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      unit === u ? "text-white" : "text-fg-2 dark:text-fg-2-dark"
                    }`}
                  >
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View className="mt-5 flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              className="flex-1 items-center rounded-full bg-surface py-3.5 active:opacity-70 dark:bg-surface-dark"
            >
              <Text className="text-sm font-semibold text-fg-2 dark:text-fg-2-dark">
                {t("cancel")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => onSave(name, unit)}
              className={`flex-1 items-center rounded-full bg-brand py-3.5 active:opacity-80 ${
                saving ? "opacity-50" : ""
              }`}
            >
              <Text className="text-sm font-semibold text-white">
                {saving ? "…" : t("save")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
