// Writes admin-edited content overrides to Netlify Blob storage.
// Requires Authorization: Bearer <ADMIN_PASSWORD>.
// Pass ?surface=story (default) or ?surface=timeline to pick the dataset.
import { getStore } from "@netlify/blobs";

const SURFACE_STORES = {
  story: "site-content",
  timeline: "timeline-content",
};

const timingSafeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

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

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !timingSafeEqual(token, expected)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers });
  }

  // Probe: auth check only, do not write.
  if (body && body.probe === true) {
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
