// Returns admin-edited content overrides from Netlify Blob storage.
// Public endpoint. Pass ?surface=story (default) or ?surface=timeline to pick the dataset.
import { getStore } from "@netlify/blobs";

const SURFACE_KEYS = {
  story: { blobKey: "overrides", store: "site-content", empty: { i18n: {}, questions: null } },
  timeline: { blobKey: "overrides", store: "timeline-content", empty: { elements: {}, events: null } },
};

export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, must-revalidate",
  };
  const url = new URL(req.url);
  const surface = url.searchParams.get("surface") || "story";
  const cfg = SURFACE_KEYS[surface];
  if (!cfg) {
    return new Response(JSON.stringify({ error: "Unknown surface" }), { status: 400, headers });
  }

  try {
    const store = getStore(cfg.store);
    const raw = await store.get(cfg.blobKey);
    const overrides = raw ? JSON.parse(raw) : cfg.empty;
    return new Response(JSON.stringify(overrides), { status: 200, headers });
  } catch (e) {
    console.error("get-content error:", e);
    return new Response(JSON.stringify(cfg.empty), { status: 200, headers });
  }
};

export const config = { path: "/.netlify/functions/get-content" };
