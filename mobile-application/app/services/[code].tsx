import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleCheck } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { StatusChip } from "@/components/reports/status-chip";
import { QrPlaceholder } from "@/components/ui/qr-placeholder";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useToast } from "@/components/ui/toast";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { cardShadow } from "@/constants/shadows";
import { useAuth } from "@/contexts/auth-context";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import {
  useCreateApplicationMutation,
  usePayApplicationMutation,
} from "@/hooks/mutations/use-egov-mutations";
import { useServiceCatalogQuery } from "@/hooks/queries/use-egov";
import type { Application, PaymentMethod, PaymentResult } from "@/types/egov";
import { formatPeso } from "@/utils/currency";
import { formatDate } from "@/utils/format-date";

type Step = "requirements" | "form" | "review" | "pay" | "success";

/**
 * Service flow: requirements → generic form (full_name, purpose) → review
 * (fee + convenience fee + total) → payment method from
 * config.integrations.payments → QR claim stub.
 */
export default function ServiceFlow() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const toast = useToast();
  const { config } = useTenantConfig();
  const { status } = useAuth();
  const { data: groups } = useServiceCatalogQuery();
  const createApplication = useCreateApplicationMutation();
  const payApplication = usePayApplicationMutation();

  const service = useMemo(
    () =>
      (groups ?? [])
        .flatMap((g) => g.services)
        .find((s) => s.code === code),
    [groups, code],
  );

  const [step, setStep] = useState<Step>("requirements");
  const [fullName, setFullName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [application, setApplication] = useState<Application | null>(null);
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  // Client-generated idempotency key, stable for this application attempt.
  const [idempotencyKey] = useState(() => Crypto.randomUUID());

  const paymentMethods = (config?.integrations.payments ?? []).filter(
    (m): m is PaymentMethod => m === "gcash" || m === "card",
  );

  if (!service) {
    return (
      <Screen>
        <ScreenHeader title="e-Service" />
        <AppText variant="caption" className="mt-10 text-center">
          {groups ? "Unknown service." : "Loading…"}
        </AppText>
      </Screen>
    );
  }

  const formValid = fullName.trim().length >= 2 && purpose.trim().length >= 2;

  const submitApplication = () => {
    if (status !== "resident") {
      toast.show("Sign in as a resident to apply.");
      router.push("/(auth)/login");
      return;
    }
    createApplication.mutate(
      {
        service_code: service.code,
        form_data: { full_name: fullName.trim(), purpose: purpose.trim() },
      },
      {
        onSuccess: (app) => {
          setApplication(app);
          setStep("pay");
        },
        onError: (err) =>
          toast.show(
            (err as { message?: string })?.message ?? "Could not apply.",
          ),
      },
    );
  };

  const pay = (method: PaymentMethod) => {
    if (!application || payApplication.isPending) return;
    payApplication.mutate(
      { applicationId: application.application_id, method, idempotencyKey },
      {
        onSuccess: (result) => {
          setPayment(result);
          setApplication(result.application);
          setStep("success");
        },
        onError: (err) =>
          toast.show(
            (err as { message?: string })?.message ?? "Payment failed.",
          ),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title={service.name} />
      <ScrollView contentContainerClassName="px-5 pb-10">
        {step === "requirements" && (
          <>
            <AppText variant="caption">{service.description}</AppText>
            <View className="mt-4 rounded-2xl bg-surface p-5 dark:bg-surface-dark">
              <AppText variant="subtitle" className="text-sm">
                Requirements
              </AppText>
              <View className="mt-2 gap-1.5">
                {service.requirements.map((req) => (
                  <AppText key={req} variant="caption">
                    • {req}
                  </AppText>
                ))}
              </View>
              <View className="mt-4 flex-row gap-4">
                <AppText variant="caption">Fee: {formatPeso(service.fee)}</AppText>
                <AppText variant="caption">
                  Processing: {service.processing_days} day(s)
                </AppText>
              </View>
            </View>
            <PrimaryButton label="Start Application" onPress={() => setStep("form")} />
          </>
        )}

        {step === "form" && (
          <>
            <AppText variant="subtitle" className="text-sm">
              Full name
            </AppText>
            <TextInput
              className="mt-2 rounded-2xl bg-surface px-4 py-3.5 text-base text-fg dark:bg-surface-dark dark:text-fg-dark"
              placeholder="Juan D. Cruz"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
            />
            <AppText variant="subtitle" className="mt-4 text-sm">
              Purpose
            </AppText>
            <TextInput
              className="mt-2 rounded-2xl bg-surface px-4 py-3.5 text-base text-fg dark:bg-surface-dark dark:text-fg-dark"
              placeholder="Employment, school, business…"
              placeholderTextColor="#94A3B8"
              value={purpose}
              onChangeText={setPurpose}
            />
            <PrimaryButton
              label="Review"
              disabled={!formValid}
              onPress={() => setStep("review")}
            />
          </>
        )}

        {step === "review" && (
          <>
            <View className="rounded-2xl bg-surface p-5 dark:bg-surface-dark">
              <AppText variant="subtitle" className="text-sm">
                Review
              </AppText>
              <ReviewRow label="Service" value={service.name} />
              <ReviewRow label="Full name" value={fullName} />
              <ReviewRow label="Purpose" value={purpose} />
              <View className="my-3 h-px bg-tint" />
              <ReviewRow label="Service fee" value={formatPeso(service.fee)} />
              <ReviewRow label="Convenience fee" value={formatPeso(20)} />
              <View className="my-3 h-px bg-tint" />
              <ReviewRow label="Total" value={formatPeso(service.fee + 20)} bold />
            </View>
            <PrimaryButton
              label={
                createApplication.isPending
                  ? "Submitting…"
                  : status === "resident"
                    ? "Confirm & Continue to Payment"
                    : "Sign in to apply"
              }
              disabled={createApplication.isPending}
              onPress={submitApplication}
            />
          </>
        )}

        {step === "pay" && application && (
          <>
            <View className="rounded-2xl bg-surface p-5 dark:bg-surface-dark">
              <AppText variant="caption">Application</AppText>
              <AppText variant="subtitle">{application.stub_id}</AppText>
              <View className="my-3 h-px bg-tint" />
              <ReviewRow label="Service fee" value={formatPeso(application.fees.fee)} />
              <ReviewRow
                label="Convenience fee"
                value={formatPeso(application.fees.convenience_fee)}
              />
              <ReviewRow label="Total due" value={formatPeso(application.fees.total)} bold />
            </View>
            <AppText variant="subtitle" className="mt-6 text-sm">
              Pay with
            </AppText>
            <View className="mt-3 flex-row gap-3">
              {paymentMethods.map((method) => (
                <Pressable
                  key={method}
                  accessibilityRole="button"
                  disabled={payApplication.isPending}
                  onPress={() => pay(method)}
                  className="flex-1 items-center rounded-2xl bg-brand py-4 active:opacity-80"
                >
                  {payApplication.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-base font-semibold uppercase text-white">
                      {method}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
            <AppText variant="caption" className="mt-3 text-center">
              Payments are processed securely. You&apos;ll receive an official
              receipt number.
            </AppText>
          </>
        )}

        {step === "success" && application && (
          <View className="items-center pt-6">
            {/* Mist circle + check (spec §4 payment success) */}
            <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-tint">
              <CircleCheck
                size={34}
                color={config?.brand.colors.primary ?? palette.brand}
                strokeWidth={2.2}
              />
            </View>
            <AppText variant="display" className="mt-4 text-center text-[22px]">
              Payment Successful!
            </AppText>
            {payment && (
              <AppText variant="caption" className="mt-1.5">
                OR {payment.payment.receipt_no} ·{" "}
                {formatPeso(payment.payment.amount)}
              </AppText>
            )}

            {/* QR claim stub — r20 card, kicker, checkerboard QR */}
            <View
              style={cardShadow}
              className="mt-6 w-full items-center rounded-stub border border-line bg-surface p-[22px] dark:border-line-dark dark:bg-surface-dark"
            >
              <AppText variant="kicker">Claim Stub</AppText>
              <View className="mt-4">
                <QrPlaceholder payload={application.qr_payload} size={170} />
              </View>
              <AppText variant="caption" className="mt-4">
                Reference No.
              </AppText>
              <Text
                className="mt-0.5 text-[20px] font-extrabold tracking-tight-2"
                style={{ color: config?.brand.colors.primary ?? palette.brand }}
              >
                {application.stub_id}
              </Text>
              <View className="mt-2">
                <StatusChip status={application.status} />
              </View>
              <View className="my-4 h-px w-full border-t border-dashed border-line dark:border-line-dark" />
              <AppText variant="caption" className="text-center">
                Window {application.window_no ?? "TBA"} · Ready by{" "}
                {application.ready_eta ? formatDate(application.ready_eta) : "TBA"}
              </AppText>
            </View>
            <PrimaryButton
              label="View my applications"
              onPress={() => router.replace("/services/applications" as never)}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function ReviewRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View className="mt-2 flex-row items-center justify-between">
      <AppText variant="caption">{label}</AppText>
      <AppText
        variant="body"
        className={bold ? "font-bold" : "font-medium"}
      >
        {value}
      </AppText>
    </View>
  );
}

import { PrimaryButton as PrimaryCta } from "@/components/ui/primary-button";

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PrimaryCta
      label={label}
      onPress={onPress}
      disabled={disabled}
      className="mt-6 w-full"
    />
  );
}
