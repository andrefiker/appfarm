export class AccountRequestError extends Error {
  status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'AccountRequestError';
    this.status = status;
  }
}

export function accountErrorMessage(path: string, status: number, payload: unknown): string {
  if (status === 404 || status >= 500) return 'Server unavailable. Please try again later.';
  if (status === 409 && path === '/players/register') return 'Knight ID already taken.';
  if (status === 401 && path === '/players/login') return 'Invalid credentials.';
  if (status === 401 && path === '/players/recover') return 'Knight ID or recovery code not recognized.';
  if (status === 429) return 'Too many attempts. Please try again later.';
  const error = (payload as { error?: unknown } | null)?.error;
  return status === 400 && typeof error === 'string' ? error : 'Account request failed. Please try again.';
}

export function accountServiceReady(payload: unknown): boolean {
  const health = payload as { available?: unknown; migration?: unknown } | null;
  return health?.available === true && typeof health.migration === 'number' && health.migration >= 4;
}

// Leading slashes keep WebView requests on the page's HTTPS origin. The Android
// asset loader serves /assets/ locally; /players/* goes to the same host's API.
export async function accountRequest<T>(path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'include',
      headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new AccountRequestError(accountErrorMessage(path, response.status, payload), response.status);
    if (payload === null) throw new AccountRequestError('Server unavailable. Please try again later.', response.status);
    return payload as T;
  } catch (error) {
    if (error instanceof AccountRequestError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new AccountRequestError('Connection problem. Please try again.');
    if (error instanceof TypeError) throw new AccountRequestError('Connection problem. Check your internet connection.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
