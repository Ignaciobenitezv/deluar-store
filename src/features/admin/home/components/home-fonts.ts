import { Playfair_Display } from "next/font/google";

/**
 * Deluar's wordmark is a high-contrast serif, and the storefront sells for the
 * home. The greeting is the one place in the Admin that should sound like the
 * brand rather than like a tool, so it borrows that voice. Loaded here rather
 * than in the root layout: this is the only surface that uses it.
 */
export const displaySerif = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-admin-display",
});
