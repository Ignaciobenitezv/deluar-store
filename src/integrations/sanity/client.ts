import { createClient, type QueryParams } from "@sanity/client";
import { sanityConfig } from "@/integrations/sanity/config";

function hasSanityConfig() {
  return Boolean(sanityConfig.projectId && sanityConfig.dataset);
}

function createConfiguredClient(options: {
  useCdn: boolean;
  token?: string;
  perspective?: "published" | "raw" | "drafts";
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
    perspective: options.perspective ?? "published",
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

export const sanityFreshClient = createConfiguredClient({
  useCdn: false,
  token: sanityConfig.readToken,
});

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

export async function sanityFreshFetch<T>(query: string, params: QueryParams = {}) {
  const client = sanityFreshClient ?? sanityReadClient ?? sanityClient;

  if (!client) {
    throw new Error("Sanity is not configured.");
  }

  return client.fetch<T>(query, params);
}

/**
 * Admin-only, draft-aware read path — used exclusively by the Crear
 * producto flow and by the update/images/variants admin actions, so they
 * can resolve either a product still mid-creation (a Sanity draft,
 * `_id: "drafts.<id>"`) or an already-published one through the same clean
 * id, and get back the document's *true* stored `_id` so a follow-up
 * `.patch()`/`.delete()` targets the right literal document.
 *
 * Why this can't be `sanityFreshFetch`: this project has no
 * `SANITY_READ_TOKEN`, so every other read client above runs anonymously.
 * Sanity never returns draft content to an anonymous request, under any
 * perspective — that platform-level rule is what keeps a product mid-
 * creation invisible to the storefront and to the admin listing without
 * either of them needing a `isActive`/status filter to remember. Swapping
 * `sanityFreshFetch` itself for a token-bearing client would break that
 * guarantee for every caller (home page, PDP, catalog) that already relies
 * on it — hence a separate client, reached only from admin server actions
 * that explicitly import it.
 *
 * Why `perspective: "raw"` and not `perspective: "drafts"`: `"drafts"`
 * *does* resolve a draft when queried by its clean id, but it silently
 * remaps the returned `_id` to that clean id too — so a `.patch()` call
 * built from it 404s ("document not found"), because patch mutations
 * target the literal stored id, not a perspective-projected one. `"raw"`
 * returns documents exactly as stored, so a query written as
 * `_id in [$productId, "drafts." + $productId]` comes back with whichever
 * of the two literally exists — `drafts.<id>` while unfinalized, `<id>`
 * once published — and that's the id every write in this flow patches or
 * deletes by.
 */
const sanityAdminEditClient = sanityConfig.writeToken
  ? createConfiguredClient({
      useCdn: false,
      token: sanityConfig.writeToken,
      perspective: "raw",
    })
  : null;

export async function sanityAdminEditFetch<T>(query: string, params: QueryParams = {}) {
  if (!sanityAdminEditClient) {
    throw new Error("Sanity write credentials are not configured — the admin draft flow needs them to read drafts back.");
  }

  return sanityAdminEditClient.fetch<T>(query, params);
}
