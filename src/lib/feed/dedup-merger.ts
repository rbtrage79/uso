import type { FeedPost } from "@/types/feed";

/**
 * Suppress posts that are near-duplicates of a more recent post.
 * Two posts are considered duplicates if they share the same symbol + strike +
 * expiry + direction and were detected within 15 minutes of each other.
 */
export function deduplicatePosts(posts: FeedPost[]): FeedPost[] {
  const seen = new Map<string, number>(); // key → timestamp ms
  return posts.map((p) => {
    const key = `${p.symbol}|${p.strike}|${p.expirationISO}|${p.direction}`;
    const ts = new Date(p.detectedAt).getTime();
    const prev = seen.get(key);
    if (prev !== undefined && ts - prev < 15 * 60_000) {
      return { ...p, isDuplicate: true };
    }
    seen.set(key, ts);
    return p;
  });
}

/**
 * Merge consecutive prints in the same symbol+strike+expiry+direction within
 * a 30-minute window into a single card showing accumulated totals.
 */
export function mergeSimilarPosts(posts: FeedPost[]): FeedPost[] {
  const groups = new Map<string, FeedPost[]>();

  posts.forEach((p) => {
    const key = `${p.symbol}|${p.strike}|${p.expirationISO}|${p.direction}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });

  const result: FeedPost[] = [];

  groups.forEach((group) => {
    if (group.length === 1) { result.push(group[0]); return; }

    // Sort by time ascending
    const sorted = [...group].sort(
      (a, b) => new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime(),
    );

    // Merge into the most recent (last) post
    const anchor = sorted[sorted.length - 1];
    const totalContracts = sorted.reduce((s, p) => s + p.contracts, 0);
    const totalPremium   = sorted.reduce((s, p) => s + p.premium, 0);

    result.push({
      ...anchor,
      contracts: totalContracts,
      premium: totalPremium,
      mergedCount: sorted.length,
      mergedPrints: sorted.slice(0, -1).map((p) => ({
        timeAgo: p.timeAgo,
        contracts: p.contracts,
        premium: p.premium,
      })),
    });
  });

  // Re-sort by detectedAt desc
  return result.sort(
    (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
  );
}
