/**
 * Peer Group Enricher — compares a signal's symbol against its peers.
 *
 * Detects:
 *   - Outlier status (this name standing out vs peers)
 *   - Synchronized flow (multiple peers also showing unusual activity)
 *   - ETF basket membership for rotation context
 */

import {
  getPeerGroupsForSymbol,
  getAllPeers,
  getEtfMembership,
  getProfile,
  type PeerGroup,
} from "@/data/sector-map";

export interface PeerEnrichment {
  sector: string;
  industryGroup: string;
  industry: string;
  subIndustry: string;
  peerGroups: PeerGroup[];
  allPeers: string[];
  etfMembership: string[];

  /** Peers that also have active signals in the current window */
  activePeerSymbols: string[];
  /** 0-100: how isolated / outlier this name is vs peers */
  peerOutlierScore: number;
  /** 0-100: how synchronized this name is with peers */
  peerSyncScore: number;
  /** Direction of peer consensus (if most peers are directional) */
  peerConsensusDirection?: "bullish" | "bearish" | "mixed" | "none";

  /** Whether this is a broad sector-ETF trade (institutional rotation proxy) */
  isEtfBasket: boolean;
  /** Primary ETF this name is commonly a top holding of */
  primaryEtf?: string;
}

export interface PeerSignalSummary {
  symbol: string;
  direction: "bullish" | "bearish" | "neutral";
  totalScore: number;
  totalPremium: number;
}

/**
 * Enrich a signal with peer group context.
 *
 * @param symbol        - The signal's underlying symbol
 * @param recentPeerSignals - Other signals from the same detection window (for sync detection)
 */
export function enrichPeers(
  symbol: string,
  recentPeerSignals: PeerSignalSummary[] = [],
): PeerEnrichment {
  const profile = getProfile(symbol);

  const peerGroups = getPeerGroupsForSymbol(symbol);
  const allPeers = getAllPeers(symbol);
  const etfMembership = getEtfMembership(symbol);
  const isEtfBasket = ["SPY", "QQQ", "IWM", "XLK", "XLV", "XLC", "XLY", "XBI", "SMH", "SOXX"].includes(symbol);

  // Find active peers from recent signals
  const peerSet = new Set(allPeers);
  const activePeerSymbols = recentPeerSignals
    .filter((s) => peerSet.has(s.symbol))
    .map((s) => s.symbol);

  // Peer sync score: % of known peers showing unusual flow in window
  const peerSyncScore = allPeers.length > 0
    ? Math.min(100, Math.round((activePeerSymbols.length / allPeers.length) * 100 * 1.5))
    : 0;

  // Peer outlier score: is this name acting differently from peers?
  // High outlier = this name is moving alone while peers are quiet
  const peerOutlierScore = allPeers.length > 0 && activePeerSymbols.length === 0
    ? 80
    : allPeers.length > 0 && activePeerSymbols.length <= 1
    ? 50
    : 20;

  // Direction consensus of active peers
  let peerConsensusDirection: PeerEnrichment["peerConsensusDirection"] = "none";
  if (activePeerSymbols.length >= 2) {
    const peerSignals = recentPeerSignals.filter((s) => peerSet.has(s.symbol));
    const bullCount = peerSignals.filter((s) => s.direction === "bullish").length;
    const bearCount = peerSignals.filter((s) => s.direction === "bearish").length;
    if (bullCount >= bearCount * 2) peerConsensusDirection = "bullish";
    else if (bearCount >= bullCount * 2) peerConsensusDirection = "bearish";
    else if (peerSignals.length > 0) peerConsensusDirection = "mixed";
  }

  // Primary ETF: first large-cap ETF in membership list
  const etfPriority = ["QQQ", "SPY", "SMH", "XBI", "XLK", "XLV", "XLC", "XLY"];
  const primaryEtf = etfMembership.find((e) => etfPriority.includes(e)) ?? etfMembership[0];

  return {
    sector:       profile?.sector       ?? "Unknown",
    industryGroup:profile?.industryGroup ?? "Unknown",
    industry:     profile?.industry     ?? "Unknown",
    subIndustry:  profile?.subIndustry  ?? "Unknown",
    peerGroups,
    allPeers,
    etfMembership,
    activePeerSymbols,
    peerOutlierScore,
    peerSyncScore,
    peerConsensusDirection,
    isEtfBasket,
    primaryEtf,
  };
}
