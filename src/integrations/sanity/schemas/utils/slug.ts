import { env } from "@/lib/env";

type SlugValue = {
  current?: string;
} | null | undefined;

type ValidationDocument = {
  _id?: string;
};

type ValidationClient = {
  fetch: <T>(query: string, params?: Record<string, unknown>) => Promise<T>;
};

type ValidationContext = {
  document?: ValidationDocument;
  getClient?: (options: { apiVersion: string }) => ValidationClient;
};

function getDocumentIds(documentId?: string) {
  if (!documentId) {
    return {
      documentId: "",
      draftId: "",
      publishedId: "",
    };
  }

  if (documentId.startsWith("drafts.")) {
    return {
      documentId,
      draftId: documentId,
      publishedId: documentId.replace(/^drafts\./, ""),
    };
  }

  return {
    documentId,
    draftId: `drafts.${documentId}`,
    publishedId: documentId,
  };
}

export function createUniqueSlugValidation(documentType: string, label: string) {
  return async (value: SlugValue, context: ValidationContext) => {
    const current = value?.current?.trim();

    if (!current) {
      return true;
    }

    const { documentId, draftId, publishedId } = getDocumentIds(context.document?._id);
    if (!context.getClient) {
      return true;
    }

    const client = context.getClient({ apiVersion: env.sanityApiVersion });
    const duplicateCount = await client.fetch<number>(
      `count(*[_type == $documentType && slug.current == $slug && !(_id in [$documentId, $draftId, $publishedId])])`,
      {
        documentType,
        slug: current,
        documentId,
        draftId,
        publishedId,
      },
    );

    if (duplicateCount > 0) {
      return `${label} ya usa esta URL. Cambia el slug para evitar duplicados.`;
    }

    return true;
  };
}
