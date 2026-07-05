import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useLocale } from "@/contexts/locale-context";
import { useFaqQuery } from "@/hooks/queries/use-faq";

/** Help & FAQ accordion, localized via /v1/faq?locale=<current>. */
export default function Faq() {
  const { locale, t } = useLocale();
  const { data: items, isPending } = useFaqQuery(locale);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Screen>
      <ScreenHeader title={t("helpFaq")} />
      <ScrollView contentContainerClassName="px-5 pb-10 gap-2">
        {isPending && (
          <AppText variant="caption" className="mt-8 text-center">
            Loading…
          </AppText>
        )}
        {(items ?? []).map((item) => {
          const open = openId === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => setOpenId(open ? null : item.id)}
              className="rounded-2xl bg-surface p-4 dark:bg-surface-dark"
            >
              <View className="flex-row items-center justify-between gap-2">
                <AppText variant="subtitle" className="flex-1 text-sm">
                  {item.question}
                </AppText>
                {open ? (
                  <ChevronUp size={16} color={palette["fg-2"]} />
                ) : (
                  <ChevronDown size={16} color={palette["fg-2"]} />
                )}
              </View>
              {open && (
                <AppText variant="caption" className="mt-2 leading-5">
                  {item.answer}
                </AppText>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
