export function jsonError(
  errors: string[],
  status: number,
  options: { requestId?: string } = {},
) {
  const headers = new Headers();

  if (options.requestId) {
    headers.set("x-request-id", options.requestId);
  }

  return Response.json(
    {
      ok: false,
      errors,
    },
    { status, headers },
  );
}

export function jsonSuccess<T extends object>(
  body: T,
  status = 200,
  options: { requestId?: string } = {},
) {
  const headers = new Headers();

  if (options.requestId) {
    headers.set("x-request-id", options.requestId);
  }

  return Response.json(body, { status, headers });
}
