import type { Metadata, Viewport } from "next";
import { StudioApp } from "./studio-app";

export const metadata: Metadata = {
  robots: "noindex",
  referrer: "same-origin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function StudioPage() {
  return <StudioApp />;
}
