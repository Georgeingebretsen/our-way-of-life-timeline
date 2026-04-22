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

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = "apptMLftTJtjWNuG6";
  const FIELD_NAME = "Creative Files";

  if (!AIRTABLE_TOKEN) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server misconfigured" }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { recordId, filename, fileBase64, contentType } = data;

  if (!recordId || !filename || !fileBase64) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing fields" }) };
  }

  try {
    const uploadUrl = `https://content.airtable.com/v0/${BASE_ID}/${recordId}/${encodeURIComponent(FIELD_NAME)}/uploadAttachment`;
    const resp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: contentType || "application/octet-stream",
        file: fileBase64,
        filename: filename,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("Airtable upload error:", err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Upload failed", detail: err }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    console.error("Error:", e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
