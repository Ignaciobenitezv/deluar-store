import { z } from "zod";

export function emptyToUndefined(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return value;
}

export const booleanSelectSchema = z.enum(["true", "false"]).transform((value) => value === "true");

export const requiredIntegerSchema = z.preprocess(emptyToUndefined, z.coerce.number().int().min(0));

export const optionalIntegerSchema = z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional());
