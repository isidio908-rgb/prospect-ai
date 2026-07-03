import { extractSignals } from "./extractors.mjs";

export async function auditWebsite(url, options = {}) {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 15000;

  if (!url) {
    return {
      ok: false,
      status: 0,
      finalUrl: "",
      loadMs: 0,
      sizeKb: 0,
      error: "Lead sem site informado",
      signals: extractSignals("", ""),
    };
  }

  try {
    const response = await fetchWithTimeout(url, timeoutMs);
    const html = await response.text();
    const finalUrl = response.url || url;
    const loadMs = Date.now() - startedAt;

    return {
      ok: response.ok,
      status: response.status,
      finalUrl,
      loadMs,
      sizeKb: Math.round(Buffer.byteLength(html, "utf8") / 1024),
      error: response.ok ? "" : `HTTP ${response.status}`,
      signals: extractSignals(html, finalUrl),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      loadMs: Date.now() - startedAt,
      sizeKb: 0,
      error: error.message,
      signals: extractSignals("", url),
    };
  }
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "ProspectAI/0.1 (+internal lead qualification)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}
