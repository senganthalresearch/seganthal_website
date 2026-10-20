import assert from "node:assert/strict";
import test from "node:test";
import { createRequestCache } from "../lib/request-cache";
import { fetchUpstream, upstreamJson, UpstreamError, serviceFailure } from "../lib/upstream";

test("simultaneous reads share one provider request and failed reads can recover", async () => {
  const cached = createRequestCache();
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const fetcher = async () => { calls++; await gate; throw new Error("temporary outage"); };
  const results = Promise.allSettled([cached("ITC", fetcher), cached("ITC", fetcher)]);
  release();
  assert.ok((await results).every(result => result.status === "rejected"));
  assert.equal(calls, 1);
  assert.equal(await cached("ITC", async () => { calls++; return 42; }), 42);
  assert.equal(await cached("ITC", async () => { calls++; return 99; }), 42);
  assert.equal(calls, 2);
});

test("expired values are refreshed instead of serving stale financial data", async () => {
  const cached = createRequestCache();
  await cached("quote", async () => 10, -1);
  assert.equal(await cached("quote", async () => 20), 20);
});

test("temporary HTTP and network failures recover with one safe retry", async t => {
  for (const failure of [new Response("Unavailable", { status: 503 }), new TypeError("fetch failed")]) {
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => {
      calls++;
      if (calls === 1) { if (failure instanceof Error) throw failure; return failure; }
      return Response.json({ ok: true });
    });
    assert.deepEqual(await upstreamJson("NSE", "https://example.test/data"), { ok: true });
    assert.equal(calls, 2);
    t.mock.restoreAll();
  }
});

test("provider rate limits, access denials and writes are not retried", async t => {
  for (const status of [429, 403]) {
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => { calls++; return new Response("denied", { status }); });
    await assert.rejects(upstreamJson("NSE", "https://example.test/data"), error => error instanceof UpstreamError && error.upstreamStatus === status);
    assert.equal(calls, 1);
    t.mock.restoreAll();
  }
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return new Response("Unavailable", { status: 503 }); });
  await assert.rejects(fetchUpstream("Yahoo Finance", "https://example.test/consent", { method: "POST" }));
  assert.equal(calls, 1);
});

test("timeouts release requests and use a fresh deadline on the next attempt", async t => {
  const signals: AbortSignal[] = [];
  t.mock.method(globalThis, "fetch", async (_input: unknown, init: RequestInit) => {
    const signal = init.signal!;
    signals.push(signal);
    return new Promise<Response>((_resolve, reject) => {
      const keepAlive = setTimeout(() => reject(new Error("deadline missing")), 1000);
      signal.addEventListener("abort", () => { clearTimeout(keepAlive); reject(signal.reason); }, { once: true });
    });
  });
  await assert.rejects(fetchUpstream("Yahoo Finance", "https://example.test/data", {}, 5), error => error instanceof UpstreamError && error.reason === "timeout");
  assert.equal(signals.length, 2);
  assert.notEqual(signals[0], signals[1]);
});

test("caller cancellation stops retries and Yahoo redirects remain intact", async t => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return new Response(null, { status: 302, headers: { location: "https://example.test/consent" } }); });
  await assert.rejects(fetchUpstream("Yahoo Finance", "https://example.test/data", { signal: controller.signal }));
  assert.equal(calls, 0);
  assert.equal((await fetchUpstream("Yahoo Finance", "https://example.test/data")).status, 302);
});

test("malformed provider responses are identified without leaking their contents", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html>private token</html>"));
  await assert.rejects(upstreamJson("NSE", "https://example.test/data"), error => error instanceof UpstreamError && error.reason === "invalid_response");
  const databaseError = new Error("mongodb://username:secret@host/private");
  databaseError.name = "MongoServerSelectionError";
  assert.equal(serviceFailure(databaseError).service, "MongoDB");
  assert.ok(!JSON.stringify(serviceFailure(databaseError)).includes("secret"));
  assert.ok(!JSON.stringify(serviceFailure(new Error("private token"))).includes("private token"));
  assert.equal(serviceFailure(new UpstreamError("NSE", "http", 429)).upstreamStatus, 429);
});
