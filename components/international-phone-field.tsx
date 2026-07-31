"use client";

import { countryCallingCode } from "@/lib/phone";

type CountryOption = { code: string; name: string };

type InternationalPhoneFieldProps = {
  countries: CountryOption[];
  countryCode: string;
  nationalNumber: string;
  onCountryChange: (countryCode: string) => void;
  onNumberChange: (nationalNumber: string) => void;
  countryLabel?: string;
  phoneLabel?: string;
  required?: boolean;
  className?: string;
};

export function InternationalPhoneField({
  countries,
  countryCode,
  nationalNumber,
  onCountryChange,
  onNumberChange,
  countryLabel = "Ülke",
  phoneLabel = "Telefon",
  required = true,
  className = "",
}: InternationalPhoneFieldProps) {
  const phoneCountries = countries.flatMap((country) => {
    try {
      return [{ ...country, callingCode: countryCallingCode(country.code) }];
    } catch {
      return [];
    }
  });
  const selectedCallingCode =
    phoneCountries.find((country) => country.code === countryCode)
      ?.callingCode || "+";

  return (
    <div
      className={`grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] ${className}`}
    >
      <label className="text-sm text-on-surface-variant">
        <span className="mb-2 block">
          {countryLabel}
          {required ? " *" : ""}
        </span>
        <select
          className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface outline-none focus:border-primary"
          onChange={(event) => onCountryChange(event.target.value)}
          required={required}
          value={countryCode}
        >
          {phoneCountries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name} ({country.callingCode})
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-on-surface-variant">
        <span className="mb-2 block">
          {phoneLabel}
          {required ? " *" : ""}
        </span>
        <span className="flex overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest focus-within:border-primary">
          <span className="flex min-w-16 items-center justify-center border-r border-outline-variant px-3 text-sm font-semibold text-on-surface">
            {selectedCallingCode}
          </span>
          <input
            autoComplete="tel-national"
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-on-surface outline-none"
            inputMode="tel"
            onChange={(event) =>
              onNumberChange(event.target.value.replace(/[^0-9 ()-]/g, ""))
            }
            placeholder="Ulusal numara"
            required={required}
            type="tel"
            value={nationalNumber}
          />
        </span>
      </label>
    </div>
  );
}
