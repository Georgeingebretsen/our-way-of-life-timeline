// Receives a story submission, formats it as HTML, and emails it via Resend.
// The client provides a `labels` map (key -> English label), so admin-edited
// or admin-added questions are reflected in the email automatically.

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO_EMAIL = "ourwayoflifearchive@gmail.com";

  if (!RESEND_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server misconfigured" }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const submissionId =
    new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) +
    "-" +
    Math.random().toString(36).slice(2, 8);

  const escape = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  // Keys we never want to render as a Q&A row (housekeeping / payload metadata).
  const SKIP_KEYS = new Set(["attachments", "labels", "language", "fieldOrder"]);

  const labels = (data.labels && typeof data.labels === "object") ? data.labels : {};
  const ordered = Array.isArray(data.fieldOrder) ? data.fieldOrder : Object.keys(data);
  const seen = new Set();

  const fields = [];
  for (const key of ordered) {
    if (SKIP_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    if (!(key in data)) continue;
    const val = data[key];
    if (val === null || val === undefined || String(val).trim() === "") continue;
    const label = labels[key] || key;
    fields.push([label, val]);
  }
  // Catch any data keys not in fieldOrder (shouldn't happen, but defensive).
  for (const key of Object.keys(data)) {
    if (SKIP_KEYS.has(key) || seen.has(key)) continue;
    const val = data[key];
    if (val === null || val === undefined || String(val).trim() === "") continue;
    fields.push([labels[key] || key, val]);
  }

  const blocks = fields
    .map(
      ([label, val]) => `
        <div style="margin-bottom:18px;">
          <div style="color:#5c3a1e;font-weight:600;font-size:14px;line-height:1.4;margin-bottom:6px;">${escape(label)}</div>
          <div style="background:#fff;border-left:3px solid #daa520;padding:10px 14px;white-space:pre-wrap;font-size:14px;line-height:1.5;">${escape(val)}</div>
        </div>`
    )
    .join("");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;color:#3d2817;">
      <h2 style="color:#5c3a1e;border-bottom:2px solid #daa520;padding-bottom:8px;">New Story Submission</h2>
      <p style="color:#7a6347;font-size:13px;">
        <strong>Submission ID:</strong> ${escape(submissionId)}<br>
        <strong>Submitted:</strong> ${new Date().toUTCString()}<br>
        <strong>Language:</strong> ${escape(data.language || "English")}
      </p>
      ${blocks}
      <p style="color:#a8987b;font-size:12px;margin-top:24px;">
        Audio recordings and any creative file are attached to this email.
      </p>
    </div>
  `;

  const attachments = Array.isArray(data.attachments)
    ? data.attachments
        .filter((a) => a && a.filename && a.content)
        .map((a) => ({ filename: a.filename, content: a.content }))
    : [];

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Our Way of Life <onboarding@resend.dev>",
        to: [TO_EMAIL],
        subject: `Submission ${submissionId}`,
        html,
        attachments,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("Resend error:", err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to send", detail: err }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: submissionId }),
    };
  } catch (e) {
    console.error("Error:", e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
