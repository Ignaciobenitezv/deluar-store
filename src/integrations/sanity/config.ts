import { env } from "@/lib/env";

export const sanityConfig = {
  projectId: env.sanityProjectId,
  dataset: env.sanityDataset,
  apiVersion: env.sanityApiVersion,
  studioUrl: env.sanityStudioUrl,
  readToken: env.sanityReadToken,
  useCdn: true,
} as const;
