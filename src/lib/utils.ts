import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Matches full UK postcodes (e.g. "AB10 1AA", "SW1A 2AA") and outward-code prefixes (e.g. "AB10", "BH2").
// Does NOT match plain city/town names like "Bournemouth" or "Aberdeen".
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[\dA-Z]?(\s*\d[A-Z]{2})?$/i;

export function isPostcode(value: string): boolean {
  return UK_POSTCODE_RE.test(value.trim());
}

/** Returns the correct param key ("postcode" or "city") for a location search value. */
export function locationParam(value: string): { key: "postcode" | "city"; value: string } {
  const trimmed = value.trim();
  return isPostcode(trimmed)
    ? { key: "postcode", value: trimmed.toUpperCase() }
    : { key: "city", value: trimmed };
}
