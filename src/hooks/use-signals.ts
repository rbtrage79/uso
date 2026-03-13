"use client";

import { useState, useEffect, useCallback } from "react";
import type { EnrichedSignal } from "@/types/signals";
import type { SignalFilters } from "@/types/signals";
import { MOCK_SIGNALS } from "@/data/mock-signals";

interface UseSignalsResult {
  signals: EnrichedSignal[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  hasMore: boolean;
  loadMore: () => void;
}

export function useSignals(filters?: Partial<SignalFilters>): UseSignalsResult {
  const [signals, setSignals] = useState<EnrichedSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true" || !process.env.NEXT_PUBLIC_MOCK_MODE;

  const fetchSignals = useCallback(async (pageNum = 0) => {
    try {
      setIsLoading(true);
      setError(null);

      if (isMock) {
        await new Promise((r) => setTimeout(r, 300));
        let filtered = MOCK_SIGNALS;
        if (filters?.direction && filters.direction !== "all") {
          filtered = filtered.filter((s) => s.direction === filters.direction);
        }
        if (filters?.minScore) {
          filtered = filtered.filter((s) => s.totalScore >= filters.minScore!);
        }
        if (filters?.minPremium) {
          filtered = filtered.filter((s) => s.totalPremium >= filters.minPremium!);
        }
        if (filters?.symbols?.length) {
          const syms = filters.symbols.map((s) => s.toUpperCase());
          filtered = filtered.filter((s) => syms.includes(s.symbol));
        }
        setSignals(filtered);
        setHasMore(false);
        return;
      }

      const params = new URLSearchParams();
      if (filters?.direction && filters.direction !== "all") params.set("direction", filters.direction);
      if (filters?.minScore) params.set("minScore", String(filters.minScore));
      if (filters?.minPremium) params.set("minPremium", String(filters.minPremium));
      params.set("limit", "50");
      params.set("offset", String(pageNum * 50));

      const res = await fetch(`/api/signals?${params}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      setSignals((prev) => (pageNum === 0 ? data.signals : [...prev, ...data.signals]));
      setHasMore(data.hasMore ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load signals");
    } finally {
      setIsLoading(false);
    }
  }, [filters, isMock]);

  useEffect(() => {
    setPage(0);
    fetchSignals(0);
  }, [JSON.stringify(filters)]);

  const refresh = useCallback(() => {
    setPage(0);
    fetchSignals(0);
  }, [fetchSignals]);

  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchSignals(next);
  }, [page, fetchSignals]);

  return { signals, isLoading, error, refresh, hasMore, loadMore };
}
