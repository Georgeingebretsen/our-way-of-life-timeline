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
    ["Personal email", data.email],
    ["Age, gender, and race/ethnicity", data["age-gender-ethnicity"]],
    ["Country of origin and language spoken", data["country-language"]],
    ["Years in the US, and years in current city", data.years],
    ["Education", data.education],
    ["Do you vote in local or presidential elections?", data.voted],
    ["Do you volunteer?", data.volunteer],
    ["Do you have health conditions?", data.health],
    [
      "Based on your personal journey, create a poem, story, song, collage, drawing, photograph, and/or another creative work that captures the essence of your contributions to others.",
      data["creative-work"],
    ],
    [
      "In the past 12 months, what community contribution has been most significant for you, and what made this experience meaningful or memorable?",
      data["civic-contribution"],
    ],
    [
      "How would you describe the way individuals contributed/helped each other in the community where you grew up?",
      data["early-life"],
    ],
    [
      "Share a story of one of the first times you chose to help others or make a difference in a person's life, group, or community.",
      data["first-helping"],
    ],
    [
      "Share a story about something that happened in your life that changed how you contribute to your community or society (e.g., moving to a new place, changes in health, work, or loss).",
      data["influences"],
    ],
    [
      "Share a story about a time when aspects of your identity (e.g., age, race, ethnicity, nationality, gender, language, or health status) shaped your participation in a civic or community activity.",
      data["identity-civic"],
    ],
    ["What does civic participation mean to you?", data["civic-meaning"]],
    [
      "After thinking about how you have contributed over the years, what advice would you give people about the importance of getting involved and contributing to others outside family and work?",
      data["community-support"],
    ],
  ];

  const blocks = fields
    .filter(([, v]) => v && String(v).trim())
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
