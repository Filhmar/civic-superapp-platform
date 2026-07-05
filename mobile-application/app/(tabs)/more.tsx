import { useRouter } from "expo-router";
import { FileSearch, IdCard, LogIn, LogOut, UserRound } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";

export default function More() {
  const router = useRouter();
  const { config } = useTenantConfig();
  const { status, user, signOut } = useAuth();
  const isResident = status === "resident";
  const primary = config?.brand.colors.primary ?? palette.brand;

  const onSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <Screen>
      <View className="px-5 pt-4">
        <AppText variant="title">More</AppText>

        {/* Session card */}
        <View className="mt-5 flex-row items-center gap-3 rounded-2xl bg-surface p-5 dark:bg-surface-dark">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-tint">
            <UserRound size={22} color={primary} />
          </View>
          <View className="flex-1">
            <AppText variant="subtitle" numberOfLines={1}>
              {isResident ? (user?.name ?? "Resident") : "Guest"}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {isResident
                ? (user?.resident_id ?? user?.phone_number ?? "")
                : "Browsing as guest"}
            </AppText>
          </View>
        </View>

        <View className="mt-4 gap-2">
          {isResident && (
            <>
              <MenuItem
                label="Digital City ID"
                icon={<IdCard size={20} color={primary} />}
                onPress={() => router.push("/digital-id")}
              />
              <MenuItem
                label="My Reports"
                icon={<FileSearch size={20} color={primary} />}
                onPress={() => router.push("/report/mine")}
              />
            </>
          )}
          {status === "anonymous" || status === "guest" ? (
            <MenuItem
              label="Sign in"
              icon={<LogIn size={20} color={primary} />}
              onPress={() => router.push("/(auth)/login")}
            />
          ) : (
            <MenuItem
              label="Sign out"
              icon={<LogOut size={20} color={palette["fg-2"]} />}
              onPress={onSignOut}
            />
          )}
        </View>

        <AppText variant="caption" className="mt-8 text-center">
          Settings, language and feedback are coming soon.
        </AppText>
      </View>
    </Screen>
  );
}

function MenuItem({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl bg-surface px-5 py-4 active:opacity-70 dark:bg-surface-dark"
    >
      {icon}
      <AppText variant="body" className="font-medium">
        {label}
      </AppText>
    </Pressable>
  );
}
