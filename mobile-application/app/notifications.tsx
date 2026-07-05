import { Bell } from "lucide-react-native";
import { FlatList, Pressable, Text, View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/hooks/mutations/use-notification-mutations";
import { useNotificationsQuery } from "@/hooks/queries/use-notifications";
import { formatDateTime } from "@/utils/format-date";

export default function NotificationsScreen() {
  const { status } = useAuth();
  const isResident = status === "resident";
  const { data: notifications, isPending } = useNotificationsQuery({
    enabled: isResident,
  });
  const markRead = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();

  const hasUnread = (notifications ?? []).some((n) => !n.read);

  return (
    <Screen>
      <ScreenHeader
        title="Notifications"
        right={
          hasUnread ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="px-2 py-1"
            >
              <Text className="text-xs font-semibold text-brand">
                Mark all read
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      {!isResident ? (
        <AppText variant="caption" className="mt-10 text-center">
          Sign in as a resident to receive notifications.
        </AppText>
      ) : (
        <FlatList
          data={notifications ?? []}
          keyExtractor={(n) => n.id}
          contentContainerClassName="px-5 pb-8 gap-2"
          ListEmptyComponent={
            <View className="mt-16 items-center gap-3">
              <Bell size={32} color={palette["fg-2"]} />
              <AppText variant="caption" className="text-center">
                {isPending ? "Loading…" : "You're all caught up."}
              </AppText>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (!item.read) markRead.mutate(item.id);
              }}
              className={`rounded-2xl p-4 ${
                item.read
                  ? "bg-surface opacity-70 dark:bg-surface-dark"
                  : "bg-surface dark:bg-surface-dark"
              }`}
            >
              <View className="flex-row items-center gap-2">
                {!item.read && <View className="h-2 w-2 rounded-full bg-brand" />}
                <AppText
                  variant="subtitle"
                  className={item.read ? "font-normal" : ""}
                  numberOfLines={1}
                >
                  {item.title}
                </AppText>
              </View>
              <AppText variant="caption" className="mt-1 leading-5">
                {item.body}
              </AppText>
              <AppText variant="caption" className="mt-2 text-[10px]">
                {item.category} · {formatDateTime(item.created_at)}
              </AppText>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
