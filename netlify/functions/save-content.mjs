// Writes admin-edited content overrides to Netlify Blob storage.
// Requires Authorization: Bearer <ADMIN_PASSWORD>.
// Pass ?surface=story (default) or ?surface=timeline to pick the dataset.
//
// Security additions:
// - Per-IP rate limit on failed auth attempts (5 per rolling 60s).
// - Email notification to ourwayoflifearchive@gmail.com on every successful
//   login (i.e. an authenticated probe call). Lets the admin notice
//   suspicious sign-ins without an audit dashboard.
import { getStore } from "@netlify/blobs";

const SURFACE_STORES = {
  story: "site-content",
  timeline: "timeline-content",
};

const RATE_LIMIT_STORE = "rate-limit";
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const NOTIFY_EMAIL = "ourwayoflifearchive@gmail.com";

const timingSafeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const safeKey = (s) => String(s).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);

async function readRateLimit(ip) {
  const store = getStore({ name: RATE_LIMIT_STORE, consistency: "strong" });
  const raw = await store.get(`failed/${safeKey(ip)}`);
  if (!raw) return { count: 0, windowEnd: 0 };
  try { return JSON.parse(raw); } catch { return { count: 0, windowEnd: 0 }; }
}

async function bumpRateLimit(ip, current) {
  const store = getStore({ name: RATE_LIMIT_STORE, consistency: "strong" });
  const now = Date.now();
  const entry = (now > current.windowEnd)
    ? { count: 1, windowEnd: now + RATE_LIMIT_WINDOW_MS }
    : { count: current.count + 1, windowEnd: current.windowEnd };
  await store.set(`failed/${safeKey(ip)}`, JSON.stringify(entry));
  return entry;
}

async function clearRateLimit(ip) {
  try {
    const store = getStore({ name: RATE_LIMIT_STORE, consistency: "strong" });
    await store.delete(`failed/${safeKey(ip)}`);
  } catch (_) { /* best-effort */ }
}

async function sendLoginNotification({ ip, userAgent, surface, host }) {
  if (!process.env.RESEND_API_KEY) return;
  const escape = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const siteLabel = host || "the admin editor";
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;color:#3d2817;">
      <h2 style="color:#5c3a1e;border-bottom:2px solid #daa520;padding-bottom:8px;">Admin login</h2>
      <p>Someone signed in to <strong>${escape(siteLabel)}</strong>.</p>
      <ul style="color:#5c3a1e;font-size:14px;line-height:1.7;">
        <li><strong>When:</strong> ${escape(new Date().toUTCString())}</li>
        <li><strong>From IP:</strong> ${escape(ip)}</li>
        <li><strong>Surface:</strong> ${escape(surface)}</li>
        <li><strong>User-Agent:</strong> ${escape(userAgent)}</li>
      </ul>
      <p style="color:#a83333;font-size:13px;margin-top:18px;">
        If this wasn't you, rotate the <code>ADMIN_PASSWORD</code> environment
        variable on Netlify immediately.
      </p>
    </div>
  `;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Our Way of Life Admin <onboarding@resend.dev>",
        to: [NOTIFY_EMAIL],
        subject: "Admin sign-in",
        html,
      }),
    });
  } catch (e) {
    console.error("login notification failed:", e);
  }
}

export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response("", { status: 200, headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const url = new URL(req.url);
  const surface = url.searchParams.get("surface") || "story";
  const storeName = SURFACE_STORES[surface];
  if (!storeName) {
    return new Response(JSON.stringify({ error: "Unknown surface" }), { status: 400, headers });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return new Response(JSON.stringify({ error: "ADMIN_PASSWORD not configured" }), { status: 500, headers });
  }

  const ip = req.headers.get("x-nf-client-connection-ip")
          || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
          || "unknown";
  const userAgent = req.headers.get("user-agent") || "";
  const host = req.headers.get("host") || "";

  // ── Rate limit (failed attempts only) ───────────────────
  const rl = await readRateLimit(ip);
  const now = Date.now();
  if (now <= rl.windowEnd && rl.count >= RATE_LIMIT_MAX) {
    return new Response(
      JSON.stringify({ error: "Too many failed attempts. Try again in a minute." }),
      { status: 429, headers }
    );
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !timingSafeEqual(token, expected)) {
    await bumpRateLimit(ip, rl);
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
  }

  // Auth succeeded — clear any prior failure counter.
  await clearRateLimit(ip);

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers });
  }

  // Probe: a successful probe = a successful login. Notify and exit without writing.
  if (body && body.probe === true) {
    await sendLoginNotification({ ip, userAgent, surface, host });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  try {
    const store = getStore(storeName);
    await store.set("overrides", JSON.stringify(body));
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (e) {
    console.error("save-content error:", e);
    return new Response(
      JSON.stringify({ error: "Save failed", detail: String(e && e.message || e) }),
      { status: 500, headers }
    );
  }
};

export const config = { path: "/.netlify/functions/save-content" };
