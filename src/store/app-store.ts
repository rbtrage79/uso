/**
 * Global Zustand store — UI state, filters, settings, watchlist.
 * Non-signal state only; signal data comes from server via hooks.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SignalFilters, AppSettings } from "@/types/index";
import { DEFAULT_SETTINGS } from "@/types/index";

interface AppState {
  // Settings
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Signal filters
  filters: SignalFilters;
  updateFilters: (patch: Partial<SignalFilters>) => void;
  resetFilters: () => void;

  // Watchlist
  watchlist: string[];
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedSignalId: string | null;
  setSelectedSignalId: (id: string | null) => void;
  activeSymbol: string | null;
  setActiveSymbol: (symbol: string | null) => void;

  // Feed scroll position
  feedScrollTop: number;
  setFeedScrollTop: (top: number) => void;
}

const DEFAULT_FILTERS: SignalFilters = {
  direction: "all",
  minScore: 55,
  minPremium: 50_000,
  signalType: "all",
  maxDte: 90,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      filters: DEFAULT_FILTERS,
      updateFilters: (patch) =>
        set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      watchlist: ["AAPL", "NVDA", "TSLA", "SPY"],
      addToWatchlist: (symbol) =>
        set((s) => ({
          watchlist: s.watchlist.includes(symbol.toUpperCase())
            ? s.watchlist
            : [...s.watchlist, symbol.toUpperCase()],
        })),
      removeFromWatchlist: (symbol) =>
        set((s) => ({
          watchlist: s.watchlist.filter((s) => s !== symbol.toUpperCase()),
        })),

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      selectedSignalId: null,
      setSelectedSignalId: (id) => set({ selectedSignalId: id }),
      activeSymbol: null,
      setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),

      feedScrollTop: 0,
      setFeedScrollTop: (top) => set({ feedScrollTop: top }),
    }),
    {
      name: "ufr-app-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        settings: s.settings,
        filters: s.filters,
        watchlist: s.watchlist,
      }),
    },
  ),
);
