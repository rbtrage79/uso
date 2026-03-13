/**
 * Global Zustand store — UI state, filters, settings, watchlist,
 * saved filters, and alert subscriptions.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SignalFilters, AppSettings } from "@/types/index";
import { DEFAULT_SETTINGS } from "@/types/index";
import type { SavedFilter, AlertSubscription } from "@/types/features";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

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

  // Saved filters
  savedFilters: SavedFilter[];
  saveFilter: (name: string, filters: SignalFilters) => void;
  deleteSavedFilter: (id: string) => void;
  loadSavedFilter: (id: string) => void;

  // Alert subscriptions
  alertSubscriptions: AlertSubscription[];
  addAlertSubscription: (alert: Omit<AlertSubscription, "id">) => void;
  updateAlertSubscription: (id: string, patch: Partial<AlertSubscription>) => void;
  deleteAlertSubscription: (id: string) => void;

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

const SEED_SAVED_FILTERS: SavedFilter[] = [
  {
    id: "sf_whale_sweeps",
    name: "Whale Sweeps",
    createdAt: new Date("2026-03-10T09:00:00Z").toISOString(),
    filters: { signalType: "sweep", minPremium: 1_000_000, minScore: 75 },
  },
  {
    id: "sf_pre_earnings",
    name: "Pre-Earnings Only",
    createdAt: new Date("2026-03-11T14:30:00Z").toISOString(),
    filters: { minScore: 60, maxDte: 21 },
  },
  {
    id: "sf_high_iv",
    name: "High-IV Anomaly",
    createdAt: new Date("2026-03-12T10:15:00Z").toISOString(),
    filters: { minScore: 65, minPremium: 500_000 },
  },
];

const SEED_ALERTS: AlertSubscription[] = [
  {
    id: "alert_whale",
    name: "Any Whale (≥ 85)",
    threshold: 85,
    labelTypes: ["Smart Money? High Confidence"],
    channels: ["in-app"],
    enabled: true,
  },
  {
    id: "alert_nvda",
    name: "NVDA Alert",
    symbol: "NVDA",
    threshold: 70,
    labelTypes: [],
    channels: ["in-app", "browser"],
    enabled: true,
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
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
          watchlist: s.watchlist.filter((w) => w !== symbol.toUpperCase()),
        })),

      savedFilters: SEED_SAVED_FILTERS,
      saveFilter: (name, filters) =>
        set((s) => ({
          savedFilters: [
            ...s.savedFilters,
            {
              id: `sf_${generateId()}`,
              name,
              createdAt: new Date().toISOString(),
              filters,
            },
          ],
        })),
      deleteSavedFilter: (id) =>
        set((s) => ({
          savedFilters: s.savedFilters.filter((f) => f.id !== id),
        })),
      loadSavedFilter: (id) => {
        const sf = get().savedFilters.find((f) => f.id === id);
        if (sf) {
          // Cast Prisma enum types to the narrower literal types expected by updateFilters
          // (saved filters only store UI-compatible values, so these casts are safe)
          const { direction, signalType, ...rest } = sf.filters;
          get().updateFilters({
            ...rest,
            direction: direction as "bullish" | "bearish" | "neutral" | "all" | undefined,
            signalType: signalType as "sweep" | "block" | "repeat_sweep" | "combo" | "all" | undefined,
          });
        }
      },

      alertSubscriptions: SEED_ALERTS,
      addAlertSubscription: (alert) =>
        set((s) => ({
          alertSubscriptions: [
            ...s.alertSubscriptions,
            { ...alert, id: `alert_${generateId()}` },
          ],
        })),
      updateAlertSubscription: (id, patch) =>
        set((s) => ({
          alertSubscriptions: s.alertSubscriptions.map((a) =>
            a.id === id ? { ...a, ...patch } : a,
          ),
        })),
      deleteAlertSubscription: (id) =>
        set((s) => ({
          alertSubscriptions: s.alertSubscriptions.filter((a) => a.id !== id),
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
        savedFilters: s.savedFilters,
        alertSubscriptions: s.alertSubscriptions,
      }),
    },
  ),
);
