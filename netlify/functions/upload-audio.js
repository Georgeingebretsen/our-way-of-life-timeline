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

  const { recordId, section, audioBase64, contentType } = data;

  if (!recordId || !section || !audioBase64) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing fields" }) };
  }

  const ct = contentType || "audio/webm";
  const ext = ct.includes("mp4") ? "m4a" : ct.includes("ogg") ? "ogg" : "webm";
  const filename = `${section}.${ext}`;

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
        subject: `Submission ${recordId} — Audio: ${section}`,
        html: `<p>Audio recording for section <strong>${section}</strong> (Submission ${recordId}).</p>`,
        attachments: [{ filename, content: audioBase64 }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("Resend audio error:", err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Send failed", detail: err }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    console.error("Error:", e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
