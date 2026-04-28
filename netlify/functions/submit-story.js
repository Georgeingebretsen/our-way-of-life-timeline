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

  const fields = [
    ["Email", data.email],
    ["Age, Gender & Race/Ethnicity", data["age-gender-ethnicity"]],
    ["Country & Language Spoken", data["country-language"]],
    ["Years (US/City)", data.years],
    ["Education", data.education],
    ["Vote in Local or Presidential Elections", data.voted],
    ["Do You Volunteer", data.volunteer],
    ["Health Conditions", data.health],
    ["Creative Work", data["creative-work"]],
    ["Civic Contribution (past 12 months)", data["civic-contribution"]],
    ["Early Life", data["early-life"]],
    ["First Helping", data["first-helping"]],
    ["Influences", data["influences"]],
    ["Identity & Civic Participation", data["identity-civic"]],
    ["Civic Meaning", data["civic-meaning"]],
    ["Advice for Others", data["community-support"]],
  ];

  const rows = fields
    .filter(([, v]) => v && String(v).trim())
    .map(
      ([label, val]) => `
        <tr>
          <td style="padding:10px 14px;background:#fbf6ec;border:1px solid #e8dcc4;font-weight:600;vertical-align:top;width:30%;">${escape(label)}</td>
          <td style="padding:10px 14px;background:#fff;border:1px solid #e8dcc4;white-space:pre-wrap;">${escape(val)}</td>
        </tr>`
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
      <table style="border-collapse:collapse;width:100%;font-size:14px;">${rows}</table>
      <p style="color:#a8987b;font-size:12px;margin-top:24px;">
        Audio recordings and creative files (if any) arrive as separate emails with the same submission ID.
      </p>
    </div>
  `;

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
        subject: `Submission ${submissionId} — Story Responses`,
        html,
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
