import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/contexts/auth-context";

/**
 * Auth-group guard: a signed-in RESIDENT can never re-enter onboarding /
 * login / otp — sign-out only via the More tab. Guests pass (login is their
 * upgrade path to resident); anonymous users pass (it IS the auth flow).
 */
export default function AuthLayout() {
  const { status } = useAuth();
  if (status === "resident") return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
