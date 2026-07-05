import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/typography";

/** Placeholder — settings, profile and about ship in a later milestone. */
export default function More() {
  return (
    <Screen className="items-center justify-center gap-2 px-8">
      <AppText variant="title">More</AppText>
      <AppText variant="caption" className="text-center">
        Settings and profile are coming soon.
      </AppText>
    </Screen>
  );
}
