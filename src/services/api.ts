export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
export function createApi(options: {
  baseUrl: string;
  token: () => string;
  unauthorized: () => void;
  fetch?: typeof fetch;
}) {
  const requestFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  return async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const token = options.token();
    let response: Response;
    try {
      response = await requestFetch(`${options.baseUrl.replace(/\/$/, '')}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ApiError(0, 'Server nie je dostupný. Skontrolujte spojenie a skúste to znova.');
    }
    if (response.status === 204) return undefined as T;
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      errors?: { field: string; message: string }[];
    };
    if (!response.ok) {
      const fields = Object.fromEntries(
        (payload.errors ?? []).map(({ field, message }) => [field, message]),
      );
      // An expired request from an earlier session must not sign out a newer account.
      if (response.status === 401 && token && token === options.token()) options.unauthorized();
      throw new ApiError(
        response.status,
        payload.message ??
          (Object.values(fields).join(' ') || 'Požiadavku sa nepodarilo dokončiť.'),
        fields,
      );
    }
    return payload as T;
  };
}
