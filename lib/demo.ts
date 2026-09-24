import type { Quote, Stock, Metric, NewsItem, WatchItem } from "./types";
const sampleTime = "2026-09-21T10:00:00Z";
export const demoQuotes: Quote[] = [
  { symbol: "^NSEI", name: "NIFTY 50", price: 25415.25, change: 142.8, changePercent: 0.57, currency: "INR", asOf: sampleTime },
  { symbol: "^BSESN", name: "SENSEX", price: 83184.8, change: 418.5, changePercent: 0.51, currency: "INR", asOf: sampleTime },
  { symbol: "^NSEBANK", name: "NIFTY BANK", price: 56830.4, change: -86.2, changePercent: -0.15, currency: "INR", asOf: sampleTime },
  { symbol: "^CNXIT", name: "NIFTY IT", price: 37102.65, change: 312.75, changePercent: 0.85, currency: "INR", asOf: sampleTime }
];
export const demoWatchlist: WatchItem[] = [{ symbol: "TCS", name: "Tata Consultancy Services", group: "Core portfolio" }, { symbol: "RELIANCE", name: "Reliance Industries", group: "Core portfolio" }, { symbol: "HDFCBANK", name: "HDFC Bank", group: "Banking" }, { symbol: "INFY", name: "Infosys", group: "Technology" }];
export const demoBasket: Quote[] = [
  ["TCS", "Tata Consultancy Services", 3284.6, 1.42], ["RELIANCE", "Reliance Industries", 1462.8, 0.76],
  ["HDFCBANK", "HDFC Bank", 972.4, -0.48], ["INFY", "Infosys", 1587.25, 2.16],
  ["ITC", "ITC Limited", 418.35, -0.65], ["SUNPHARMA", "Sun Pharmaceutical", 1692.8, 1.87]
].map(([symbol, name, price, changePercent]) => ({ symbol: String(symbol), name: String(name), price: Number(price), changePercent: Number(changePercent), change: Number(price) * Number(changePercent) / 100, currency: "INR", asOf: sampleTime }));
export function demoStock(symbol = "TCS"): Stock {
  const quote = demoBasket.find(q => q.symbol === symbol) || { ...demoBasket[0], symbol, name: symbol };
  const data: [string, string, number, string, boolean?][] = [
    ["pe", "P/E ratio", 24.8, "×", true], ["pb", "Price / book", 10.2, "×", false], ["yield", "Dividend yield", 3.09, "%"],
    ["roe", "Return on equity", 45.9, "%", true], ["de", "Debt / equity", 0.08, "×", true], ["opm", "Operating margin", 25.1, "%", true],
    ["npm", "Net profit margin", 18.4, "%", true], ["revenueGrowth", "Revenue growth (YoY)", 6.2, "%", false], ["fcf", "Free cash flow", 479480000000, "₹", true],
    ["marketCap", "Market capitalisation", 11900000000000, "₹"], ["currentRatio", "Current ratio", 2.23, "×", true], ["graham", "Graham number", 969, "₹"]
  ];
  const metrics: Metric[] = data.map(([key, label, value, unit, good]) => ({ key, label, value, unit, good, source: "Illustrative sample · not market data" }));
  return { ...quote, sector: "Technology", industry: "Information Technology Services", description: "This is an illustrative company profile for reviewing the research workspace. Connect the live services to retrieve current company information, sourced fundamentals, and price history.", metrics, score: 78, coverage: 9, history: Array.from({ length: 240 }, (_, i) => ({ date: new Date(Date.UTC(2025, 9, 1 + i)).toISOString(), close: 2800 + i * 2 + Math.sin(i * .31) * 70 + Math.cos(i * .09) * 90, volume: 1500000 + (i % 9) * 110000 })), fetchedAt: sampleTime, warnings: ["Sample data for design preview. Not actual quotes or research."] };
}
export const demoNews: NewsItem[] = [
  { title: "Your market brief, in one place", source: "Sample news card", url: "https://www.nseindia.com", publishedAt: sampleTime },
  { title: "Follow company results and exchange announcements", source: "Sample news card", url: "https://www.bseindia.com", publishedAt: sampleTime },
  { title: "Build a daily research habit with your team", source: "Sample news card", url: "https://www.nseindia.com", publishedAt: sampleTime }
];

