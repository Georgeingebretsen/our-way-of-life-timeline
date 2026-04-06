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
  const TABLE_NAME = "Submissions";

  if (!AIRTABLE_TOKEN) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server misconfigured" }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const now = new Date().toISOString();

  const fields = {
    "Submitted At": now,
    "Review Status": "Pending",
    "Language": data.language || "English",
  };

  // Basic info
  if (data.age) fields["Age"] = data.age;
  if (data.gender) fields["Gender"] = data.gender;
  if (data.ethnicity) fields["Ethnicity"] = data.ethnicity;
  if (data.languages) fields["Languages Spoken"] = data.languages;
  if (data["years-us"]) fields["Years in US"] = data["years-us"];
  if (data["years-city"]) fields["Years in City"] = data["years-city"];

  // Story sections
  if (data["early-life"]) fields["Early Life"] = data["early-life"];
  if (data["first-helping"]) fields["First Helping"] = data["first-helping"];
  if (data["influences"]) fields["Influences"] = data["influences"];
  if (data["turning-points"]) fields["Turning Points"] = data["turning-points"];
  if (data["identity-civic"]) fields["Identity and Civic"] = data["identity-civic"];
  if (data["meaningful-contributions"]) fields["Meaningful Contributions"] = data["meaningful-contributions"];
  if (data["reflections"]) fields["Reflections"] = data["reflections"];
  if (data["community-support"]) fields["Community Support"] = data["community-support"];

  try {
    const resp = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      console.error("Airtable error:", err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to save" }) };
    }

    const record = await resp.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: record.id }),
    };
  } catch (e) {
    console.error("Error:", e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
