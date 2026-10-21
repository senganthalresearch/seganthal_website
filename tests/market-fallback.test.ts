import assert from "node:assert/strict";
import test from "node:test";
import { analyze, history, search, yahooHealthCheck } from "../lib/market";
import { canUseNse, parseNseQuote, parseNseSearch } from "../lib/nse-market";

const equity = (symbol = "OUTAGECHECK") => ({ equityResponse: [{
  orderBook: { lastPrice: 267.7 }, metaData: { symbol, series: "EQ", companyName: "Test Company", change: 11.8, pChange: 4.61 },
  lastUpdateTime: "05-Oct-2026 14:40:44"
}] });

test("NSE quotes preserve exchange time and reject missing prices and mismatched symbols", () => {
  const quote = parseNseQuote(equity(), "OUTAGECHECK.NS");
  assert.equal(quote.asOf, "2026-10-05T09:10:44.000Z");
  assert.equal(quote.price, 267.7);
  assert.equal(quote.source, "NSE");
  assert.throws(() => parseNseQuote(equity("OTHER"), "OUTAGECHECK"));
  assert.throws(() => parseNseQuote({ equityResponse: [{ ...equity().equityResponse[0], orderBook: {} }] }, "OUTAGECHECK"));
  assert.equal(canUseNse("500325.BO"), false);
  assert.equal(canUseNse("^NSEI"), false);
});

test("NSE search ignores zero price placeholders, removes duplicate series, and preserves no matches", () => {
  const row = { symbol: "ITC", companyName: "ITC Limited", series: "EQ", lastPrice: 0 };
  assert.deepEqual(parseNseSearch({ data: [row, row, { ...row, symbol: "OTHER", series: "BE" }] }), [{ symbol: "ITC", name: "ITC Limited", exchange: "NSE" }]);
  assert.deepEqual(parseNseSearch({ data: [] }), []);
});

test("search and analysis stay usable when Yahoo is rate limited; missing fundamentals stay null", async t => {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname.endsWith("yahoo.com")) return new Response("Rate limited", { status: 429 });
    if (url.pathname.includes("globalSearch")) return Response.json({ data: [{ symbol: "OUTAGECHECK", companyName: "Test Company", series: "EQ" }] });
    if (url.pathname.includes("GetQuoteApi")) return Response.json(equity());
    if (url.pathname.includes("corporate-share-holdings-master")) return Response.json([]);
    throw new Error("Unexpected provider request: " + url.pathname);
  });
  assert.equal((await search("outagecheck"))[0].symbol, "OUTAGECHECK");
  const stock = await analyze("OUTAGECHECK");
  assert.equal(stock.source, "NSE");
  assert.equal(stock.price, 267.7);
  assert.equal(stock.score, null);
  assert.ok(stock.metrics.every(metric => metric.value === null));
  assert.deepEqual(stock.history, []);
  assert.ok(stock.warnings.some(warning => warning.includes("quote comes from NSE")));
  await assert.rejects(yahooHealthCheck());
});

test("index history falls back to NSE daily prices when Yahoo rejects the request", async t => {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname.endsWith("yahoo.com")) return new Response("Unavailable", { status: 429 });
    if (url.pathname.includes("indicesHistory")) return Response.json({ data: [
      { EOD_TIMESTAMP: "19-Oct-2026", EOD_OPEN_INDEX_VAL: "22,990", EOD_HIGH_INDEX_VAL: "23,020", EOD_LOW_INDEX_VAL: "22,830", EOD_CLOSE_INDEX_VAL: "22,888.95" },
      { EOD_TIMESTAMP: "20-Oct-2026", EOD_OPEN_INDEX_VAL: "22,890", EOD_HIGH_INDEX_VAL: "23,010", EOD_LOW_INDEX_VAL: "22,810", EOD_CLOSE_INDEX_VAL: "22,970.15" }
    ] });
    throw new Error("Unexpected provider request: " + url.pathname);
  });
  const rows = await history("^CNXIT");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].close, 22888.95);
  assert.equal(rows[0].high, 23020);
  assert.equal(rows[1].open, 22890);
});
