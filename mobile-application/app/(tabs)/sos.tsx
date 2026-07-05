import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/typography";

/** Placeholder — the SOS module ships in a later milestone. */
export default function Sos() {
  return (
    <Screen className="items-center justify-center gap-2 px-8">
      <AppText variant="title">SOS</AppText>
      <AppText variant="caption" className="text-center">
        One-tap emergency assistance is coming soon.
      </AppText>
    </Screen>
  );
}
