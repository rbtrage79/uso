/**
 * Theme buckets — thematic investment clusters that options flow can synchronize across.
 *
 * A ticker can belong to multiple themes.
 * Themes are higher-level than peer groups (narrative / catalyst driven).
 */

export interface ThemeBucketDef {
  id: string;
  name: string;
  emoji: string;
  color: string;             // tailwind bg color token (for UI)
  description: string;
  /** Active narrative / catalyst driving this theme */
  catalyst?: string;
  members: string[];
  /** Related themes (flow can spill across) */
  relatedThemes?: string[];
}

export const THEME_BUCKETS: ThemeBucketDef[] = [
  {
    id: "ai-infra",
    name: "AI Infrastructure",
    emoji: "🧠",
    color: "#7c3aed",
    description: "Hardware, cloud, and software enabling large-scale AI model training and inference",
    catalyst: "Hyperscaler capex cycle; NVDA/AMD GPU demand; sovereign AI spending",
    members: ["NVDA", "AMD", "AVGO", "MU", "SMCI", "MSFT", "AMZN", "GOOGL", "META", "PLTR"],
    relatedThemes: ["semis", "ai-software", "cloud"],
  },
  {
    id: "ai-software",
    name: "AI Software & Agents",
    emoji: "🤖",
    color: "#2563eb",
    description: "Pure-play AI software, agentic platforms, and enterprise AI analytics",
    catalyst: "Enterprise AI adoption; agent monetization; reasoning models",
    members: ["MSFT", "GOOGL", "META", "PLTR", "CRM"],
    relatedThemes: ["ai-infra", "saas"],
  },
  {
    id: "semis",
    name: "Semiconductors",
    emoji: "⚡",
    color: "#0891b2",
    description: "Semiconductor design and equipment — cycles driven by PC, mobile, datacenter, auto",
    catalyst: "AI chip supercycle; HBM memory ramp; advanced packaging",
    members: ["NVDA", "AMD", "INTC", "QCOM", "AVGO", "MU", "SMCI"],
    relatedThemes: ["ai-infra"],
  },
  {
    id: "glp1-obesity",
    name: "GLP-1 / Obesity Drugs",
    emoji: "💊",
    color: "#db2777",
    description: "GLP-1 receptor agonist drugs for obesity, type-2 diabetes, and NASH",
    catalyst: "Oral GLP-1 approvals; cardiovascular outcome data; insurance coverage expansion",
    members: ["LLY", "NVO"],
    relatedThemes: ["biotech"],
  },
  {
    id: "biotech",
    name: "Biotech & Genomics",
    emoji: "🧬",
    color: "#16a34a",
    description: "Biotechnology — driven by FDA catalysts, clinical readouts, and M&A",
    catalyst: "FDA PDUFA calendar; CRISPR gene therapy milestones; GLP-1 pipeline expansion",
    members: ["MRNA", "LLY", "NVO", "CRSP", "XBI"],
    relatedThemes: ["glp1-obesity"],
  },
  {
    id: "ev",
    name: "EV & Clean Energy",
    emoji: "🔋",
    color: "#15803d",
    description: "Electric vehicles, EV charging, battery technology, and clean energy",
    catalyst: "IRA subsidies; China EV competition; Tesla product cycle",
    members: ["TSLA"],
    relatedThemes: [],
  },
  {
    id: "defense-cyber",
    name: "Defense & Cybersecurity",
    emoji: "🛡️",
    color: "#b45309",
    description: "Defense contractors, government IT, and cybersecurity companies",
    catalyst: "Geopolitical tensions; NATO spending commitments; AI in defense",
    members: ["PLTR"],
    relatedThemes: ["ai-software"],
  },
  {
    id: "cloud",
    name: "Cloud & SaaS",
    emoji: "☁️",
    color: "#0369a1",
    description: "Cloud platforms and enterprise SaaS — growth + AI integration",
    catalyst: "AI-driven cloud revenue acceleration; multi-cloud adoption",
    members: ["MSFT", "AMZN", "GOOGL"],
    relatedThemes: ["ai-infra", "saas"],
  },
  {
    id: "saas",
    name: "Enterprise SaaS",
    emoji: "📊",
    color: "#7e22ce",
    description: "B2B software-as-a-service companies monetizing AI features",
    catalyst: "AI copilot monetization; consumption-based model transition",
    members: ["MSFT", "PLTR"],
    relatedThemes: ["cloud", "ai-software"],
  },
  {
    id: "digital-ads",
    name: "Digital Advertising",
    emoji: "📣",
    color: "#ea580c",
    description: "Online advertising platforms — driven by macro ad spend and AI targeting",
    catalyst: "AI-powered ad efficiency; retail media networks; cookie deprecation",
    members: ["META", "GOOGL"],
    relatedThemes: ["ai-software"],
  },
  {
    id: "mega-cap",
    name: "Mega-Cap Tech",
    emoji: "🏔️",
    color: "#475569",
    description: "The largest US technology companies — often trade as a risk-on/risk-off block",
    catalyst: "Rate sensitivity; AI capex cycle; macro risk sentiment",
    members: ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA"],
    relatedThemes: ["ai-infra", "cloud"],
  },
  {
    id: "macro-rates",
    name: "Macro / Rates",
    emoji: "📈",
    color: "#64748b",
    description: "Broad index and rates-sensitive names reacting to macro data",
    catalyst: "FOMC policy path; CPI/NFP data; yield curve shape",
    members: ["SPY", "QQQ", "IWM"],
    relatedThemes: [],
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getThemesForSymbol(symbol: string): ThemeBucketDef[] {
  return THEME_BUCKETS.filter((t) => t.members.includes(symbol));
}

export function getThemeById(id: string): ThemeBucketDef | null {
  return THEME_BUCKETS.find((t) => t.id === id) ?? null;
}

export function getThemeMembers(themeId: string): string[] {
  return THEME_BUCKETS.find((t) => t.id === themeId)?.members ?? [];
}
