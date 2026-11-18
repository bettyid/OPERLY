"use client";

import { useActionState, useMemo, useState } from "react";
import { createBusiness, type OnboardingState } from "@/app/onboarding/actions";
import { COMMON_TIMEZONES, COUNTRIES, CURRENCIES } from "@/lib/regions";
import { ErrorNote, Field, PrimaryButton, SelectField, inputClass } from "./ui";

const industries = [
  "Online retail",
  "Fashion and clothing",
  "Beauty and personal care",
  "Digital marketing agency",
  "Freelancer or consultant",
  "Service provider",
  "Wholesale or distribution",
  "Other professional business",
  "Other",
];

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createBusiness, { error: null });
  const [country, setCountry] = useState("US");
  const defaults = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];
  const [currency, setCurrency] = useState(defaults.currency);
  const [timezone, setTimezone] = useState(defaults.timezone);

  const zones = useMemo(
    () => (COMMON_TIMEZONES.includes(timezone) ? COMMON_TIMEZONES : [timezone, ...COMMON_TIMEZONES]),
    [timezone],
  );

  function onCountry(code: string) {
    setCountry(code);
    const d = COUNTRIES.find((c) => c.code === code);
    if (d) {
      setCurrency(d.currency);
      setTimezone(d.timezone);
    }
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Business name" id="name" autoComplete="organization" required maxLength={80} />
      <SelectField label="What kind of business is it?" id="industry" options={industries} />
      <div>
        <label htmlFor="country" className="mb-1.5 block text-sm font-bold">
          Country
        </label>
        <select id="country" name="country" value={country} onChange={(e) => onCountry(e.target.value)} className={inputClass}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="currency" className="mb-1.5 block text-sm font-bold">
          Main currency
        </label>
        <select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="timezone" className="mb-1.5 block text-sm font-bold">
          Time zone
        </label>
        <select id="timezone" name="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted">We fill in your country&apos;s usual currency and time zone. Change them if yours differ.</p>
      </div>
      <ErrorNote message={state.error} />
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Setting up" : "Create workspace"}
      </PrimaryButton>
    </form>
  );
}
