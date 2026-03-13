/**
 * Polygon.io REST client — base fetch wrapper with retry, rate-limiting,
 * and automatic mock-mode passthrough.
 */

const POLYGON_BASE = "https://api.polygon.io";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

export class PolygonError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public endpoint: string,
  ) {
    super(message);
    this.name = "PolygonError";
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function polygonFetch<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  retries = MAX_RETRIES,
): Promise<T> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) throw new Error("POLYGON_API_KEY is not set");

  const url = new URL(path, POLYGON_BASE);
  url.searchParams.set("apiKey", apiKey);

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { "Accept-Encoding": "gzip" },
        next: { revalidate: 0 }, // no Next.js caching for live data
      });

      if (res.status === 429) {
        // Rate-limited — back off
        const retryAfter = parseInt(res.headers.get("Retry-After") ?? "1") * 1000;
        await sleep(retryAfter || RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new PolygonError(res.status, `${res.status} ${res.statusText}: ${body}`, path);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err as Error;
      if (err instanceof PolygonError && err.statusCode < 500) throw err;
      if (attempt < retries - 1) await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError ?? new Error(`Polygon fetch failed after ${retries} retries: ${path}`);
}

/**
 * Auto-paginate through all pages of a Polygon cursor endpoint.
 * Stops when next_url is absent or result count reaches `maxResults`.
 */
export async function polygonPaginate<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  maxResults = 5000,
): Promise<T[]> {
  const results: T[] = [];

  interface Page {
    results: T[];
    next_url?: string;
    status: string;
  }

  let page = await polygonFetch<Page>(path, { ...params, limit: 250 });
  results.push(...(page.results ?? []));

  while (page.next_url && results.length < maxResults) {
    // next_url already contains apiKey from Polygon
    const next = new URL(page.next_url);
    next.searchParams.set("apiKey", process.env.POLYGON_API_KEY!);
    const res = await fetch(next.toString());
    page = (await res.json()) as Page;
    results.push(...(page.results ?? []));
  }

  return results;
}

/** True when mock mode is active (no real API calls needed) */
export function isMockMode(): boolean {
  return process.env.MOCK_MODE === "true" || !process.env.POLYGON_API_KEY;
}
