import { createClient, type QueryParams } from "@sanity/client";
import { sanityConfig } from "@/integrations/sanity/config";

export const sanityClient = createClient({
  projectId: sanityConfig.projectId,
  dataset: sanityConfig.dataset,
  apiVersion: sanityConfig.apiVersion,
  useCdn: sanityConfig.useCdn,
  perspective: "published",
});

export const sanityReadClient = sanityConfig.readToken
  ? createClient({
      projectId: sanityConfig.projectId,
      dataset: sanityConfig.dataset,
      apiVersion: sanityConfig.apiVersion,
      useCdn: false,
      token: sanityConfig.readToken,
      perspective: "published",
    })
  : sanityClient;

export async function sanityFetch<T>(
  query: string,
  params: QueryParams = {},
  options: { useToken?: boolean } = {},
) {
  const client = options.useToken ? sanityReadClient : sanityClient;

  return client.fetch<T>(query, params);
}
