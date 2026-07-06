type SearchParamValue = string | string[] | undefined;

export type PostCheckoutSearchParams = {
  status?: SearchParamValue;
  type?: SearchParamValue;
  transactionId?: SearchParamValue;
  orderNumber?: SearchParamValue;
};

export type PostCheckoutContext = {
  status?: string;
  type?: string;
  transactionId?: string;
  orderNumber?: string;
};

function getSingleValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeValue(value: SearchParamValue) {
  const normalized = getSingleValue(value)?.trim();

  return normalized || undefined;
}

export function buildPostCheckoutContext(
  searchParams?: PostCheckoutSearchParams,
): PostCheckoutContext {
  return {
    status: normalizeValue(searchParams?.status),
    type: normalizeValue(searchParams?.type),
    transactionId: normalizeValue(searchParams?.transactionId),
    orderNumber: normalizeValue(searchParams?.orderNumber),
  };
}
