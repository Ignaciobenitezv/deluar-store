import { Archivo } from "next/font/google";

// Display face for the Home's editorial headlines. The hero and the "Lo nuevo"
// strip still declare their own instance; they can move here when next touched.
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});
