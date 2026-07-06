import { createClient, type QueryParams } from "@sanity/client";
import { sanityConfig } from "@/integrations/sanity/config";

function hasSanityConfig() {
  return Boolean(sanityConfig.projectId && sanityConfig.dataset);
}

function createConfiguredClient(options: {
  useCdn: boolean;
  token?: string;
}) {
  if (!hasSanityConfig()) {
    return null;
  }

  return createClient({
    projectId: sanityConfig.projectId,
    dataset: sanityConfig.dataset,
    apiVersion: sanityConfig.apiVersion,
    useCdn: options.useCdn,
    token: options.token,
    perspective: "published",
  });
}

export const sanityClient = createConfiguredClient({
  useCdn: sanityConfig.useCdn,
});

export const sanityReadClient = sanityConfig.readToken
  ? createConfiguredClient({
      useCdn: false,
      token: sanityConfig.readToken,
    })
  : sanityClient;

export const sanityWriteClient = sanityConfig.writeToken
  ? createConfiguredClient({
      useCdn: false,
      token: sanityConfig.writeToken,
    })
  : null;

export async function sanityFetch<T>(
  query: string,
  params: QueryParams = {},
  options: { useToken?: boolean } = {},
) {
  const client = options.useToken ? sanityReadClient : sanityClient;

  if (!client) {
    throw new Error("Sanity is not configured.");
  }

  return client.fetch<T>(query, params);
}
