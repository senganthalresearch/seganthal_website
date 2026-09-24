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
  const financials = {
    annual: [
      { period: "FY 2026", revenue: 267021, operatingProfit: 67022, opm: 25.1, netProfit: 49210, npm: 18.4, eps: 136.01 },
      { period: "FY 2025", revenue: 255324, operatingProfit: 62293, opm: 24.4, netProfit: 48553, npm: 19.0, eps: 134.19 },
      { period: "FY 2024", revenue: 240893, operatingProfit: 59425, opm: 24.7, netProfit: 45908, npm: 19.1, eps: 125.88 },
      { period: "FY 2023", revenue: 225458, operatingProfit: 54263, opm: 24.1, netProfit: 42147, npm: 18.7, eps: 115.19 }
    ],
    quarterly: [
      { period: "Jun 2026", revenue: 72275, operatingProfit: 17317, opm: 24.0, netProfit: 13349, npm: 18.5, eps: 36.90 },
      { period: "Mar 2026", revenue: 70698, operatingProfit: 17870, opm: 25.3, netProfit: 13718, npm: 19.4, eps: 37.94 },
      { period: "Dec 2025", revenue: 67087, operatingProfit: 16926, opm: 25.2, netProfit: 10657, npm: 15.9, eps: 29.45 },
      { period: "Sep 2025", revenue: 64988, operatingProfit: 16182, opm: 24.9, netProfit: 11909, npm: 18.3, eps: 32.80 },
      { period: "Jun 2025", revenue: 63437, operatingProfit: 15514, opm: 24.5, netProfit: 12760, npm: 20.1, eps: 35.27 }
    ]
  };
  return { ...quote, sector: "Technology", industry: "Information Technology Services", description: "This is an illustrative company profile for reviewing the research workspace. Connect the live services to retrieve current company information, sourced fundamentals, and price history.", metrics, score: 78, coverage: 9, history: Array.from({ length: 240 }, (_, i) => ({ date: new Date(Date.UTC(2025, 9, 1 + i)).toISOString(), close: 2800 + i * 2 + Math.sin(i * .31) * 70 + Math.cos(i * .09) * 90, volume: 1500000 + (i % 9) * 110000 })), financials, fetchedAt: sampleTime, warnings: ["Sample data for design preview. Not actual quotes or research."] };
}
export const demoNews: NewsItem[] = [
  { title: "BHEL bags mega ₹6,100 Crore EPC order from NTPC for Supercritical Thermal Power Project", source: "Order Win Announcement", url: "https://www.nseindia.com", publishedAt: sampleTime },
  { title: "L&T Construction secures large orders valued up to ₹5,000 Cr in transmission and renewables", source: "Contract Win", url: "https://www.bseindia.com", publishedAt: sampleTime },
  { title: "Inox Wind receives 200 MW turnkey wind project order from commercial & industrial customer", source: "Corporate Action", url: "https://www.nseindia.com", publishedAt: sampleTime },
  { title: "Your market brief, in one place", source: "Market Update", url: "https://www.nseindia.com", publishedAt: sampleTime },
  { title: "Follow company results and exchange announcements", source: "Exchange Filing", url: "https://www.bseindia.com", publishedAt: sampleTime },
  { title: "Build a daily research habit with your team", source: "Senganthal Terminal", url: "https://www.nseindia.com", publishedAt: sampleTime }
];

