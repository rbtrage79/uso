/**
 * Sector / industry / peer-group / ETF membership map.
 *
 * Structure mirrors GICS (Global Industry Classification Standard):
 *   Sector → Industry Group → Industry → Sub-Industry
 *
 * Each entry also carries:
 *   - etfMembership: ETFs and baskets this name is a meaningful component of
 *   - peerGroup: curated group of competitors / comparables for flow sync detection
 */

export interface TickerProfile {
  symbol: string;
  name: string;
  sector: string;
  industryGroup: string;
  industry: string;
  subIndustry: string;
  /** ETFs where this is a top-20 holding */
  etfMembership: string[];
  /** Custom peer group IDs (see PEER_GROUPS below) */
  peerGroups: string[];
  marketCapTier: "mega" | "large" | "mid" | "small";
  beta?: number;
}

export interface PeerGroup {
  id: string;
  name: string;
  description: string;
  members: string[];
}

export interface EtfBasket {
  ticker: string;
  name: string;
  focus: string;
  topHoldings: string[];
}

// ─── Ticker Profiles ─────────────────────────────────────────────────────────

export const TICKER_PROFILES: Record<string, TickerProfile> = {
  // ── Semiconductors ──
  NVDA: {
    symbol: "NVDA", name: "NVIDIA Corporation",
    sector: "Information Technology", industryGroup: "Semiconductors & Semiconductor Equipment",
    industry: "Semiconductors", subIndustry: "Semiconductors (AI/GPU)",
    etfMembership: ["SMH", "SOXX", "QQQ", "SPY", "XLK", "AIQ", "BOTZ"],
    peerGroups: ["semis-ai", "ai-infra", "mega-cap-tech"],
    marketCapTier: "mega", beta: 1.85,
  },
  AMD: {
    symbol: "AMD", name: "Advanced Micro Devices",
    sector: "Information Technology", industryGroup: "Semiconductors & Semiconductor Equipment",
    industry: "Semiconductors", subIndustry: "Semiconductors (CPU/GPU)",
    etfMembership: ["SMH", "SOXX", "QQQ", "XLK"],
    peerGroups: ["semis-ai", "semis-datacenter"],
    marketCapTier: "large", beta: 1.95,
  },
  INTC: {
    symbol: "INTC", name: "Intel Corporation",
    sector: "Information Technology", industryGroup: "Semiconductors & Semiconductor Equipment",
    industry: "Semiconductors", subIndustry: "Semiconductors (Foundry/Legacy)",
    etfMembership: ["SMH", "SOXX", "QQQ", "XLK"],
    peerGroups: ["semis-datacenter", "semis-foundry"],
    marketCapTier: "large", beta: 1.25,
  },
  QCOM: {
    symbol: "QCOM", name: "Qualcomm",
    sector: "Information Technology", industryGroup: "Semiconductors & Semiconductor Equipment",
    industry: "Semiconductors", subIndustry: "Semiconductors (Mobile/Edge AI)",
    etfMembership: ["SMH", "SOXX", "QQQ", "XLK"],
    peerGroups: ["semis-mobile", "semis-edge-ai"],
    marketCapTier: "large", beta: 1.35,
  },
  AVGO: {
    symbol: "AVGO", name: "Broadcom",
    sector: "Information Technology", industryGroup: "Semiconductors & Semiconductor Equipment",
    industry: "Semiconductors", subIndustry: "Semiconductors (Networking/Custom)",
    etfMembership: ["SMH", "SOXX", "QQQ", "XLK", "SPY"],
    peerGroups: ["semis-ai", "semis-networking"],
    marketCapTier: "mega", beta: 1.50,
  },
  MU: {
    symbol: "MU", name: "Micron Technology",
    sector: "Information Technology", industryGroup: "Semiconductors & Semiconductor Equipment",
    industry: "Semiconductors", subIndustry: "Semiconductors (Memory/HBM)",
    etfMembership: ["SMH", "SOXX", "XLK"],
    peerGroups: ["semis-memory", "semis-ai"],
    marketCapTier: "large", beta: 2.0,
  },
  SMCI: {
    symbol: "SMCI", name: "Super Micro Computer",
    sector: "Information Technology", industryGroup: "Technology Hardware & Equipment",
    industry: "Technology Hardware", subIndustry: "AI Server Infrastructure",
    etfMembership: ["SOXX", "AIQ"],
    peerGroups: ["ai-infra", "semis-ai"],
    marketCapTier: "mid", beta: 2.5,
  },

  // ── Mega-Cap Tech / AI ──
  MSFT: {
    symbol: "MSFT", name: "Microsoft Corporation",
    sector: "Information Technology", industryGroup: "Software & Services",
    industry: "Software", subIndustry: "Systems & Application Software (AI Cloud)",
    etfMembership: ["QQQ", "SPY", "XLK", "IGV", "AIQ"],
    peerGroups: ["mega-cap-tech", "ai-cloud", "saas-enterprise"],
    marketCapTier: "mega", beta: 0.90,
  },
  GOOGL: {
    symbol: "GOOGL", name: "Alphabet (Class A)",
    sector: "Communication Services", industryGroup: "Media & Entertainment",
    industry: "Interactive Media & Services", subIndustry: "Search & AI Platforms",
    etfMembership: ["QQQ", "SPY", "XLC", "AIQ"],
    peerGroups: ["mega-cap-tech", "ai-cloud", "digital-ads"],
    marketCapTier: "mega", beta: 1.05,
  },
  META: {
    symbol: "META", name: "Meta Platforms",
    sector: "Communication Services", industryGroup: "Media & Entertainment",
    industry: "Interactive Media & Services", subIndustry: "Social Media & AI Ads",
    etfMembership: ["QQQ", "SPY", "XLC", "AIQ"],
    peerGroups: ["mega-cap-tech", "digital-ads", "ai-infra"],
    marketCapTier: "mega", beta: 1.25,
  },
  AMZN: {
    symbol: "AMZN", name: "Amazon.com",
    sector: "Consumer Discretionary", industryGroup: "Retailing",
    industry: "Internet & Direct Marketing Retail", subIndustry: "E-Commerce & Cloud (AI)",
    etfMembership: ["QQQ", "SPY", "XLY", "AIQ"],
    peerGroups: ["mega-cap-tech", "ai-cloud", "e-commerce"],
    marketCapTier: "mega", beta: 1.15,
  },
  AAPL: {
    symbol: "AAPL", name: "Apple Inc.",
    sector: "Information Technology", industryGroup: "Technology Hardware & Equipment",
    industry: "Technology Hardware", subIndustry: "Consumer Electronics & AI Devices",
    etfMembership: ["QQQ", "SPY", "XLK"],
    peerGroups: ["mega-cap-tech"],
    marketCapTier: "mega", beta: 0.85,
  },
  TSLA: {
    symbol: "TSLA", name: "Tesla Inc.",
    sector: "Consumer Discretionary", industryGroup: "Automobiles & Components",
    industry: "Automobiles", subIndustry: "Electric Vehicles & Energy Storage",
    etfMembership: ["QQQ", "SPY", "XLY", "LIT", "DRIV", "IDRV"],
    peerGroups: ["ev-auto", "ev-battery"],
    marketCapTier: "mega", beta: 2.10,
  },
  PLTR: {
    symbol: "PLTR", name: "Palantir Technologies",
    sector: "Information Technology", industryGroup: "Software & Services",
    industry: "Software", subIndustry: "AI Data & Government Analytics",
    etfMembership: ["AIQ", "IGV", "BOTZ"],
    peerGroups: ["ai-software", "defense-cyber"],
    marketCapTier: "large", beta: 1.60,
  },

  // ── Biotech / Pharma ──
  MRNA: {
    symbol: "MRNA", name: "Moderna Inc.",
    sector: "Health Care", industryGroup: "Pharmaceuticals Biotechnology & Life Sciences",
    industry: "Biotechnology", subIndustry: "mRNA Therapeutics & Vaccines",
    etfMembership: ["XBI", "IBB", "ARKG"],
    peerGroups: ["biotech-mrna", "biotech-vaccines"],
    marketCapTier: "large", beta: 1.80,
  },
  LLY: {
    symbol: "LLY", name: "Eli Lilly",
    sector: "Health Care", industryGroup: "Pharmaceuticals Biotechnology & Life Sciences",
    industry: "Pharmaceuticals", subIndustry: "GLP-1 / Obesity Therapeutics",
    etfMembership: ["XLV", "IBB", "PPH"],
    peerGroups: ["glp1-obesity", "pharma-mega"],
    marketCapTier: "mega", beta: 0.55,
  },
  NVO: {
    symbol: "NVO", name: "Novo Nordisk",
    sector: "Health Care", industryGroup: "Pharmaceuticals Biotechnology & Life Sciences",
    industry: "Pharmaceuticals", subIndustry: "GLP-1 / Obesity Therapeutics",
    etfMembership: ["XLV", "IBB"],
    peerGroups: ["glp1-obesity"],
    marketCapTier: "mega", beta: 0.50,
  },
  CRSP: {
    symbol: "CRSP", name: "CRISPR Therapeutics",
    sector: "Health Care", industryGroup: "Pharmaceuticals Biotechnology & Life Sciences",
    industry: "Biotechnology", subIndustry: "Gene Editing / CRISPR",
    etfMembership: ["XBI", "ARKG"],
    peerGroups: ["biotech-gene-editing"],
    marketCapTier: "small", beta: 2.20,
  },

  // ── ETFs (for reference) ──
  SPY:  { symbol: "SPY",  name: "SPDR S&P 500 ETF",            sector: "ETF", industryGroup: "ETF", industry: "Broad Market", subIndustry: "Large Cap Blend", etfMembership: [], peerGroups: ["macro-etf"], marketCapTier: "mega" },
  QQQ:  { symbol: "QQQ",  name: "Invesco QQQ (Nasdaq-100)",     sector: "ETF", industryGroup: "ETF", industry: "Tech-Heavy",   subIndustry: "Nasdaq-100",      etfMembership: [], peerGroups: ["macro-etf"], marketCapTier: "mega" },
  IWM:  { symbol: "IWM",  name: "iShares Russell 2000 ETF",     sector: "ETF", industryGroup: "ETF", industry: "Small Cap",    subIndustry: "Small Cap Blend", etfMembership: [], peerGroups: ["macro-etf"], marketCapTier: "mega" },
  XLK:  { symbol: "XLK",  name: "Technology Select Sector SPDR",sector: "ETF", industryGroup: "ETF", industry: "Sector",       subIndustry: "Technology",      etfMembership: [], peerGroups: ["sector-etf"], marketCapTier: "large" },
  XLV:  { symbol: "XLV",  name: "Health Care Select Sector SPDR",sector:"ETF", industryGroup: "ETF", industry: "Sector",       subIndustry: "Health Care",     etfMembership: [], peerGroups: ["sector-etf"], marketCapTier: "large" },
  XLC:  { symbol: "XLC",  name: "Communication Services SPDR",  sector: "ETF", industryGroup: "ETF", industry: "Sector",       subIndustry: "Comm Services",   etfMembership: [], peerGroups: ["sector-etf"], marketCapTier: "large" },
  XLY:  { symbol: "XLY",  name: "Consumer Discretionary SPDR",  sector: "ETF", industryGroup: "ETF", industry: "Sector",       subIndustry: "Cons. Discr.",    etfMembership: [], peerGroups: ["sector-etf"], marketCapTier: "large" },
  XBI:  { symbol: "XBI",  name: "SPDR S&P Biotech ETF",         sector: "ETF", industryGroup: "ETF", industry: "Biotech",      subIndustry: "Equal-Wt Biotech",etfMembership: [], peerGroups: ["biotech-broad"], marketCapTier: "large" },
  SMH:  { symbol: "SMH",  name: "VanEck Semiconductor ETF",     sector: "ETF", industryGroup: "ETF", industry: "Semis",        subIndustry: "Semiconductors",  etfMembership: [], peerGroups: ["semis-broad"], marketCapTier: "large" },
  SOXX: { symbol: "SOXX", name: "iShares PHLX Semiconductor",   sector: "ETF", industryGroup: "ETF", industry: "Semis",        subIndustry: "Semiconductors",  etfMembership: [], peerGroups: ["semis-broad"], marketCapTier: "large" },
};

// ─── Peer Groups ──────────────────────────────────────────────────────────────

export const PEER_GROUPS: PeerGroup[] = [
  {
    id: "semis-ai",
    name: "AI Semiconductors",
    description: "Chips directly powering AI training and inference workloads",
    members: ["NVDA", "AMD", "AVGO", "MU", "SMCI"],
  },
  {
    id: "semis-datacenter",
    name: "Datacenter Semiconductors",
    description: "Server-oriented chip companies (CPU, networking, memory)",
    members: ["NVDA", "AMD", "INTC", "AVGO", "MU"],
  },
  {
    id: "semis-mobile",
    name: "Mobile Semiconductors",
    description: "Smartphone and edge compute chipmakers",
    members: ["QCOM", "NVDA", "AVGO", "INTC"],
  },
  {
    id: "semis-memory",
    name: "Memory Semiconductors",
    description: "DRAM, NAND, HBM memory names",
    members: ["MU"],
  },
  {
    id: "semis-foundry",
    name: "Semiconductor Foundry",
    description: "Pure-play foundries and IDMs with fab exposure",
    members: ["INTC"],
  },
  {
    id: "ai-infra",
    name: "AI Infrastructure",
    description: "Hardware and software enabling large-scale AI deployment",
    members: ["NVDA", "AMD", "SMCI", "AVGO", "META", "MSFT", "AMZN"],
  },
  {
    id: "ai-cloud",
    name: "AI Cloud Platforms",
    description: "Hyperscalers competing in AI cloud services",
    members: ["MSFT", "GOOGL", "AMZN", "META"],
  },
  {
    id: "ai-software",
    name: "AI Software & Analytics",
    description: "Pure-play AI software, data, and enterprise analytics",
    members: ["PLTR", "MSFT", "GOOGL"],
  },
  {
    id: "mega-cap-tech",
    name: "Mega-Cap Technology",
    description: "The 7 largest US technology names by market cap",
    members: ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA"],
  },
  {
    id: "digital-ads",
    name: "Digital Advertising",
    description: "Companies deriving majority revenue from digital advertising",
    members: ["META", "GOOGL"],
  },
  {
    id: "ev-auto",
    name: "Electric Vehicle OEMs",
    description: "Pure-play EV automakers",
    members: ["TSLA"],
  },
  {
    id: "glp1-obesity",
    name: "GLP-1 / Obesity Drugs",
    description: "Companies developing or selling GLP-1 receptor agonists for obesity/T2D",
    members: ["LLY", "NVO"],
  },
  {
    id: "biotech-mrna",
    name: "mRNA Biotechs",
    description: "mRNA platform companies",
    members: ["MRNA"],
  },
  {
    id: "biotech-gene-editing",
    name: "Gene Editing / CRISPR",
    description: "Gene therapy and CRISPR technology companies",
    members: ["CRSP"],
  },
  {
    id: "biotech-broad",
    name: "Broad Biotech",
    description: "General biotech sector names (XBI components)",
    members: ["MRNA", "CRSP"],
  },
  {
    id: "macro-etf",
    name: "Broad Market ETFs",
    description: "Index-level ETFs used for macro-level flow detection",
    members: ["SPY", "QQQ", "IWM"],
  },
  {
    id: "sector-etf",
    name: "Sector ETFs",
    description: "SPDR sector ETFs for rotation detection",
    members: ["XLK", "XLV", "XLC", "XLY", "XBI", "SMH", "SOXX"],
  },
  {
    id: "defense-cyber",
    name: "Defense & Cybersecurity",
    description: "Defense contractors and cybersecurity companies",
    members: ["PLTR"],
  },
  {
    id: "saas-enterprise",
    name: "Enterprise SaaS",
    description: "B2B software-as-a-service companies",
    members: ["MSFT", "PLTR"],
  },
];

// ─── ETF baskets ──────────────────────────────────────────────────────────────

export const ETF_BASKETS: EtfBasket[] = [
  { ticker: "QQQ",  name: "Invesco QQQ (Nasdaq-100)", focus: "Tech-heavy large cap", topHoldings: ["AAPL","MSFT","NVDA","AMZN","META","GOOGL","TSLA","AVGO","AMD","QCOM"] },
  { ticker: "SMH",  name: "VanEck Semiconductor ETF", focus: "Semiconductors", topHoldings: ["NVDA","TSM","AVGO","QCOM","MU","AMD","INTC","AMAT","KLAC","LRCX"] },
  { ticker: "XBI",  name: "SPDR S&P Biotech ETF", focus: "Equal-weight Biotech", topHoldings: ["MRNA","CRSP","BLUE","EDIT","NTLA","FATE","RCUS","VRTX","REGN","AMGN"] },
  { ticker: "AIQ",  name: "Global X AI & Technology ETF", focus: "AI themes", topHoldings: ["NVDA","MSFT","GOOGL","META","AMZN","PLTR","SMCI","AMD","AVGO","QCOM"] },
  { ticker: "ARKG", name: "ARK Genomic Revolution ETF", focus: "Genomics & biotech", topHoldings: ["CRSP","TDOC","RXRX","VCYT","PNTM","ACMR","NVAX","IOVA","AGEN","VERV"] },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getProfile(symbol: string): TickerProfile | null {
  return TICKER_PROFILES[symbol] ?? null;
}

export function getPeerGroup(groupId: string): PeerGroup | null {
  return PEER_GROUPS.find((g) => g.id === groupId) ?? null;
}

/** All peer group IDs that a symbol belongs to */
export function getPeerGroupsForSymbol(symbol: string): PeerGroup[] {
  return PEER_GROUPS.filter((g) => g.members.includes(symbol));
}

/** All peers of a symbol (union across all peer groups, deduplicated, excluding self) */
export function getAllPeers(symbol: string): string[] {
  const peers = new Set<string>();
  for (const group of getPeerGroupsForSymbol(symbol)) {
    for (const m of group.members) {
      if (m !== symbol) peers.add(m);
    }
  }
  return [...peers];
}

/** ETFs a symbol is a top holding of */
export function getEtfMembership(symbol: string): string[] {
  return TICKER_PROFILES[symbol]?.etfMembership ?? [];
}
