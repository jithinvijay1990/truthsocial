export const DEFAULT_MARKET_KEYWORDS = [
  "tariff",
  "tariffs",
  "trade deal",
  "trade war",
  "china",
  "sanction",
  "sanctions",
  "export",
  "import",
  "federal reserve",
  "the fed",
  "interest rate",
  "rate cut",
  "rate hike",
  "inflation",
  "oil",
  "opec",
  "dollar",
  "yuan",
  "stock market",
  "nasdaq",
  "dow jones",
  "s&p",
  "recession",
  "gdp",
  "treasury",
  "debt ceiling",
  "shutdown",
];

export interface KeywordMatch {
  isRelevant: boolean;
  matched: string[];
}

export function matchKeywords(text: string, keywords: string[]): KeywordMatch {
  const lower = text.toLowerCase();
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()));
  return { isRelevant: matched.length > 0, matched };
}

export function parseKeywordList(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_MARKET_KEYWORDS;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : DEFAULT_MARKET_KEYWORDS;
}
