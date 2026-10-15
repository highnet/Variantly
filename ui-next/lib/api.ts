// The server only answers POSTs that carry X-Variantly, so no other page can
// drive it.
export const api = async <T = unknown>(method: 'GET' | 'POST', route: string, body?: unknown): Promise<T> => {
  const res = await fetch(`/api/${route}`, {
    method,
    headers: { 'content-type': 'application/json', ...(method === 'POST' ? { 'x-variantly': '1' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
};
