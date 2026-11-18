"use client";

import { useActionState } from "react";
import { createBusiness, type OnboardingState } from "@/app/onboarding/actions";
import { ErrorNote, Field, PrimaryButton, SelectField } from "./ui";

const industries = [
  "Online retail",
  "Fashion and clothing",
  "Beauty and personal care",
  "Digital marketing agency",
  "Freelancer or consultant",
  "Service provider",
  "Other professional business",
  "Other",
];
const currencies = ["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR", "CAD", "AUD", "INR"];

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createBusiness, { error: null });
  return (
    <form action={action} className="space-y-4">
      <Field label="Business name" id="name" autoComplete="organization" required maxLength={80} />
      <SelectField label="What kind of business is it?" id="industry" options={industries} />
      <SelectField label="Currency" id="currency" options={currencies} />
      <ErrorNote message={state.error} />
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Setting up" : "Create workspace"}
      </PrimaryButton>
    </form>
  );
}
