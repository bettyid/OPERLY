export const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "GBP", name: "British Pound" },
  { code: "EUR", name: "Euro" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "ZAR", name: "South African Rand" },
  { code: "INR", name: "Indian Rupee" },
] as const;

export const CURRENCY_CODES: string[] = CURRENCIES.map((c) => c.code);

/** Defaults only. The owner can change currency and time zone for any country. */
export const COUNTRIES: { code: string; name: string; currency: string; timezone: string }[] = [
  { code: "US", name: "United States", currency: "USD", timezone: "America/New_York" },
  { code: "GB", name: "United Kingdom", currency: "GBP", timezone: "Europe/London" },
  { code: "NG", name: "Nigeria", currency: "NGN", timezone: "Africa/Lagos" },
  { code: "CA", name: "Canada", currency: "CAD", timezone: "America/Toronto" },
  { code: "AU", name: "Australia", currency: "AUD", timezone: "Australia/Sydney" },
  { code: "GH", name: "Ghana", currency: "GHS", timezone: "Africa/Accra" },
  { code: "KE", name: "Kenya", currency: "KES", timezone: "Africa/Nairobi" },
  { code: "ZA", name: "South Africa", currency: "ZAR", timezone: "Africa/Johannesburg" },
  { code: "IN", name: "India", currency: "INR", timezone: "Asia/Kolkata" },
  { code: "IE", name: "Ireland", currency: "EUR", timezone: "Europe/Dublin" },
  { code: "DE", name: "Germany", currency: "EUR", timezone: "Europe/Berlin" },
  { code: "FR", name: "France", currency: "EUR", timezone: "Europe/Paris" },
  { code: "NL", name: "Netherlands", currency: "EUR", timezone: "Europe/Amsterdam" },
  { code: "AE", name: "United Arab Emirates", currency: "USD", timezone: "Asia/Dubai" },
  { code: "SG", name: "Singapore", currency: "USD", timezone: "Asia/Singapore" },
  { code: "OTHER", name: "Another country", currency: "USD", timezone: "UTC" },
];

export const COMMON_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Amsterdam",
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** English text with the business country's number and date conventions (e.g. en-NG, en-GB, en-DE). */
export function localeFor(country: string | null): string {
  return country && country !== "OTHER" ? `en-${country}` : "en";
}

export function moneyFormatter(country: string | null, currency: string) {
  return new Intl.NumberFormat(localeFor(country), { style: "currency", currency, maximumFractionDigits: 0 });
}
