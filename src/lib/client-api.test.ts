import { afterEach, describe, expect, it, vi } from "vitest";

import { apiGet, apiPost } from "./client-api";

const mockFetch = (impl: (url: string, init?: RequestInit) => Response) => {
  const spy = vi.fn((url: string, init?: RequestInit) =>
    Promise.resolve(impl(url, init))
  );
  vi.stubGlobal("fetch", spy);
  return spy;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiGet", () => {
  it("prefixes the backend path and returns the parsed body", async () => {
    const spy = mockFetch(() => json({ name: "my-pool" }));

    const res = await apiGet<{ name: string }>("/pool/my-pool");

    expect(spy.mock.calls[0][0]).toBe("/api-rust/pool/my-pool");
    expect(res).toEqual({ ok: true, data: { name: "my-pool" } });
  });

  it("accepts a path without a leading slash", async () => {
    const spy = mockFetch(() => json({}));

    await apiGet("pool/my-pool");

    expect(spy.mock.calls[0][0]).toBe("/api-rust/pool/my-pool");
  });

  it("forwards the backend error body on a failed status", async () => {
    mockFetch(() => new Response("pool not found", { status: 404 }));

    expect(await apiGet("/pool/nope")).toEqual({
      ok: false,
      error: "pool not found",
    });
  });

  it("falls back to the status when the error body is empty", async () => {
    mockFetch(() => new Response("", { status: 500 }));

    const res = await apiGet("/pool/nope");

    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toContain("500");
  });

  it("reports a network failure instead of rejecting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch")))
    );

    const res = await apiGet("/pool/my-pool");

    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toMatch(/could not be reached/);
  });

  it("reports a malformed body rather than throwing a parse error", async () => {
    mockFetch(() => new Response("not json", { status: 200 }));

    const res = await apiGet("/pool/my-pool");

    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toMatch(/malformed/);
  });

  it("treats an empty successful body as no data", async () => {
    mockFetch(() => new Response("", { status: 200 }));

    expect(await apiGet("/mark-as-final")).toEqual({ ok: true, data: null });
  });
});

describe("apiPost", () => {
  it("sends the bearer token and the JSON body", async () => {
    const spy = mockFetch(() => json({ id: "1" }));

    const res = await apiPost("/create-trade", { pool_name: "p" }, "the-token");

    const init = spy.mock.calls[0][1]!;
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer the-token",
    });
    expect(init.body).toBe(JSON.stringify({ pool_name: "p" }));
    expect(res).toEqual({ ok: true, data: { id: "1" } });
  });

  // Regression guard: the call sites used to interpolate a possibly-undefined
  // token, sending the literal "Bearer undefined" to the backend.
  it.each([
    ["undefined", undefined],
    ["null", null],
    ["empty", ""],
  ])("does not call the backend when the token is %s", async (_label, jwt) => {
    const spy = mockFetch(() => json({}));

    expect(await apiPost("/create-trade", {}, jwt)).toEqual({
      ok: false,
      error: "unauthenticated",
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
