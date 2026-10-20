/** Share in-flight reads as well as completed results to avoid provider bursts. */
export function createRequestCache(maxEntries = 300) {
  const values = new Map<string, { data: unknown; expires: number }>();
  const pending = new Map<string, Promise<unknown>>();
  return async function cached<T>(key: string, fetcher: () => Promise<T>, ttl = 60000): Promise<T> {
    const hit = values.get(key);
    if (hit && hit.expires > Date.now()) return hit.data as T;
    const running = pending.get(key);
    if (running) return running as Promise<T>;
    const task = Promise.resolve().then(fetcher).then(data => {
      if (!values.has(key) && values.size >= maxEntries) values.delete(values.keys().next().value!);
      values.set(key, { data, expires: Date.now() + ttl });
      return data;
    }).finally(() => { pending.delete(key); });
    pending.set(key, task);
    return task;
  };
}
export const cached = createRequestCache();
